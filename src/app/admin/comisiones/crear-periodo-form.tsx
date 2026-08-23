"use client";

import { useActionState } from "react";
import { crearPeriodoAction, type CrearPeriodoState } from "./actions";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { fechaLarga } from "@/lib/theme";

const initialState: CrearPeriodoState = undefined;

export function CrearPeriodoForm({ fechasDeCorte }: { fechasDeCorte: Date[] }) {
  const [state, formAction, pending] = useActionState(crearPeriodoAction, initialState);

  return (
    <form action={formAction} className="space-y-4">
      <div className="grid grid-cols-1 gap-4 sm:grid-cols-3">
        <div className="space-y-1.5">
          <Label htmlFor="periodStart">Inicio del período</Label>
          <Input id="periodStart" name="periodStart" type="date" required disabled={pending} />
        </div>
        <div className="space-y-1.5">
          <Label htmlFor="periodEnd">Cierre del período</Label>
          <select
            id="periodEnd"
            name="periodEnd"
            required
            disabled={pending}
            defaultValue=""
            className="flex h-10 w-full rounded-lg border border-border bg-background px-3 text-sm outline-none focus-visible:border-ring focus-visible:ring-3 focus-visible:ring-ring/50 disabled:pointer-events-none disabled:opacity-50"
          >
            <option value="" disabled>
              Elegí una fecha de corte
            </option>
            {fechasDeCorte.map((f) => {
              const iso = f.toISOString().slice(0, 10);
              return (
                <option key={iso} value={iso}>
                  {fechaLarga(f)}
                </option>
              );
            })}
          </select>
        </div>
        <div className="space-y-1.5">
          <Label htmlFor="feeRate">Fee de performance (%)</Label>
          <Input
            id="feeRate"
            name="feeRate"
            type="number"
            step="0.1"
            min="0.1"
            max="99.9"
            placeholder="20"
            required
            disabled={pending}
          />
        </div>
      </div>

      {state && !state.ok && (
        <Alert variant="destructive">
          <AlertDescription>{state.error}</AlertDescription>
        </Alert>
      )}

      <Button type="submit" disabled={pending}>
        {pending ? "Creando..." : "Crear período"}
      </Button>
    </form>
  );
}
