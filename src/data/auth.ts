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
// Chequea SOLO el rol — usar en Server Actions y en llamadas desde
// Server Components que ya cuelgan de /admin (donde requireAdmin() de
// abajo ya exigio el rol Y el 2FA para poder llegar ahi). No re-chequea
// el AAL a proposito: hacerlo desde una Server Action (ej. subirExcel,
// invitarCliente) causaba un redirect espurio a /verificar-2fa que a su
// vez rebotaba de inmediato a /admin (porque la sesion SI estaba en
// aal2) — la accion nunca llegaba a correr y quedaba en silencio, sin
// error ni confirmacion. Bug real visto en produccion, no reintroducir
// el chequeo de AAL aca.
export async function requireAdminRole() {
  const user = await requireUser();
  if (user.app_metadata?.role !== "admin") {
    redirect("/dashboard");
  }
  return user;
}

// Gate completo para renderizar paginas: rol + 2FA obligatorio. Usar
// SOLO en layouts/paginas de nivel superior (admin/layout.tsx) — nunca
// dentro de una Server Action (ver comentario de requireAdminRole).
// Si todavia no tiene un factor enrolado lo manda a configurarlo, y si
// lo tiene pero esta sesion no llego a aal2 (recien hizo login con
// password) lo manda a verificar el codigo. Ninguna de las dos rutas
// pasa por requireAdmin (estan fuera de /admin), asi que no hay riesgo
// de loop.
export async function requireAdmin() {
  const user = await requireAdminRole();

  const supabase = await createClient();
  const { data: aal } = await supabase.auth.mfa.getAuthenticatorAssuranceLevel();
  if (aal && aal.currentLevel !== aal.nextLevel) {
    redirect("/verificar-2fa");
  }
  if (aal && aal.nextLevel === "aal1") {
    redirect("/configurar-2fa");
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
