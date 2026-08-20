"use client";

import { useEffect } from "react";
import { C } from "@/lib/theme";

export default function Error({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  useEffect(() => {
    console.error(error);
  }, [error]);

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
            border: `1.5px solid ${C.neg}`,
            background: "#fff",
          }}
        >
          <span style={{ fontSize: 26, color: C.neg }}>!</span>
        </div>
        <h1
          style={{
            fontFamily: "var(--font-fraunces), serif",
            fontSize: 22,
            color: C.ink,
            marginBottom: 8,
          }}
        >
          Algo salió mal
        </h1>
        <p style={{ color: C.muted, fontSize: 14, marginBottom: 24 }}>
          Ocurrió un error inesperado. Podés intentar de nuevo.
          {error.digest && (
            <>
              <br />
              <span style={{ fontSize: 11, color: C.muted }}>
                Referencia: {error.digest}
              </span>
            </>
          )}
        </p>
        <button
          onClick={reset}
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
          Reintentar
        </button>
      </div>
    </div>
  );
}
