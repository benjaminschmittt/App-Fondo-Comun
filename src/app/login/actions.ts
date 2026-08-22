"use server";

import { z } from "zod";
import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";

const LoginSchema = z.object({
  email: z.email({ error: "Ingresa un email valido." }),
  password: z.string().min(1, { error: "Ingresa tu contraseña." }),
});

export type LoginState = { error?: string } | undefined;

export async function login(
  _prevState: LoginState,
  formData: FormData
): Promise<LoginState> {
  const parsed = LoginSchema.safeParse({
    email: formData.get("email"),
    password: formData.get("password"),
  });

  if (!parsed.success) {
    return { error: "Usuario o contraseña invalidos." };
  }

  const supabase = await createClient();
  const { data, error } = await supabase.auth.signInWithPassword(parsed.data);

  if (error) {
    return { error: "Usuario o contraseña incorrectos." };
  }

  if (data.user.app_metadata?.role === "admin") {
    const { data: aal } = await supabase.auth.mfa.getAuthenticatorAssuranceLevel();
    if (aal && aal.currentLevel !== aal.nextLevel) {
      redirect("/verificar-2fa");
    }
    if (aal && aal.nextLevel === "aal1") {
      redirect("/configurar-2fa");
    }
    redirect("/admin");
  }

  redirect("/dashboard");
}

const RecoverSchema = z.email({ error: "Ingresa un email valido." });

export type RecoverState = { error?: string; ok?: boolean } | undefined;

export async function solicitarRecuperacion(
  _prevState: RecoverState,
  formData: FormData
): Promise<RecoverState> {
  const parsed = RecoverSchema.safeParse(formData.get("email"));
  if (!parsed.success) {
    return { error: "Ingresa un email valido." };
  }

  const supabase = await createClient();
  const origin = process.env.NEXT_PUBLIC_SITE_URL ?? "http://localhost:3000";

  // No revelamos si el email existe o no (evita enumeracion de usuarios):
  // siempre respondemos "ok", el error real solo queda en logs del servidor.
  await supabase.auth.resetPasswordForEmail(parsed.data, {
    redirectTo: `${origin}/auth/confirm?next=/actualizar-password`,
  });

  return { ok: true };
}
