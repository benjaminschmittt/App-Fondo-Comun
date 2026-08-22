import "server-only";
import { createAdminClient } from "@/lib/supabase/admin";
import { requireAdminRole } from "./auth";

// Emails que ya tienen una cuenta de login en Supabase Auth. Se usa para
// mostrar en el panel admin que clientes todavia no fueron invitados.
export async function getEmailsConCuenta(): Promise<Set<string>> {
  await requireAdminRole();
  const admin = createAdminClient();
  const { data, error } = await admin.auth.admin.listUsers({ perPage: 1000 });
  if (error) return new Set();
  return new Set(data.users.map((u) => (u.email ?? "").toLowerCase()));
}
