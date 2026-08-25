"use server";

import { revalidatePath } from "next/cache";
import { getDefaultFundId } from "@/data/fondo";
import {
  guardarValuacion as guardarValuacionData,
  eliminarValuacion as eliminarValuacionData,
  type SimpleResult,
} from "@/data/valuaciones";

export type { SimpleResult };

export async function guardarValuacionAction(formData: FormData): Promise<SimpleResult> {
  const fundId = await getDefaultFundId();
  const result = await guardarValuacionData(fundId, {
    fecha: formData.get("fecha"),
    valorCuotaparte: formData.get("valorCuotaparte"),
    valorTotalFondo: formData.get("valorTotalFondo"),
    cuotapartesTotales: formData.get("cuotapartesTotales"),
  });
  if (result.ok) {
    revalidatePath("/admin/valuaciones");
    revalidatePath("/admin");
    revalidatePath("/dashboard");
  }
  return result;
}

export async function eliminarValuacionAction(fechaIso: string): Promise<SimpleResult> {
  const fundId = await getDefaultFundId();
  const result = await eliminarValuacionData(fundId, new Date(fechaIso));
  if (result.ok) {
    revalidatePath("/admin/valuaciones");
    revalidatePath("/admin");
    revalidatePath("/dashboard");
  }
  return result;
}
