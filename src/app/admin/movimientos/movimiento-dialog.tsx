"use client";

import { useState, useTransition, type FormEvent, type ReactNode } from "react";
import { crearMovimientoAction, editarMovimientoAction } from "./actions";
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

const selectClass =
  "flex h-10 w-full rounded-lg border border-border bg-background px-3 text-sm outline-none focus-visible:border-ring focus-visible:ring-3 focus-visible:ring-ring/50 disabled:pointer-events-none disabled:opacity-50";

type ClienteOpcion = { id: string; nombre: string; clienteId: string };
type MovimientoInicial = { id: string; clienteNombre: string; fecha: Date; tipo: "aporte" | "retiro"; monto: number };

export function MovimientoDialog({
  trigger,
  clientes,
  movimiento,
}: {
  trigger: ReactNode;
  clientes?: ClienteOpcion[];
  movimiento?: MovimientoInicial;
}) {
  const [open, setOpen] = useState(false);
  const [pending, startTransition] = useTransition();
  const [error, setError] = useState<string | null>(null);
  const esEdicion = !!movimiento;

  function onSubmit(e: FormEvent<HTMLFormElement>) {
    e.preventDefault();
    const formData = new FormData(e.currentTarget);
    setError(null);
    startTransition(async () => {
      const result = esEdicion
        ? await editarMovimientoAction(movimiento.id, formData)
        : await crearMovimientoAction(formData);
      if (result.ok) setOpen(false);
      else setError(result.error);
    });
  }

  const fechaDefault = movimiento ? movimiento.fecha.toISOString().slice(0, 10) : undefined;

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
          <DialogTitle>{esEdicion ? "Editar movimiento" : "Nuevo movimiento"}</DialogTitle>
          <DialogDescription>
            {esEdicion
              ? `Cliente: ${movimiento.clienteNombre}`
              : "Registra un aporte o retiro para un cliente."}
          </DialogDescription>
        </DialogHeader>
        <form id="movimiento-form" onSubmit={onSubmit} className="space-y-4">
          {!esEdicion && (
            <div className="space-y-1.5">
              <Label htmlFor="clientId">Cliente</Label>
              <select id="clientId" name="clientId" required disabled={pending} defaultValue="" className={selectClass}>
                <option value="" disabled>
                  Elegí un cliente
                </option>
                {clientes?.map((c) => (
                  <option key={c.id} value={c.id}>
                    {c.nombre} ({c.clienteId})
                  </option>
                ))}
              </select>
            </div>
          )}
          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-1.5">
              <Label htmlFor="fecha">Fecha</Label>
              <Input id="fecha" name="fecha" type="date" defaultValue={fechaDefault} required disabled={pending} />
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="tipo">Tipo</Label>
              <select id="tipo" name="tipo" required disabled={pending} defaultValue={movimiento?.tipo ?? "aporte"} className={selectClass}>
                <option value="aporte">Aporte</option>
                <option value="retiro">Retiro</option>
              </select>
            </div>
          </div>
          <div className="space-y-1.5">
            <Label htmlFor="monto">Monto</Label>
            <Input
              id="monto"
              name="monto"
              type="number"
              step="0.01"
              min="0.01"
              defaultValue={movimiento?.monto}
              required
              disabled={pending}
            />
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
          <Button type="submit" form="movimiento-form" disabled={pending}>
            {pending ? "Guardando..." : esEdicion ? "Guardar cambios" : "Crear movimiento"}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
