import { C } from "@/lib/theme";
import { LoginForm } from "./login-form";

export default function LoginPage() {
  return (
    <div
      className="min-h-screen flex items-center justify-center p-5"
      style={{
        background: `radial-gradient(1200px 600px at 50% -10%, ${C.navy} 0%, ${C.navyDeep} 45%, ${C.navyDeeper} 100%)`,
      }}
    >
      <div className="w-full" style={{ maxWidth: 420 }}>
        <div className="flex flex-col items-center mb-7 fade-up">
          <div
            className="flex items-center justify-center mb-4"
            style={{
              width: 78,
              height: 78,
              borderRadius: "50%",
              border: `1.5px solid ${C.gold}`,
              background: "rgba(255,255,255,0.04)",
            }}
          >
            <span
              style={{
                fontFamily: "var(--font-fraunces), serif",
                fontSize: 30,
                fontWeight: 600,
                color: C.goldSoft,
              }}
            >
              F
            </span>
          </div>
          <div className="text-center">
            <div
              style={{
                fontFamily: "var(--font-fraunces), serif",
                fontSize: 26,
                fontWeight: 600,
                color: "#fff",
                letterSpacing: 0.3,
              }}
            >
              Fondo Privado
            </div>
            <div
              style={{
                color: C.goldSoft,
                fontSize: 11,
                letterSpacing: 2.5,
                textTransform: "uppercase",
                marginTop: 4,
              }}
            >
              Portal de Clientes
            </div>
          </div>
        </div>

        <div
          className="rounded-2xl p-7 fade-up"
          style={{
            background: "#fff",
            boxShadow: "0 24px 60px rgba(0,17,46,0.45)",
            animationDelay: "80ms",
          }}
        >
          <div className="mb-5">
            <div
              style={{
                color: C.gold,
                fontSize: 10.5,
                letterSpacing: 2,
                textTransform: "uppercase",
                fontWeight: 600,
              }}
            >
              Acceso exclusivo
            </div>
            <h1
              style={{
                fontFamily: "var(--font-fraunces), serif",
                fontSize: 22,
                color: C.ink,
                marginTop: 6,
              }}
            >
              Bienvenido
            </h1>
            <p style={{ color: C.muted, fontSize: 13.5, marginTop: 4 }}>
              Ingresa con tus credenciales para ver tu inversion.
            </p>
          </div>

          <LoginForm />
        </div>

        <div
          className="text-center mt-6"
          style={{ color: "rgba(255,255,255,0.45)", fontSize: 11.5, lineHeight: 1.8 }}
        >
          Acceso exclusivo para clientes del fondo
        </div>
      </div>
    </div>
  );
}
