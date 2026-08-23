import { createServerClient } from "@supabase/ssr";
import { NextResponse, type NextRequest } from "next/server";

// Primera linea de defensa: redirige a rutas privadas sin sesion.
// No es la unica: cada Server Action / DAL vuelve a verificar la
// sesion y la autorizacion por su cuenta (ver src/data/auth.ts),
// porque Proxy puede saltarse con refactors o llamadas directas.
export async function proxy(request: NextRequest) {
  let response = NextResponse.next({ request });

  const supabase = createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    {
      cookies: {
        getAll() {
          return request.cookies.getAll();
        },
        setAll(cookiesToSet) {
          cookiesToSet.forEach(({ name, value }) =>
            request.cookies.set(name, value)
          );
          response = NextResponse.next({ request });
          cookiesToSet.forEach(({ name, value, options }) =>
            response.cookies.set(name, value, options)
          );
        },
      },
    }
  );

  const {
    data: { user },
  } = await supabase.auth.getUser();

  const { pathname } = request.nextUrl;
  const isAdminRoute = pathname.startsWith("/admin");
  const isPrivateRoute = pathname.startsWith("/dashboard") || isAdminRoute;
  const isLoginRoute = pathname.startsWith("/login");

  // Redirige preservando las cookies que supabase-ssr ya haya refrescado
  // en `response` (ver setAll arriba) — si no las copiaramos, un
  // refresh de token justo antes del redirect se perderia.
  function redirectTo(path: string) {
    const url = request.nextUrl.clone();
    url.pathname = path;
    const redirectResponse = NextResponse.redirect(url);
    response.cookies.getAll().forEach((cookie) => {
      redirectResponse.cookies.set(cookie);
    });
    return redirectResponse;
  }

  if (!user && isPrivateRoute) {
    return redirectTo("/login");
  }

  if (user && isLoginRoute) {
    return redirectTo("/dashboard");
  }

  // 2FA obligatorio para admin: se chequea ACA (middleware), no en el
  // Server Component del layout de /admin. Motivo: si getUser() dispara
  // un refresh de token, un Server Component no puede persistir la
  // cookie nueva (Next.js la descarta en silencio fuera de Server
  // Actions/Route Handlers — ver el catch en src/lib/supabase/server.ts).
  // Eso hacia que la sesion "perdiera" el aal2 en cada navegacion y
  // pidiera el codigo de 2FA una y otra vez, bloqueando en la practica
  // cualquier accion de admin (bug real visto en produccion). El
  // middleware si puede persistir cookies de forma confiable.
  // mfaExempt: excepcion puntual, pedida explicitamente por el dueño del
  // proyecto para una cuenta admin especifica (no un email hardcodeado
  // aca — vive en app_metadata de esa cuenta, solo la service_role key
  // puede setearlo). Usar con criterio: cada cuenta exenta es una cuenta
  // sin la segunda capa de defensa sobre datos financieros reales.
  if (
    user &&
    isAdminRoute &&
    user.app_metadata?.role === "admin" &&
    !user.app_metadata?.mfaExempt
  ) {
    const { data: aal } = await supabase.auth.mfa.getAuthenticatorAssuranceLevel();
    if (aal && aal.currentLevel !== aal.nextLevel) {
      return redirectTo("/verificar-2fa");
    }
    if (aal && aal.nextLevel === "aal1") {
      return redirectTo("/configurar-2fa");
    }
  }

  return response;
}

export const config = {
  matcher: [
    "/((?!_next/static|_next/image|favicon.ico|.*\\.(?:svg|png|jpg|jpeg|gif|webp)$).*)",
  ],
};
