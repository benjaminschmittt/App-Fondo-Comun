import "server-only";
import { prisma } from "@/lib/prisma";

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
