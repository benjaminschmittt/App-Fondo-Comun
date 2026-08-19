"use client";

import { useActionState, useState } from "react";
import Link from "next/link";
import { Lock, User } from "lucide-react";
import { login, type LoginState } from "./actions";
import { C } from "@/lib/theme";

const initialState: LoginState = undefined;

export function LoginForm() {
  const [state, formAction, pending] = useActionState(login, initialState);
  const [focus, setFocus] = useState<"email" | "password" | null>(null);

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
        <div
          className="flex items-center rounded-lg px-3"
          style={{
            border: `1.5px solid ${focus === "email" ? C.navy : C.line}`,
            background: "#fff",
            transition: "border-color .15s",
          }}
        >
          <span style={{ color: focus === "email" ? C.navy : C.muted }}>
            <User size={16} />
          </span>
          <input
            id="email"
            name="email"
            type="email"
            required
            autoComplete="username"
            placeholder="tu@email.com"
            onFocus={() => setFocus("email")}
            onBlur={() => setFocus(null)}
            className="w-full outline-none"
            style={{
              padding: "11px 10px",
              fontSize: 14.5,
              color: C.ink,
              background: "transparent",
            }}
          />
        </div>
      </div>

      <div className="mb-2">
        <label
          htmlFor="password"
          style={{
            fontSize: 12,
            fontWeight: 600,
            color: C.ink,
            display: "block",
            marginBottom: 6,
          }}
        >
          Contraseña
        </label>
        <div
          className="flex items-center rounded-lg px-3"
          style={{
            border: `1.5px solid ${focus === "password" ? C.navy : C.line}`,
            background: "#fff",
            transition: "border-color .15s",
          }}
        >
          <span style={{ color: focus === "password" ? C.navy : C.muted }}>
            <Lock size={16} />
          </span>
          <input
            id="password"
            name="password"
            type="password"
            required
            autoComplete="current-password"
            placeholder="••••••••"
            onFocus={() => setFocus("password")}
            onBlur={() => setFocus(null)}
            className="w-full outline-none"
            style={{
              padding: "11px 10px",
              fontSize: 14.5,
              color: C.ink,
              background: "transparent",
            }}
          />
        </div>
      </div>

      <div className="text-right mb-3">
        <Link
          href="/recuperar"
          style={{ fontSize: 12.5, color: C.muted, textDecoration: "underline" }}
        >
          ¿Olvidaste tu contraseña?
        </Link>
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
        className="w-full rounded-lg mt-2 transition-all"
        style={{
          background: C.navy,
          color: "#fff",
          padding: "12px 0",
          fontWeight: 600,
          fontSize: 14.5,
          letterSpacing: 0.3,
          opacity: pending ? 0.7 : 1,
          cursor: pending ? "default" : "pointer",
        }}
      >
        {pending ? "Ingresando..." : "Ingresar"}
      </button>
    </form>
  );
}
