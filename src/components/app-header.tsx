import Link from "next/link";
import { LogOut } from "lucide-react";
import { C, fechaLarga } from "@/lib/theme";
import { logout } from "@/app/actions";

export function AppHeader({
  nombre,
  fechaCorte,
  isAdmin,
}: {
  nombre: string;
  fechaCorte?: Date | null;
  isAdmin?: boolean;
}) {
  return (
    <header
      className="sticky top-0 z-10 flex items-center justify-between px-5 md:px-8 py-3"
      style={{ background: C.navy, boxShadow: "0 2px 20px rgba(0,17,46,0.25)" }}
    >
      <div className="flex items-center" style={{ gap: 12 }}>
        <div
          className="flex items-center justify-center"
          style={{ width: 36, height: 36, borderRadius: "50%", border: `1.3px solid ${C.gold}` }}
        >
          <span style={{ fontFamily: "var(--font-fraunces), serif", fontWeight: 600, color: C.goldSoft, fontSize: 17 }}>
            F
          </span>
        </div>
        <div>
          <div style={{ fontFamily: "var(--font-fraunces), serif", color: "#fff", fontSize: 16, lineHeight: 1.1 }}>
            Fondo Privado
          </div>
          <div style={{ color: "rgba(255,255,255,0.55)", fontSize: 10.5, letterSpacing: 1.5, textTransform: "uppercase" }}>
            {isAdmin ? "Panel Administrador" : "Portal de Clientes"}
          </div>
        </div>
      </div>
      <div className="flex items-center" style={{ gap: 16 }}>
        {isAdmin && (
          <Link
            href="/dashboard"
            style={{ color: "rgba(255,255,255,0.75)", fontSize: 13 }}
          >
            Ver dashboard
          </Link>
        )}
        {!isAdmin && (
          <div className="text-right hidden sm:block">
            <div style={{ color: "#fff", fontSize: 13.5, fontWeight: 600 }}>{nombre}</div>
            {fechaCorte && (
              <div style={{ color: "rgba(255,255,255,0.55)", fontSize: 11 }}>
                Datos al {fechaLarga(fechaCorte)}
              </div>
            )}
          </div>
        )}
        <form action={logout}>
          <button
            type="submit"
            className="flex items-center rounded-lg transition-all"
            style={{ gap: 6, color: "#fff", border: "1px solid rgba(255,255,255,0.25)", padding: "7px 12px", fontSize: 13 }}
          >
            <LogOut size={15} /> Salir
          </button>
        </form>
      </div>
    </header>
  );
}
