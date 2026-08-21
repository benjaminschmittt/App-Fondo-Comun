"use client";

import { useActionState } from "react";
import Link from "next/link";
import { solicitarRecuperacion, type RecoverState } from "../login/actions";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";

const initialState: RecoverState = undefined;

export function RecoverForm() {
  const [state, formAction, pending] = useActionState(
    solicitarRecuperacion,
    initialState
  );

  if (state?.ok) {
    return (
      <Alert className="border-pos/30 bg-pos-soft text-pos [&_[data-slot=alert-description]]:text-pos">
        <AlertDescription>
          Si el email existe en nuestro sistema, te enviamos un link para
          restablecer tu contraseña. Revisa tu casilla.
        </AlertDescription>
      </Alert>
    );
  }

  return (
    <form action={formAction} className="space-y-4">
      <div className="space-y-1.5">
        <Label htmlFor="email">Email</Label>
        <Input
          id="email"
          name="email"
          type="email"
          required
          placeholder="tu@email.com"
          className="h-10"
        />
      </div>

      {state?.error && (
        <Alert variant="destructive">
          <AlertDescription>{state.error}</AlertDescription>
        </Alert>
      )}

      <Button
        type="submit"
        disabled={pending}
        className="h-10.5 w-full text-sm font-semibold"
      >
        {pending ? "Enviando..." : "Enviar link de recuperacion"}
      </Button>

      <div className="text-center">
        <Link
          href="/login"
          className="text-xs text-muted-foreground underline underline-offset-2 hover:text-foreground"
        >
          Volver al login
        </Link>
      </div>
    </form>
  );
}
