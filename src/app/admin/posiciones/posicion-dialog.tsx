"use client";

import { useState, useTransition, type FormEvent, type ReactNode } from "react";
import { crearPosicionAction, editarPosicionAction } from "./actions";
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

type PosicionInicial = {
  id: string;
  fecha: Date;
  ticker: string;
  nombre: string;
  tipoInstrumento: string;
  sector: string;
  cantidad: number;
  precio: number;
};

export function PosicionDialog({ trigger, posicion }: { trigger: ReactNode; posicion?: PosicionInicial }) {
  const [open, setOpen] = useState(false);
  const [pending, startTransition] = useTransition();
  const [error, setError] = useState<string | null>(null);
  const esEdicion = !!posicion;

  function onSubmit(e: FormEvent<HTMLFormElement>) {
    e.preventDefault();
    const formData = new FormData(e.currentTarget);
    setError(null);
    startTransition(async () => {
      const result = esEdicion
        ? await editarPosicionAction(posicion.id, formData)
        : await crearPosicionAction(formData);
      if (result.ok) setOpen(false);
      else setError(result.error);
    });
  }

  const fechaDefault = posicion ? posicion.fecha.toISOString().slice(0, 10) : undefined;

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
          <DialogTitle>{esEdicion ? "Editar posición" : "Nueva posición"}</DialogTitle>
          <DialogDescription>
            El valor de mercado se calcula automáticamente (cantidad × precio).
          </DialogDescription>
        </DialogHeader>
        <form id="posicion-form" onSubmit={onSubmit} className="space-y-4">
          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-1.5">
              <Label htmlFor="fecha">Fecha de corte</Label>
              <Input id="fecha" name="fecha" type="date" defaultValue={fechaDefault} required disabled={pending} />
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="ticker">Ticker</Label>
              <Input id="ticker" name="ticker" defaultValue={posicion?.ticker} required disabled={pending} />
            </div>
          </div>
          <div className="space-y-1.5">
            <Label htmlFor="nombre">Nombre</Label>
            <Input id="nombre" name="nombre" defaultValue={posicion?.nombre} required disabled={pending} />
          </div>
          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-1.5">
              <Label htmlFor="tipoInstrumento">Tipo de instrumento</Label>
              <Input id="tipoInstrumento" name="tipoInstrumento" defaultValue={posicion?.tipoInstrumento} required disabled={pending} />
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="sector">Sector</Label>
              <Input id="sector" name="sector" defaultValue={posicion?.sector} required disabled={pending} />
            </div>
          </div>
          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-1.5">
              <Label htmlFor="cantidad">Cantidad</Label>
              <Input id="cantidad" name="cantidad" type="number" step="0.0001" min="0.0001" defaultValue={posicion?.cantidad} required disabled={pending} />
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="precio">Precio</Label>
              <Input id="precio" name="precio" type="number" step="0.0001" min="0" defaultValue={posicion?.precio} required disabled={pending} />
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
          <Button type="submit" form="posicion-form" disabled={pending}>
            {pending ? "Guardando..." : esEdicion ? "Guardar cambios" : "Crear posición"}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
