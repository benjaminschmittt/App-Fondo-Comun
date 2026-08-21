import { LogOut } from "lucide-react";
import { fechaLarga } from "@/lib/theme";
import { logout } from "@/app/actions";

export function ClientTopbar({
  nombre,
  fechaCorte,
}: {
  nombre: string;
  fechaCorte?: Date | null;
}) {
  return (
    <header className="sticky top-0 z-10 flex items-center justify-between bg-primary px-5 py-3 shadow-[0_2px_20px_rgba(15,23,42,0.25)] md:px-8">
      <div className="flex items-center gap-3">
        <div className="flex size-9 items-center justify-center rounded-full border-[1.3px] border-gold">
          <span className="font-heading text-[17px] font-semibold text-gold-soft">
            F
          </span>
        </div>
        <div>
          <div className="font-heading text-base leading-tight text-white">
            Fondo Privado
          </div>
          <div className="text-[10.5px] tracking-wider text-white/55 uppercase">
            Portal de Clientes
          </div>
        </div>
      </div>
      <div className="flex items-center gap-4">
        <div className="hidden text-right sm:block">
          <div className="text-[13.5px] font-semibold text-white">{nombre}</div>
          {fechaCorte && (
            <div className="text-[11px] text-white/55">
              Datos al {fechaLarga(fechaCorte)}
            </div>
          )}
        </div>
        <form action={logout}>
          <button
            type="submit"
            className="flex items-center gap-1.5 rounded-lg border border-white/25 px-3 py-1.5 text-[13px] text-white transition-colors hover:bg-white/10"
          >
            <LogOut size={15} /> Salir
          </button>
        </form>
      </div>
    </header>
  );
}
