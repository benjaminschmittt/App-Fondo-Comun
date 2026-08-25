"use client";

import { eliminarPosicionAction } from "./actions";
import { PosicionDialog } from "./posicion-dialog";
import { Button } from "@/components/ui/button";
import { ConfirmDialog } from "@/components/confirm-dialog";
import { money, fechaLarga } from "@/lib/theme";
import { Pencil, Trash2 } from "lucide-react";

type Posicion = {
  id: string;
  fecha: Date;
  ticker: string;
  nombre: string;
  tipoInstrumento: string;
  sector: string;
  cantidad: number;
  precio: number;
  valorMercado: number;
};

export function PosicionRowActions({ posicion }: { posicion: Posicion }) {
  return (
    <div className="flex justify-end gap-1.5">
      <PosicionDialog
        posicion={posicion}
        trigger={
          <Button variant="outline" size="icon-sm" aria-label="Editar posición">
            <Pencil />
          </Button>
        }
      />
      <ConfirmDialog
        trigger={
          <Button variant="outline" size="icon-sm" className="text-neg hover:text-neg" aria-label="Eliminar posición">
            <Trash2 />
          </Button>
        }
        title="Eliminar posición"
        description="Esta acción no se puede deshacer."
        confirmLabel="Eliminar"
        confirmPendingLabel="Eliminando..."
        destructive
        onConfirm={() => eliminarPosicionAction(posicion.id)}
      >
        <div className="text-[13.5px] text-foreground">
          {posicion.ticker} · {posicion.nombre} · <strong className="tnum">{money(posicion.valorMercado)}</strong> el{" "}
          {fechaLarga(posicion.fecha)}
        </div>
      </ConfirmDialog>
    </div>
  );
}
