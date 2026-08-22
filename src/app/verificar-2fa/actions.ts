"use server";

import { redirect } from "next/navigation";
import { requireUser } from "@/data/auth";
import { createClient } from "@/lib/supabase/server";

export type VerificarCodigoState = { error?: string } | undefined;

export async function verificarCodigo(
  _prevState: VerificarCodigoState,
  formData: FormData
): Promise<VerificarCodigoState> {
  const user = await requireUser();
  if (user.app_metadata?.role !== "admin") {
    redirect("/dashboard");
  }

  const code = formData.get("code");
  if (typeof code !== "string" || !/^\d{6}$/.test(code)) {
    return { error: "Ingresá el código de 6 dígitos." };
  }

  const supabase = await createClient();
  const { data: factors, error: factorsError } = await supabase.auth.mfa.listFactors();
  const factorId = factors?.totp[0]?.id;

  if (factorsError || !factorId) {
    return { error: "No se encontró un factor de verificación activo." };
  }

  const { error } = await supabase.auth.mfa.challengeAndVerify({ factorId, code });
  if (error) {
    return { error: "Código incorrecto. Probá de nuevo." };
  }

  redirect("/admin");
}
