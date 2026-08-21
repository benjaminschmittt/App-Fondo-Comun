import { requireUser } from "@/data/auth";
import { logout } from "@/app/actions";
import { Button } from "@/components/ui/button";

// Pagina de destino para un usuario autenticado que no tiene (o ya no
// tiene) un cliente activo vinculado a su email. No es una ruta privada
// segun proxy.ts (no empieza con /dashboard ni /admin), asi que no hay
// riesgo de que el proxy la rebote — evita el ping-pong con /login.
export default async function SinClientePage() {
  await requireUser();

  return (
    <div className="flex min-h-screen items-center justify-center bg-background p-5">
      <div className="max-w-100 text-center">
        <div className="mx-auto mb-5 flex size-16 items-center justify-center rounded-full border-[1.5px] border-gold bg-card">
          <span className="font-heading text-2xl font-semibold text-navy">
            F
          </span>
        </div>
        <h1 className="mb-2 font-heading text-xl text-ink">
          Tu cuenta no tiene una inversión vinculada
        </h1>
        <p className="mb-6 text-sm text-muted-foreground">
          Esta cuenta inició sesión correctamente, pero no está asociada a
          ningún cliente activo del fondo. Contactá al administrador si
          pensás que esto es un error.
        </p>
        <form action={logout}>
          <Button type="submit">Cerrar sesión</Button>
        </form>
      </div>
    </div>
  );
}
