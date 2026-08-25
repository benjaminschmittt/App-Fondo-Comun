import "server-only";
import { z } from "zod";
import { prisma } from "@/lib/prisma";
import { requireAdmin } from "./auth";
import { registrarAuditoria } from "./audit";
import { movimientoAfectaComisionAplicada } from "./comisiones";

export type SimpleResult = { ok: true } | { ok: false; error: string };

export async function listarMovimientos(fundId: string) {
  await requireAdmin();
  return prisma.clientMovement.findMany({
    where: { fundId },
    include: { client: { select: { id: true, nombre: true, clienteId: true } } },
    orderBy: { fecha: "desc" },
  });
}

const MovimientoInput = z.object({
  clientId: z.string({ error: "Elegí un cliente." }).uuid({ error: "Cliente inválido." }),
  fecha: z.coerce.date({ error: "La fecha no es válida." }),
  tipo: z.enum(["aporte", "retiro"], { error: 'Debe ser "aporte" o "retiro".' }),
  monto: z.coerce.number({ error: "El monto debe ser un número." }).positive({ error: "El monto debe ser mayor a 0." }),
});

export async function crearMovimiento(fundId: string, input: unknown): Promise<SimpleResult> {
  const admin = await requireAdmin();
  const parsed = MovimientoInput.safeParse(input);
  if (!parsed.success) {
    return { ok: false, error: parsed.error.issues[0]?.message ?? "Datos inválidos." };
  }
  const { clientId, fecha, tipo, monto } = parsed.data;

  const cliente = await prisma.client.findUnique({ where: { id: clientId } });
  if (!cliente) return { ok: false, error: "El cliente no existe." };

  const movimiento = await prisma.$transaction(async (tx) => {
    await tx.clientFund.upsert({
      where: { clientId_fundId: { clientId, fundId } },
      create: { clientId, fundId },
      update: {},
    });
    return tx.clientMovement.create({ data: { clientId, fundId, fecha, tipo, monto } });
  });

  await registrarAuditoria({
    actorId: admin.id,
    actorEmail: admin.email ?? "",
    accion: "crear_movimiento",
    entidad: "client_movement",
    entidadId: movimiento.id,
    detalle: { clienteId: cliente.clienteId, fundId, fecha, tipo, monto },
  });
  return { ok: true };
}

export async function editarMovimiento(id: string, input: unknown): Promise<SimpleResult> {
  const admin = await requireAdmin();
  const parsed = MovimientoInput.omit({ clientId: true }).safeParse(input);
  if (!parsed.success) {
    return { ok: false, error: parsed.error.issues[0]?.message ?? "Datos inválidos." };
  }

  const antes = await prisma.clientMovement.findUnique({ where: { id } });
  if (!antes) return { ok: false, error: "El movimiento no existe." };

  if (await movimientoAfectaComisionAplicada(antes.clientId, antes.fundId, antes.fecha)) {
    return {
      ok: false,
      error: "Este movimiento ya fue usado en un cobro de comisión aplicado y no se puede editar.",
    };
  }

  const { fecha, tipo, monto } = parsed.data;
  await prisma.clientMovement.update({ where: { id }, data: { fecha, tipo, monto } });

  await registrarAuditoria({
    actorId: admin.id,
    actorEmail: admin.email ?? "",
    accion: "editar_movimiento",
    entidad: "client_movement",
    entidadId: id,
    detalle: {
      antes: { fecha: antes.fecha, tipo: antes.tipo, monto: antes.monto.toNumber() },
      despues: { fecha, tipo, monto },
    },
  });
  return { ok: true };
}

export async function eliminarMovimiento(id: string): Promise<SimpleResult> {
  const admin = await requireAdmin();

  const movimiento = await prisma.clientMovement.findUnique({ where: { id } });
  if (!movimiento) return { ok: false, error: "El movimiento no existe." };

  if (await movimientoAfectaComisionAplicada(movimiento.clientId, movimiento.fundId, movimiento.fecha)) {
    return {
      ok: false,
      error: "Este movimiento ya fue usado en un cobro de comisión aplicado y no se puede eliminar.",
    };
  }

  await prisma.clientMovement.delete({ where: { id } });

  await registrarAuditoria({
    actorId: admin.id,
    actorEmail: admin.email ?? "",
    accion: "eliminar_movimiento",
    entidad: "client_movement",
    entidadId: id,
    detalle: {
      clientId: movimiento.clientId,
      fundId: movimiento.fundId,
      fecha: movimiento.fecha,
      tipo: movimiento.tipo,
      monto: movimiento.monto.toNumber(),
    },
  });
  return { ok: true };
}
