import "server-only";
import { z } from "zod";
import { updateTag } from "next/cache";
import { prisma } from "@/lib/prisma";
import { requireAdmin } from "./auth";
import { registrarAuditoria } from "./audit";
import { FONDO_DATA_TAG } from "./fondo";
import { fechaNavAfectaComisionAplicada } from "./comisiones";

export type SimpleResult = { ok: true } | { ok: false; error: string };

export type Valuacion = {
  fecha: Date;
  valorCuotaparte: number | null;
  valorTotalFondo: number | null;
  cuotapartesTotales: number | null;
};

// FundNav y FundSnapshot no tienen relacion directa entre si (misma clave
// unica [fundId, fecha] cada una) — se juntan en memoria para mostrarlas
// como una sola fila por fecha en la pantalla.
export async function listarValuaciones(fundId: string): Promise<Valuacion[]> {
  await requireAdmin();
  const [navRows, snapshots] = await Promise.all([
    prisma.fundNav.findMany({ where: { fundId } }),
    prisma.fundSnapshot.findMany({ where: { fundId } }),
  ]);

  const porFecha = new Map<string, Valuacion>();
  for (const n of navRows) {
    const key = n.fecha.toISOString();
    porFecha.set(key, {
      fecha: n.fecha,
      valorCuotaparte: n.valorCuotaparte.toNumber(),
      valorTotalFondo: null,
      cuotapartesTotales: null,
    });
  }
  for (const s of snapshots) {
    const key = s.fecha.toISOString();
    const existente = porFecha.get(key);
    porFecha.set(key, {
      fecha: s.fecha,
      valorCuotaparte: existente?.valorCuotaparte ?? null,
      valorTotalFondo: s.valorTotalFondo.toNumber(),
      cuotapartesTotales: s.cuotapartesTotales.toNumber(),
    });
  }

  return [...porFecha.values()].sort((a, b) => b.fecha.getTime() - a.fecha.getTime());
}

const ValuacionInput = z.object({
  fecha: z.coerce.date({ error: "La fecha no es válida." }),
  valorCuotaparte: z.coerce.number({ error: "Debe ser un número." }).positive({ error: "Debe ser mayor a 0." }),
  valorTotalFondo: z.coerce.number({ error: "Debe ser un número." }).positive({ error: "Debe ser mayor a 0." }),
  cuotapartesTotales: z.coerce.number({ error: "Debe ser un número." }).positive({ error: "Debe ser mayor a 0." }),
});

// Upsert de ambas tablas juntas — cubre alta y edición con la misma
// función (mismo criterio que usa el importador de Excel).
export async function guardarValuacion(fundId: string, input: unknown): Promise<SimpleResult> {
  const admin = await requireAdmin();
  const parsed = ValuacionInput.safeParse(input);
  if (!parsed.success) {
    return { ok: false, error: parsed.error.issues[0]?.message ?? "Datos inválidos." };
  }
  const { fecha, valorCuotaparte, valorTotalFondo, cuotapartesTotales } = parsed.data;

  const navExistente = await prisma.fundNav.findUnique({ where: { fundId_fecha: { fundId, fecha } } });
  if (navExistente && (await fechaNavAfectaComisionAplicada(fundId, fecha))) {
    return {
      ok: false,
      error: "Esta fecha ya fue usada en un cobro de comisión aplicado y no se puede editar.",
    };
  }

  await prisma.$transaction([
    prisma.fundNav.upsert({
      where: { fundId_fecha: { fundId, fecha } },
      create: { fundId, fecha, valorCuotaparte },
      update: { valorCuotaparte },
    }),
    prisma.fundSnapshot.upsert({
      where: { fundId_fecha: { fundId, fecha } },
      create: { fundId, fecha, valorTotalFondo, cuotapartesTotales },
      update: { valorTotalFondo, cuotapartesTotales },
    }),
  ]);
  updateTag(FONDO_DATA_TAG);

  await registrarAuditoria({
    actorId: admin.id,
    actorEmail: admin.email ?? "",
    accion: navExistente ? "editar_valuacion" : "crear_valuacion",
    entidad: "fund_nav",
    detalle: { fundId, fecha, valorCuotaparte, valorTotalFondo, cuotapartesTotales },
  });
  return { ok: true };
}

export async function eliminarValuacion(fundId: string, fecha: Date): Promise<SimpleResult> {
  const admin = await requireAdmin();

  if (await fechaNavAfectaComisionAplicada(fundId, fecha)) {
    return {
      ok: false,
      error: "Esta fecha ya fue usada en un cobro de comisión aplicado y no se puede eliminar.",
    };
  }

  await prisma.$transaction([
    prisma.fundNav.deleteMany({ where: { fundId, fecha } }),
    prisma.fundSnapshot.deleteMany({ where: { fundId, fecha } }),
  ]);
  updateTag(FONDO_DATA_TAG);

  await registrarAuditoria({
    actorId: admin.id,
    actorEmail: admin.email ?? "",
    accion: "eliminar_valuacion",
    entidad: "fund_nav",
    detalle: { fundId, fecha },
  });
  return { ok: true };
}
