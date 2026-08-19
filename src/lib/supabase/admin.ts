import "server-only";
import { createClient as createSupabaseClient } from "@supabase/supabase-js";

// Cliente con la service_role key: bypassea RLS y puede administrar
// usuarios (invitar por email, etc). SOLO se usa en Server Actions
// que ya verificaron que quien llama es admin. Nunca se expone al browser.
export function createAdminClient() {
  return createSupabaseClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!,
    {
      auth: {
        autoRefreshToken: false,
        persistSession: false,
      },
    }
  );
}
