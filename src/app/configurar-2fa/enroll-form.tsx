"use client";

import { useActionState } from "react";
import { confirmarEnrolamiento, type ConfirmarEnrolamientoState } from "./actions";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";

const initialState: ConfirmarEnrolamientoState = undefined;

export function EnrollForm({
  factorId,
  qrCode,
  secret,
}: {
  factorId: string;
  qrCode: string;
  secret: string;
}) {
  const [state, formAction, pending] = useActionState(confirmarEnrolamiento, initialState);

  return (
    <form action={formAction} className="space-y-4">
      <input type="hidden" name="factorId" value={factorId} />

      <div className="mx-auto flex size-44 items-center justify-center rounded-xl border border-border bg-white p-2">
        {/* eslint-disable-next-line @next/next/no-img-element -- data URI de Supabase, no un asset optimizable */}
        <img src={qrCode} alt="Código QR para configurar la app autenticadora" className="size-full" />
      </div>

      <div className="rounded-lg bg-muted px-3 py-2 text-center">
        <div className="label-eyebrow text-muted-foreground">
          O ingresá esta clave manualmente
        </div>
        <div className="tnum mt-1 text-sm font-medium break-all text-ink">{secret}</div>
      </div>

      <div className="space-y-1.5">
        <Label htmlFor="code">Código de 6 dígitos</Label>
        <Input
          id="code"
          name="code"
          inputMode="numeric"
          autoComplete="one-time-code"
          maxLength={6}
          required
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
        {pending ? "Verificando..." : "Confirmar y activar"}
      </Button>
    </form>
  );
}
