"use server";

import { revalidatePath, updateTag } from "next/cache";
import { requireAdminRole } from "@/data/auth";
import { importExcel, type ImportResult } from "@/lib/excel/import";
import { FONDO_DATA_TAG } from "@/data/fondo";

export type UploadState = ImportResult | undefined;

export async function subirExcel(
  _prevState: UploadState,
  formData: FormData
): Promise<UploadState> {
  const user = await requireAdminRole();

  const file = formData.get("archivo");
  if (!(file instanceof File) || file.size === 0) {
    return {
      ok: false,
      errors: [{ hoja: "-", fila: 0, motivo: "Selecciona un archivo .xlsx." }],
    };
  }

  const buffer = Buffer.from(await file.arrayBuffer());
  const result = await importExcel(buffer, {
    archivoNombre: file.name,
    importadoPorId: user.id,
    importadoPorEmail: user.email ?? "",
  });

  if (result.ok) {
    // updateTag (no revalidateTag): esta es una Server Action y queremos
    // que la data quede fresca de inmediato, no "eventualmente" en la
    // proxima visita (comportamiento por defecto de revalidateTag).
    updateTag(FONDO_DATA_TAG);
    revalidatePath("/admin");
    revalidatePath("/dashboard");
  }

  return result;
}
