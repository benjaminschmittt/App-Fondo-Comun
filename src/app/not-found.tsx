import Link from "next/link";
import { C } from "@/lib/theme";

export default function NotFound() {
  return (
    <div
      className="min-h-screen flex items-center justify-center p-5"
      style={{ background: C.surface }}
    >
      <div className="text-center" style={{ maxWidth: 380 }}>
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
            fontSize: 22,
            color: C.ink,
            marginBottom: 8,
          }}
        >
          Página no encontrada
        </h1>
        <p style={{ color: C.muted, fontSize: 14, marginBottom: 24 }}>
          La página que buscás no existe o se movió.
        </p>
        <Link
          href="/dashboard"
          className="inline-block rounded-lg"
          style={{
            background: C.navy,
            color: "#fff",
            padding: "10px 22px",
            fontWeight: 600,
            fontSize: 14,
          }}
        >
          Volver al inicio
        </Link>
      </div>
    </div>
  );
}
