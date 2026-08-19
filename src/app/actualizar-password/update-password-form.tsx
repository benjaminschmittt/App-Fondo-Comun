"use client";

import { useActionState } from "react";
import { actualizarPassword, type UpdatePasswordState } from "./actions";
import { C } from "@/lib/theme";

const initialState: UpdatePasswordState = undefined;

export function UpdatePasswordForm() {
  const [state, formAction, pending] = useActionState(
    actualizarPassword,
    initialState
  );

  return (
    <form action={formAction}>
      <div className="mb-4">
        <label
          htmlFor="password"
          style={{ fontSize: 12, fontWeight: 600, color: C.ink, display: "block", marginBottom: 6 }}
        >
          Nueva contraseña
        </label>
        <input
          id="password"
          name="password"
          type="password"
          required
          minLength={8}
          className="w-full outline-none rounded-lg"
          style={{ border: `1.5px solid ${C.line}`, padding: "11px 12px", fontSize: 14.5, color: C.ink }}
        />
      </div>

      <div className="mb-2">
        <label
          htmlFor="confirmar"
          style={{ fontSize: 12, fontWeight: 600, color: C.ink, display: "block", marginBottom: 6 }}
        >
          Confirmar contraseña
        </label>
        <input
          id="confirmar"
          name="confirmar"
          type="password"
          required
          minLength={8}
          className="w-full outline-none rounded-lg"
          style={{ border: `1.5px solid ${C.line}`, padding: "11px 12px", fontSize: 14.5, color: C.ink }}
        />
      </div>

      {state?.error && (
        <div className="rounded-lg px-3 py-2 mt-1 mb-2" style={{ background: "#fef2f2", color: C.neg, fontSize: 13 }}>
          {state.error}
        </div>
      )}

      <button
        type="submit"
        disabled={pending}
        className="w-full rounded-lg mt-2"
        style={{ background: C.navy, color: "#fff", padding: "12px 0", fontWeight: 600, fontSize: 14.5, opacity: pending ? 0.7 : 1 }}
      >
        {pending ? "Guardando..." : "Guardar nueva contraseña"}
      </button>
    </form>
  );
}
