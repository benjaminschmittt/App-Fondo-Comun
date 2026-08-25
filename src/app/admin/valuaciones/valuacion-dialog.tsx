"use client";

import { useState, useTransition, type FormEvent, type ReactNode } from "react";
import { guardarValuacionAction } from "./actions";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Alert, AlertDescription } from "@/components/ui/alert";

type ValuacionInicial = {
  fecha: Date;
  valorCuotaparte: number | null;
  valorTotalFondo: number | null;
  cuotapartesTotales: number | null;
};

// guardarValuacion() es upsert por fecha (mismo criterio que el
// importador): un solo form sirve para alta y edición.
export function ValuacionDialog({ trigger, valuacion }: { trigger: ReactNode; valuacion?: ValuacionInicial }) {
  const [open, setOpen] = useState(false);
  const [pending, startTransition] = useTransition();
  const [error, setError] = useState<string | null>(null);
  const esEdicion = !!valuacion;

  function onSubmit(e: FormEvent<HTMLFormElement>) {
    e.preventDefault();
    const formData = new FormData(e.currentTarget);
    setError(null);
    startTransition(async () => {
      const result = await guardarValuacionAction(formData);
      if (result.ok) setOpen(false);
      else setError(result.error);
    });
  }

  const fechaDefault = valuacion ? valuacion.fecha.toISOString().slice(0, 10) : undefined;

  return (
    <Dialog
      open={open}
      onOpenChange={(next) => {
        if (pending) return;
        setOpen(next);
        if (!next) setError(null);
      }}
    >
      <DialogTrigger asChild>{trigger}</DialogTrigger>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>{esEdicion ? "Editar valuación" : "Nueva valuación"}</DialogTitle>
          <DialogDescription>Valor de cuotaparte y estado del fondo para una fecha de corte.</DialogDescription>
        </DialogHeader>
        <form id="valuacion-form" onSubmit={onSubmit} className="space-y-4">
          <div className="space-y-1.5">
            <Label htmlFor="fecha">Fecha de corte</Label>
            <Input
              id="fecha"
              name="fecha"
              type="date"
              defaultValue={fechaDefault}
              required
              readOnly={esEdicion}
              disabled={pending}
            />
          </div>
          <div className="space-y-1.5">
            <Label htmlFor="valorCuotaparte">Valor de la cuotaparte</Label>
            <Input
              id="valorCuotaparte"
              name="valorCuotaparte"
              type="number"
              step="0.000001"
              min="0.000001"
              defaultValue={valuacion?.valorCuotaparte ?? undefined}
              required
              disabled={pending}
            />
          </div>
          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-1.5">
              <Label htmlFor="valorTotalFondo">Valor total del fondo</Label>
              <Input
                id="valorTotalFondo"
                name="valorTotalFondo"
                type="number"
                step="0.01"
                min="0.01"
                defaultValue={valuacion?.valorTotalFondo ?? undefined}
                required
                disabled={pending}
              />
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="cuotapartesTotales">Cuotapartes totales</Label>
              <Input
                id="cuotapartesTotales"
                name="cuotapartesTotales"
                type="number"
                step="0.000001"
                min="0.000001"
                defaultValue={valuacion?.cuotapartesTotales ?? undefined}
                required
                disabled={pending}
              />
            </div>
          </div>
          {error && (
            <Alert variant="destructive">
              <AlertDescription>{error}</AlertDescription>
            </Alert>
          )}
        </form>
        <DialogFooter>
          <Button variant="outline" onClick={() => setOpen(false)} disabled={pending}>
            Volver
          </Button>
          <Button type="submit" form="valuacion-form" disabled={pending}>
            {pending ? "Guardando..." : esEdicion ? "Guardar cambios" : "Crear valuación"}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
