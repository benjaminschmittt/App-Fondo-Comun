"use server";

import { revalidatePath } from "next/cache";
import { getDefaultFundId } from "@/data/fondo";
import {
  crearMovimiento as crearMovimientoData,
  editarMovimiento as editarMovimientoData,
  eliminarMovimiento as eliminarMovimientoData,
  type SimpleResult,
} from "@/data/movimientos";

export type { SimpleResult };

function parseForm(formData: FormData) {
  return {
    clientId: formData.get("clientId"),
    fecha: formData.get("fecha"),
    tipo: formData.get("tipo"),
    monto: formData.get("monto"),
  };
}

export async function crearMovimientoAction(formData: FormData): Promise<SimpleResult> {
  const fundId = await getDefaultFundId();
  const result = await crearMovimientoData(fundId, parseForm(formData));
  if (result.ok) {
    revalidatePath("/admin/movimientos");
    revalidatePath("/dashboard");
  }
  return result;
}

export async function editarMovimientoAction(id: string, formData: FormData): Promise<SimpleResult> {
  const result = await editarMovimientoData(id, parseForm(formData));
  if (result.ok) {
    revalidatePath("/admin/movimientos");
    revalidatePath("/dashboard");
  }
  return result;
}

export async function eliminarMovimientoAction(id: string): Promise<SimpleResult> {
  const result = await eliminarMovimientoData(id);
  if (result.ok) {
    revalidatePath("/admin/movimientos");
    revalidatePath("/dashboard");
  }
  return result;
}
