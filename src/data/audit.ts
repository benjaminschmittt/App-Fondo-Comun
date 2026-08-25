import "server-only";
import { prisma } from "@/lib/prisma";
import { requireAdmin } from "./auth";

// Deja un rastro en audit_log para una accion admin. No lanza si falla el
// insert (la accion principal no debe romperse porque fallo auditar) —
// pero si loguea el error para que no quede en silencio absoluto.
export async function registrarAuditoria(entry: {
  actorId: string;
  actorEmail: string;
  accion: string;
  entidad?: string;
  entidadId?: string;
  detalle?: unknown;
}) {
  try {
    await prisma.auditLog.create({
      data: {
        actorId: entry.actorId,
        actorEmail: entry.actorEmail,
        accion: entry.accion,
        entidad: entry.entidad,
        entidadId: entry.entidadId,
        detalle: entry.detalle == null ? undefined : (entry.detalle as object),
      },
    });
  } catch (error) {
    console.error("No se pudo registrar auditoria:", error);
  }
}

// Historial de auditoria para el panel admin (Fase 3, Etapa 4). Solo
// lectura — la tabla nunca se edita ni se borra desde la app.
export async function listarAuditoria(filtros: {
  accion?: string;
  actorEmail?: string;
  desde?: Date;
  hasta?: Date;
} = {}) {
  await requireAdmin();

  return prisma.auditLog.findMany({
    where: {
      accion: filtros.accion || undefined,
      actorEmail: filtros.actorEmail ? { contains: filtros.actorEmail, mode: "insensitive" } : undefined,
      creadoEn: filtros.desde || filtros.hasta ? { gte: filtros.desde, lte: filtros.hasta } : undefined,
    },
    orderBy: { creadoEn: "desc" },
    take: 100,
  });
}

// Lista de acciones distintas ya registradas, para poblar el filtro sin
// hardcodear el catalogo de acciones posibles en la UI.
export async function listarAccionesAuditadas(): Promise<string[]> {
  await requireAdmin();
  const rows = await prisma.auditLog.findMany({
    select: { accion: true },
    distinct: ["accion"],
    orderBy: { accion: "asc" },
  });
  return rows.map((r) => r.accion);
}
