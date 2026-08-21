import { LoginForm } from "./login-form";

export default function LoginPage() {
  return (
    <div className="flex min-h-screen items-center justify-center bg-[radial-gradient(1200px_600px_at_50%_-10%,var(--navy)_0%,var(--navy-800)_45%,var(--navy-900)_100%)] p-5">
      <div className="w-full max-w-105">
        <div className="fade-up mb-7 flex flex-col items-center">
          <div className="mb-4 flex size-19.5 items-center justify-center rounded-full border-[1.5px] border-gold bg-white/4">
            <span className="font-heading text-3xl font-semibold text-gold-soft">
              F
            </span>
          </div>
          <div className="text-center">
            <div className="font-heading text-2xl font-semibold tracking-wide text-white">
              Fondo Privado
            </div>
            <div className="mt-1 text-[11px] tracking-[0.2em] text-gold-soft uppercase">
              Portal de Clientes
            </div>
          </div>
        </div>

        <div
          className="fade-up rounded-2xl bg-card p-7 shadow-[0_24px_60px_rgba(0,17,46,0.45)]"
          style={{ animationDelay: "80ms" }}
        >
          <div className="mb-5">
            <div className="text-[10.5px] font-semibold tracking-[0.15em] text-gold uppercase">
              Acceso exclusivo
            </div>
            <h1 className="mt-1.5 font-heading text-xl text-ink">
              Bienvenido
            </h1>
            <p className="mt-1 text-sm text-muted-foreground">
              Ingresa con tus credenciales para ver tu inversion.
            </p>
          </div>

          <LoginForm />
        </div>

        <div className="mt-6 text-center text-[11.5px] leading-relaxed text-white/45">
          Acceso exclusivo para clientes del fondo
        </div>
      </div>
    </div>
  );
}
