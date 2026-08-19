import "server-only";
import { createServerClient } from "@supabase/ssr";
import { cookies } from "next/headers";

// Cliente de Supabase para usar en Server Components, Server Actions
// y Route Handlers. Lee/escribe la sesion via cookies httpOnly.
export async function createClient() {
  const cookieStore = await cookies();

  return createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    {
      cookies: {
        getAll() {
          return cookieStore.getAll();
        },
        setAll(cookiesToSet) {
          try {
            cookiesToSet.forEach(({ name, value, options }) =>
              cookieStore.set(name, value, options)
            );
          } catch {
            // set() puede fallar si se llama desde un Server Component
            // (no desde una Server Action o Route Handler). El proxy.ts
            // refresca la sesion en ese caso, asi que es seguro ignorarlo.
          }
        },
      },
    }
  );
}
