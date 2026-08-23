import "server-only";
import { prisma } from "@/lib/prisma";
import { createAdminClient } from "@/lib/supabase/admin";
import { requireClient, requireAdmin } from "./auth";
import { getDefaultFundId } from "./fondo";

// Bucket privado de Storage donde viven los PDFs. Sin politicas de
// storage.objects a proposito (ver migracion 20260823150000_fund_documents):
// toda subida/descarga pasa por el servidor con la service_role key.
export const FUND_DOCUMENTS_BUCKET = "fund-documents";

export const PDF_MAX_BYTES = 15 * 1024 * 1024; // 15MB, igual al limite del bucket.

// Documentos del fondo del cliente autenticado (resuelto desde la sesion,
// nunca de un parametro). Mismo fondo default que el resto del dashboard.
export async function listarDocumentosCliente() {
  await requireClient();
  const fundId = await getDefaultFundId();
  return prisma.fundDocument.findMany({
    where: { fundId },
    orderBy: { createdAt: "desc" },
  });
}

export async function listarDocumentosAdmin() {
  await requireAdmin();
  const fundId = await getDefaultFundId();
  return prisma.fundDocument.findMany({
    where: { fundId },
    orderBy: { createdAt: "desc" },
  });
}

// URL firmada de descarga: expira sola, nadie sin sesion puede acceder al
// archivo. Quien llama ya tiene que haber verificado que el documento
// pertenece a un fondo al que el usuario tiene acceso.
export async function crearUrlDescarga(storagePath: string): Promise<string | null> {
  const admin = createAdminClient();
  const { data, error } = await admin.storage
    .from(FUND_DOCUMENTS_BUCKET)
    .createSignedUrl(storagePath, 60, { download: true });

  if (error || !data) return null;
  return data.signedUrl;
}
