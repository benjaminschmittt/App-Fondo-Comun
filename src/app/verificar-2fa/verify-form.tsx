"use client";

import { useActionState } from "react";
import { verificarCodigo, type VerificarCodigoState } from "./actions";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";

const initialState: VerificarCodigoState = undefined;

export function VerifyForm() {
  const [state, formAction, pending] = useActionState(verificarCodigo, initialState);

  return (
    <form action={formAction} className="space-y-4">
      <div className="space-y-1.5">
        <Label htmlFor="code">Código de 6 dígitos</Label>
        <Input
          id="code"
          name="code"
          inputMode="numeric"
          autoComplete="one-time-code"
          maxLength={6}
          required
          autoFocus
          placeholder="000000"
          className="text-center text-lg tracking-[0.5em]"
        />
      </div>

      {state?.error && (
        <Alert variant="destructive">
          <AlertDescription>{state.error}</AlertDescription>
        </Alert>
      )}

      <Button type="submit" disabled={pending} className="w-full">
        {pending ? "Verificando..." : "Verificar"}
      </Button>
    </form>
  );
}
