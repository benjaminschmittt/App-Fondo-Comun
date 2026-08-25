"use client";

import { eliminarMovimientoAction } from "./actions";
import { MovimientoDialog } from "./movimiento-dialog";
import { Button } from "@/components/ui/button";
import { ConfirmDialog } from "@/components/confirm-dialog";
import { money, fechaLarga } from "@/lib/theme";
import { Pencil, Trash2 } from "lucide-react";

type Movimiento = {
  id: string;
  clienteNombre: string;
  fecha: Date;
  tipo: "aporte" | "retiro";
  monto: number;
};

export function MovimientoRowActions({ movimiento }: { movimiento: Movimiento }) {
  return (
    <div className="flex justify-end gap-1.5">
      <MovimientoDialog
        movimiento={movimiento}
        trigger={
          <Button variant="outline" size="icon-sm" aria-label="Editar movimiento">
            <Pencil />
          </Button>
        }
      />
      <ConfirmDialog
        trigger={
          <Button variant="outline" size="icon-sm" className="text-neg hover:text-neg" aria-label="Eliminar movimiento">
            <Trash2 />
          </Button>
        }
        title="Eliminar movimiento"
        description="Esta acción no se puede deshacer."
        confirmLabel="Eliminar"
        confirmPendingLabel="Eliminando..."
        destructive
        onConfirm={() => eliminarMovimientoAction(movimiento.id)}
      >
        <div className="text-[13.5px] text-foreground">
          {movimiento.clienteNombre} · {movimiento.tipo === "aporte" ? "Aporte" : "Retiro"} de{" "}
          <strong className="tnum">{money(movimiento.monto)}</strong> el {fechaLarga(movimiento.fecha)}
        </div>
      </ConfirmDialog>
    </div>
  );
}
