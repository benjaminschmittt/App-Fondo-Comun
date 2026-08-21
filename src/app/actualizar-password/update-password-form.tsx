"use client";

import { useActionState } from "react";
import { actualizarPassword, type UpdatePasswordState } from "./actions";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";

const initialState: UpdatePasswordState = undefined;

export function UpdatePasswordForm() {
  const [state, formAction, pending] = useActionState(
    actualizarPassword,
    initialState
  );

  return (
    <form action={formAction} className="space-y-4">
      <div className="space-y-1.5">
        <Label htmlFor="password">Nueva contraseña</Label>
        <Input
          id="password"
          name="password"
          type="password"
          required
          minLength={8}
          className="h-10"
        />
      </div>

      <div className="space-y-1.5">
        <Label htmlFor="confirmar">Confirmar contraseña</Label>
        <Input
          id="confirmar"
          name="confirmar"
          type="password"
          required
          minLength={8}
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
        {pending ? "Guardando..." : "Guardar nueva contraseña"}
      </Button>
    </form>
  );
}
