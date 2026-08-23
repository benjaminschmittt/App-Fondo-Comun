"use server";

import { requireClient } from "@/data/auth";
import { getDefaultFundId } from "@/data/fondo";
import { crearUrlDescarga } from "@/data/documentos";
import { prisma } from "@/lib/prisma";

// El cliente solo puede pedir la URL de un documento de SU fondo — el
// fundId se resuelve del lado del servidor, nunca de un parametro que
// venga del navegador (misma regla que el resto de src/data).
export async function obtenerUrlDescargaCliente(documentId: string): Promise<string | null> {
  await requireClient();
  const fundId = await getDefaultFundId();

  const doc = await prisma.fundDocument.findFirst({
    where: { id: documentId, fundId },
  });
  if (!doc) return null;

  return crearUrlDescarga(doc.storagePath);
}
