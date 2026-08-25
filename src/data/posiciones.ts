import "server-only";
import { z } from "zod";
import { updateTag } from "next/cache";
import { prisma } from "@/lib/prisma";
import { requireAdmin } from "./auth";
import { registrarAuditoria } from "./audit";
import { FONDO_DATA_TAG } from "./fondo";

export type SimpleResult = { ok: true } | { ok: false; error: string };

export async function listarPosiciones(fundId: string) {
  await requireAdmin();
  return prisma.position.findMany({ where: { fundId }, orderBy: [{ fecha: "desc" }, { valorMercado: "desc" }] });
}

const PosicionInput = z.object({
  fecha: z.coerce.date({ error: "La fecha no es válida." }),
  ticker: z.string({ error: "El ticker es obligatorio." }).trim().min(1, { error: "El ticker es obligatorio." }),
  nombre: z.string({ error: "El nombre es obligatorio." }).trim().min(1, { error: "El nombre es obligatorio." }),
  tipoInstrumento: z.string({ error: "El tipo de instrumento es obligatorio." }).trim().min(1, { error: "El tipo de instrumento es obligatorio." }),
  sector: z.string({ error: "El sector es obligatorio." }).trim().min(1, { error: "El sector es obligatorio." }),
  cantidad: z.coerce.number({ error: "La cantidad debe ser un número." }).positive({ error: "La cantidad debe ser mayor a 0." }),
  precio: z.coerce.number({ error: "El precio debe ser un número." }).nonnegative({ error: "El precio no puede ser negativo." }),
});

// valorMercado se recalcula siempre en servidor (cantidad * precio, mismo
// criterio que src/lib/excel/validate.ts) — nunca se acepta del formulario.
export async function crearPosicion(fundId: string, input: unknown): Promise<SimpleResult> {
  const admin = await requireAdmin();
  const parsed = PosicionInput.safeParse(input);
  if (!parsed.success) {
    return { ok: false, error: parsed.error.issues[0]?.message ?? "Datos inválidos." };
  }
  const { fecha, ticker, nombre, tipoInstrumento, sector, cantidad, precio } = parsed.data;
  const valorMercado = cantidad * precio;

  try {
    const posicion = await prisma.position.create({
      data: { fundId, fecha, ticker, nombre, tipoInstrumento, sector, cantidad, precio, valorMercado },
    });
    updateTag(FONDO_DATA_TAG);
    await registrarAuditoria({
      actorId: admin.id,
      actorEmail: admin.email ?? "",
      accion: "crear_posicion",
      entidad: "position",
      entidadId: posicion.id,
      detalle: { fundId, fecha, ticker, cantidad, precio, valorMercado },
    });
    return { ok: true };
  } catch {
    return { ok: false, error: "Ya existe una posición con ese ticker para esa fecha en este fondo." };
  }
}

export async function editarPosicion(id: string, input: unknown): Promise<SimpleResult> {
  const admin = await requireAdmin();
  const parsed = PosicionInput.safeParse(input);
  if (!parsed.success) {
    return { ok: false, error: parsed.error.issues[0]?.message ?? "Datos inválidos." };
  }

  const antes = await prisma.position.findUnique({ where: { id } });
  if (!antes) return { ok: false, error: "La posición no existe." };

  const { fecha, ticker, nombre, tipoInstrumento, sector, cantidad, precio } = parsed.data;
  const valorMercado = cantidad * precio;

  try {
    await prisma.position.update({
      where: { id },
      data: { fecha, ticker, nombre, tipoInstrumento, sector, cantidad, precio, valorMercado },
    });
    updateTag(FONDO_DATA_TAG);
    await registrarAuditoria({
      actorId: admin.id,
      actorEmail: admin.email ?? "",
      accion: "editar_posicion",
      entidad: "position",
      entidadId: id,
      detalle: {
        antes: { ticker: antes.ticker, cantidad: antes.cantidad.toNumber(), precio: antes.precio.toNumber() },
        despues: { ticker, cantidad, precio, valorMercado },
      },
    });
    return { ok: true };
  } catch {
    return { ok: false, error: "Ya existe otra posición con ese ticker para esa fecha en este fondo." };
  }
}

export async function eliminarPosicion(id: string): Promise<SimpleResult> {
  const admin = await requireAdmin();

  const posicion = await prisma.position.findUnique({ where: { id } });
  if (!posicion) return { ok: false, error: "La posición no existe." };

  await prisma.position.delete({ where: { id } });
  updateTag(FONDO_DATA_TAG);

  await registrarAuditoria({
    actorId: admin.id,
    actorEmail: admin.email ?? "",
    accion: "eliminar_posicion",
    entidad: "position",
    entidadId: id,
    detalle: {
      fundId: posicion.fundId,
      fecha: posicion.fecha,
      ticker: posicion.ticker,
      cantidad: posicion.cantidad.toNumber(),
      precio: posicion.precio.toNumber(),
    },
  });
  return { ok: true };
}
