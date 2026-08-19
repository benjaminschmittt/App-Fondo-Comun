"use client";

import { useActionState } from "react";
import Link from "next/link";
import { solicitarRecuperacion, type RecoverState } from "../login/actions";
import { C } from "@/lib/theme";

const initialState: RecoverState = undefined;

export function RecoverForm() {
  const [state, formAction, pending] = useActionState(
    solicitarRecuperacion,
    initialState
  );

  if (state?.ok) {
    return (
      <div
        className="rounded-lg px-4 py-3"
        style={{ background: "#ecfdf5", color: C.pos, fontSize: 13.5 }}
      >
        Si el email existe en nuestro sistema, te enviamos un link para
        restablecer tu contraseña. Revisa tu casilla.
      </div>
    );
  }

  return (
    <form action={formAction}>
      <div className="mb-4">
        <label
          htmlFor="email"
          style={{
            fontSize: 12,
            fontWeight: 600,
            color: C.ink,
            display: "block",
            marginBottom: 6,
          }}
        >
          Email
        </label>
        <input
          id="email"
          name="email"
          type="email"
          required
          placeholder="tu@email.com"
          className="w-full outline-none rounded-lg"
          style={{
            border: `1.5px solid ${C.line}`,
            padding: "11px 12px",
            fontSize: 14.5,
            color: C.ink,
          }}
        />
      </div>

      {state?.error && (
        <div
          className="rounded-lg px-3 py-2 mt-1 mb-2"
          style={{ background: "#fef2f2", color: C.neg, fontSize: 13 }}
        >
          {state.error}
        </div>
      )}

      <button
        type="submit"
        disabled={pending}
        className="w-full rounded-lg mt-2"
        style={{
          background: C.navy,
          color: "#fff",
          padding: "12px 0",
          fontWeight: 600,
          fontSize: 14.5,
          opacity: pending ? 0.7 : 1,
        }}
      >
        {pending ? "Enviando..." : "Enviar link de recuperacion"}
      </button>

      <div className="text-center mt-4">
        <Link href="/login" style={{ fontSize: 12.5, color: C.muted }}>
          Volver al login
        </Link>
      </div>
    </form>
  );
}
