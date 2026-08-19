"use server";

import { revalidatePath } from "next/cache";
import { requireAdmin } from "@/data/auth";
import { createAdminClient } from "@/lib/supabase/admin";

export async function invitarCliente(email: string) {
  await requireAdmin();

  const origin = process.env.NEXT_PUBLIC_SITE_URL ?? "http://localhost:3000";
  const admin = createAdminClient();

  const { error } = await admin.auth.admin.inviteUserByEmail(email, {
    redirectTo: `${origin}/auth/confirm?next=/actualizar-password`,
  });

  if (error) {
    throw new Error(`No se pudo invitar a ${email}: ${error.message}`);
  }

  revalidatePath("/admin");
}
