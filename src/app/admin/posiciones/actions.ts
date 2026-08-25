"use server";

import { revalidatePath } from "next/cache";
import { getDefaultFundId } from "@/data/fondo";
import {
  crearPosicion as crearPosicionData,
  editarPosicion as editarPosicionData,
  eliminarPosicion as eliminarPosicionData,
  type SimpleResult,
} from "@/data/posiciones";

export type { SimpleResult };

function parseForm(formData: FormData) {
  return {
    fecha: formData.get("fecha"),
    ticker: formData.get("ticker"),
    nombre: formData.get("nombre"),
    tipoInstrumento: formData.get("tipoInstrumento"),
    sector: formData.get("sector"),
    cantidad: formData.get("cantidad"),
    precio: formData.get("precio"),
  };
}

export async function crearPosicionAction(formData: FormData): Promise<SimpleResult> {
  const fundId = await getDefaultFundId();
  const result = await crearPosicionData(fundId, parseForm(formData));
  if (result.ok) {
    revalidatePath("/admin/posiciones");
    revalidatePath("/dashboard");
  }
  return result;
}

export async function editarPosicionAction(id: string, formData: FormData): Promise<SimpleResult> {
  const result = await editarPosicionData(id, parseForm(formData));
  if (result.ok) {
    revalidatePath("/admin/posiciones");
    revalidatePath("/dashboard");
  }
  return result;
}

export async function eliminarPosicionAction(id: string): Promise<SimpleResult> {
  const result = await eliminarPosicionData(id);
  if (result.ok) {
    revalidatePath("/admin/posiciones");
    revalidatePath("/dashboard");
  }
  return result;
}
