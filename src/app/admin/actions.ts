"use server";

import { revalidatePath } from "next/cache";
import { requireAdmin } from "@/data/auth";
import { createAdminClient } from "@/lib/supabase/admin";

export type InviteResult = { ok: true } | { ok: false; error: string };

export async function invitarCliente(email: string): Promise<InviteResult> {
  await requireAdmin();

  const origin = process.env.NEXT_PUBLIC_SITE_URL ?? "http://localhost:3000";
  const admin = createAdminClient();

  const { error } = await admin.auth.admin.inviteUserByEmail(email, {
    redirectTo: `${origin}/auth/confirm?next=/actualizar-password`,
  });

  if (error) {
    // Devolvemos el error en vez de tirarlo: Next.js oculta el mensaje real
    // de las excepciones de Server Actions en produccion (por seguridad),
    // asi que un throw no sirve para mostrarle al admin la causa concreta.
    return { ok: false, error: `${error.status ?? "?"} ${error.message}` };
  }

  revalidatePath("/admin");
  return { ok: true };
}
