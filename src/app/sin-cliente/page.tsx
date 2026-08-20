import { requireUser } from "@/data/auth";
import { logout } from "@/app/actions";
import { C } from "@/lib/theme";

// Pagina de destino para un usuario autenticado que no tiene (o ya no
// tiene) un cliente activo vinculado a su email. No es una ruta privada
// segun proxy.ts (no empieza con /dashboard ni /admin), asi que no hay
// riesgo de que el proxy la rebote — evita el ping-pong con /login.
export default async function SinClientePage() {
  await requireUser();

  return (
    <div
      className="min-h-screen flex items-center justify-center p-5"
      style={{ background: C.surface }}
    >
      <div className="text-center" style={{ maxWidth: 400 }}>
        <div
          className="flex items-center justify-center mx-auto mb-5"
          style={{
            width: 64,
            height: 64,
            borderRadius: "50%",
            border: `1.5px solid ${C.gold}`,
            background: "#fff",
          }}
        >
          <span
            style={{
              fontFamily: "var(--font-fraunces), serif",
              fontSize: 26,
              fontWeight: 600,
              color: C.navy,
            }}
          >
            F
          </span>
        </div>
        <h1
          style={{
            fontFamily: "var(--font-fraunces), serif",
            fontSize: 20,
            color: C.ink,
            marginBottom: 8,
          }}
        >
          Tu cuenta no tiene una inversión vinculada
        </h1>
        <p style={{ color: C.muted, fontSize: 14, marginBottom: 24 }}>
          Esta cuenta inició sesión correctamente, pero no está asociada a
          ningún cliente activo del fondo. Contactá al administrador si
          pensás que esto es un error.
        </p>
        <form action={logout}>
          <button
            type="submit"
            className="rounded-lg"
            style={{
              background: C.navy,
              color: "#fff",
              padding: "10px 22px",
              fontWeight: 600,
              fontSize: 14,
              border: "none",
            }}
          >
            Cerrar sesión
          </button>
        </form>
      </div>
    </div>
  );
}
