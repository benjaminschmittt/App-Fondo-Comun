import "server-only";
import { cache } from "react";
import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { prisma } from "@/lib/prisma";

// getUser() revalida el token contra el servidor de Supabase Auth
// (a diferencia de leer la sesion de la cookie sin validar), por eso
// es la funcion recomendada para verificar identidad en el servidor.
// cache() evita repetir la llamada varias veces en el mismo request.
export const getCurrentUser = cache(async () => {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  return user;
});

export async function requireUser() {
  const user = await getCurrentUser();
  if (!user) redirect("/login");
  return user;
}

// El rol vive en app_metadata (solo lo puede escribir el service_role,
// nunca el propio usuario), no en user_metadata. Ver docs de setup.
// Chequea SOLO el rol. El gate de 2FA (AAL) para /admin vive en
// proxy.ts (middleware), NO aca — a proposito. Si getUser() dispara un
// refresh de token, un Server Component no puede persistir la cookie
// nueva (Next.js la descarta en silencio fuera de Server Actions/Route
// Handlers, ver el catch en src/lib/supabase/server.ts). Tener el
// chequeo de AAL aca hacia que la sesion pareciera "perder" el aal2 en
// cada navegacion y pidiera el codigo de 2FA una y otra vez, bloqueando
// en la practica cualquier accion de admin (bug real visto en
// produccion). El middleware si puede persistir cookies de forma
// confiable — no reintroducir el chequeo de AAL aca.
export async function requireAdmin() {
  const user = await requireUser();
  if (user.app_metadata?.role !== "admin") {
    redirect("/dashboard");
  }
  return user;
}

// Resuelve el client_id a partir del EMAIL de la sesion autenticada.
// Nunca a partir de un parametro que venga del navegador (URL, body, etc).
export const getCurrentClient = cache(async () => {
  const user = await requireUser();
  const email = user.email;
  if (!email) redirect("/login");

  const client = await prisma.client.findFirst({
    where: { email: { equals: email, mode: "insensitive" }, activo: true },
  });

  return client;
});

export async function requireClient() {
  const client = await getCurrentClient();
  if (!client) {
    // No redirigir a /login: un usuario autenticado en /login rebota a
    // /dashboard (ver proxy.ts), lo que crearia un loop infinito con este
    // mismo redirect. Los admins van a su panel; el resto, a una pagina
    // dedicada que no es ruta privada (proxy.ts no la toca).
    const user = await requireUser();
    if (user.app_metadata?.role === "admin") {
      redirect("/admin");
    }
    redirect("/sin-cliente");
  }
  return client;
}
