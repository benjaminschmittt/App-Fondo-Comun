"use server";

import { redirect } from "next/navigation";
import { requireUser } from "@/data/auth";
import { createClient } from "@/lib/supabase/server";

export type ConfirmarEnrolamientoState = { error?: string } | undefined;

export async function confirmarEnrolamiento(
  _prevState: ConfirmarEnrolamientoState,
  formData: FormData
): Promise<ConfirmarEnrolamientoState> {
  const user = await requireUser();
  if (user.app_metadata?.role !== "admin") {
    redirect("/dashboard");
  }

  const factorId = formData.get("factorId");
  const code = formData.get("code");

  if (typeof factorId !== "string" || typeof code !== "string" || !/^\d{6}$/.test(code)) {
    return { error: "Ingresá el código de 6 dígitos de tu app autenticadora." };
  }

  const supabase = await createClient();
  const { error } = await supabase.auth.mfa.challengeAndVerify({ factorId, code });

  if (error) {
    return { error: "Código incorrecto. Probá de nuevo." };
  }

  redirect("/admin");
}
