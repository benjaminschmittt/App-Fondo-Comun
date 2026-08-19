"use server";

import { revalidatePath } from "next/cache";
import { requireAdmin } from "@/data/auth";
import { importExcel, type ImportResult } from "@/lib/excel/import";

export type UploadState = ImportResult | undefined;

export async function subirExcel(
  _prevState: UploadState,
  formData: FormData
): Promise<UploadState> {
  const user = await requireAdmin();

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
    revalidatePath("/admin");
    revalidatePath("/dashboard");
  }

  return result;
}
