"use server";

import { redirect } from "next/navigation";
import { revalidatePath } from "next/cache";
import { getDefaultFundId } from "@/data/fondo";
import {
  crearPeriodo as crearPeriodoData,
  calcularPeriodo as calcularPeriodoData,
  aprobarCalculo as aprobarCalculoData,
  excluirCalculo as excluirCalculoData,
  revertirCalculo as revertirCalculoData,
  cancelarPeriodo as cancelarPeriodoData,
  aplicarPeriodo as aplicarPeriodoData,
  type SimpleResult,
} from "@/data/comisiones";

export type CrearPeriodoState = { ok: false; error: string } | undefined;

export async function crearPeriodoAction(
  _prevState: CrearPeriodoState,
  formData: FormData
): Promise<CrearPeriodoState> {
  const fundId = await getDefaultFundId();

  const periodStart = formData.get("periodStart");
  const periodEnd = formData.get("periodEnd");
  const feeRatePct = formData.get("feeRate");

  if (typeof periodStart !== "string" || !periodStart) {
    return { ok: false, error: "Elegí la fecha de inicio del período." };
  }
  if (typeof periodEnd !== "string" || !periodEnd) {
    return { ok: false, error: "Elegí la fecha de cierre del período." };
  }
  const feeRateNum = Number(feeRatePct);
  if (!Number.isFinite(feeRateNum)) {
    return { ok: false, error: "Ingresá un porcentaje de fee válido." };
  }

  const result = await crearPeriodoData({
    fundId,
    periodStart: new Date(periodStart),
    periodEnd: new Date(periodEnd),
    feeRate: feeRateNum / 100,
  });

  if (!result.ok) return result;

  revalidatePath("/admin/comisiones");
  redirect(`/admin/comisiones/${result.id}`);
}

export async function calcularPeriodoAction(feePeriodId: string): Promise<SimpleResult> {
  const result = await calcularPeriodoData(feePeriodId);
  if (result.ok) revalidatePath(`/admin/comisiones/${feePeriodId}`);
  return result.ok ? { ok: true } : result;
}

export async function aprobarCalculoAction(
  calculationId: string,
  feePeriodId: string
): Promise<SimpleResult> {
  const result = await aprobarCalculoData(calculationId);
  if (result.ok) revalidatePath(`/admin/comisiones/${feePeriodId}`);
  return result;
}

export async function excluirCalculoAction(
  calculationId: string,
  feePeriodId: string
): Promise<SimpleResult> {
  const result = await excluirCalculoData(calculationId);
  if (result.ok) revalidatePath(`/admin/comisiones/${feePeriodId}`);
  return result;
}

export async function revertirCalculoAction(
  calculationId: string,
  feePeriodId: string
): Promise<SimpleResult> {
  const result = await revertirCalculoData(calculationId);
  if (result.ok) revalidatePath(`/admin/comisiones/${feePeriodId}`);
  return result;
}

export async function cancelarPeriodoAction(feePeriodId: string): Promise<SimpleResult> {
  const result = await cancelarPeriodoData(feePeriodId);
  if (!result.ok) return result;

  // Un periodo cancelado no tiene mas nada que hacer en su propia
  // pagina — vuelve directo al listado en vez de dejar al admin
  // "varado" en el detalle.
  revalidatePath("/admin/comisiones");
  redirect("/admin/comisiones");
}

export async function aplicarPeriodoAction(feePeriodId: string): Promise<SimpleResult> {
  const result = await aplicarPeriodoData(feePeriodId);
  if (result.ok) revalidatePath(`/admin/comisiones/${feePeriodId}`);
  return result.ok ? { ok: true } : result;
}
