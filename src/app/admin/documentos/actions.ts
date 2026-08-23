"use server";

import { randomUUID } from "crypto";
import { revalidatePath } from "next/cache";
import { requireAdmin } from "@/data/auth";
import { getDefaultFundId } from "@/data/fondo";
import { crearUrlDescarga, FUND_DOCUMENTS_BUCKET, PDF_MAX_BYTES } from "@/data/documentos";
import { createAdminClient } from "@/lib/supabase/admin";
import { registrarAuditoria } from "@/data/audit";
import { prisma } from "@/lib/prisma";

export type ActionResult = { ok: true } | { ok: false; error: string };

export async function subirDocumento(
  _prevState: ActionResult | undefined,
  formData: FormData
): Promise<ActionResult> {
  const user = await requireAdmin();

  const nombre = String(formData.get("nombre") ?? "").trim();
  const file = formData.get("archivo");

  if (!nombre) {
    return { ok: false, error: "Ingresá un nombre para el documento." };
  }
  if (!(file instanceof File) || file.size === 0) {
    return { ok: false, error: "Seleccioná un archivo PDF." };
  }
  if (file.type !== "application/pdf") {
    return { ok: false, error: "Solo se aceptan archivos PDF." };
  }
  if (file.size > PDF_MAX_BYTES) {
    return { ok: false, error: "El archivo supera el límite de 15MB." };
  }

  const fundId = await getDefaultFundId();
  const storagePath = `${fundId}/${randomUUID()}-${file.name.replace(/[^\w.\- ]/g, "_")}`;
  const buffer = Buffer.from(await file.arrayBuffer());

  const admin = createAdminClient();
  const { error: uploadError } = await admin.storage
    .from(FUND_DOCUMENTS_BUCKET)
    .upload(storagePath, buffer, { contentType: file.type });

  if (uploadError) {
    return { ok: false, error: `No se pudo subir el archivo: ${uploadError.message}` };
  }

  await prisma.fundDocument.create({
    data: {
      fundId,
      nombre,
      storagePath,
      tamanioBytes: file.size,
      contentType: file.type,
      subidoPorId: user.id,
      subidoPorEmail: user.email ?? "",
    },
  });

  await registrarAuditoria({
    actorId: user.id,
    actorEmail: user.email ?? "",
    accion: "subir_documento_fondo",
    entidad: "fund_document",
    detalle: { nombre, storagePath },
  });

  revalidatePath("/admin/documentos");
  revalidatePath("/dashboard");
  return { ok: true };
}

export async function eliminarDocumento(documentId: string): Promise<ActionResult> {
  const user = await requireAdmin();

  const doc = await prisma.fundDocument.findUnique({ where: { id: documentId } });
  if (!doc) {
    return { ok: false, error: "El documento ya no existe." };
  }

  const admin = createAdminClient();
  const { error: removeError } = await admin.storage
    .from(FUND_DOCUMENTS_BUCKET)
    .remove([doc.storagePath]);
  if (removeError) {
    return { ok: false, error: `No se pudo borrar el archivo: ${removeError.message}` };
  }

  await prisma.fundDocument.delete({ where: { id: documentId } });

  await registrarAuditoria({
    actorId: user.id,
    actorEmail: user.email ?? "",
    accion: "eliminar_documento_fondo",
    entidad: "fund_document",
    entidadId: documentId,
    detalle: { nombre: doc.nombre, storagePath: doc.storagePath },
  });

  revalidatePath("/admin/documentos");
  revalidatePath("/dashboard");
  return { ok: true };
}

export async function obtenerUrlDescargaAdmin(documentId: string): Promise<string | null> {
  await requireAdmin();
  const doc = await prisma.fundDocument.findUnique({ where: { id: documentId } });
  if (!doc) return null;
  return crearUrlDescarga(doc.storagePath);
}
