"use client";

import { useState, useTransition, type FormEvent, type ReactNode } from "react";
import { crearClienteAction, editarClienteAction } from "./actions";
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

type ClienteInicial = { id: string; clienteId: string; nombre: string; email: string; activo: boolean };

export function ClienteDialog({ trigger, cliente }: { trigger: ReactNode; cliente?: ClienteInicial }) {
  const [open, setOpen] = useState(false);
  const [pending, startTransition] = useTransition();
  const [error, setError] = useState<string | null>(null);
  const esEdicion = !!cliente;

  function onSubmit(e: FormEvent<HTMLFormElement>) {
    e.preventDefault();
    const formData = new FormData(e.currentTarget);
    setError(null);
    startTransition(async () => {
      const result = esEdicion
        ? await editarClienteAction(cliente.id, formData)
        : await crearClienteAction(formData);
      if (result.ok) setOpen(false);
      else setError(result.error);
    });
  }

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
          <DialogTitle>{esEdicion ? "Editar cliente" : "Nuevo cliente"}</DialogTitle>
          <DialogDescription>
            {esEdicion ? "Actualizá los datos del cliente." : "Crea el registro del cliente en la base."}
          </DialogDescription>
        </DialogHeader>
        <form id="cliente-form" onSubmit={onSubmit} className="space-y-4">
          <div className="space-y-1.5">
            <Label htmlFor="clienteId">ID de cliente</Label>
            <Input id="clienteId" name="clienteId" defaultValue={cliente?.clienteId} required disabled={pending} />
          </div>
          <div className="space-y-1.5">
            <Label htmlFor="nombre">Nombre</Label>
            <Input id="nombre" name="nombre" defaultValue={cliente?.nombre} required disabled={pending} />
          </div>
          <div className="space-y-1.5">
            <Label htmlFor="email">Email</Label>
            <Input id="email" name="email" type="email" defaultValue={cliente?.email} required disabled={pending} />
          </div>
          <label className="flex items-center gap-2 text-sm text-foreground">
            <input type="checkbox" name="activo" defaultChecked={cliente?.activo ?? true} disabled={pending} />
            Activo
          </label>
          {!esEdicion && (
            <label className="flex items-center gap-2 text-sm text-foreground">
              <input type="checkbox" name="invitar" defaultChecked disabled={pending} />
              Invitar por email (crea la cuenta de acceso)
            </label>
          )}
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
          <Button type="submit" form="cliente-form" disabled={pending}>
            {pending ? "Guardando..." : esEdicion ? "Guardar cambios" : "Crear cliente"}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
