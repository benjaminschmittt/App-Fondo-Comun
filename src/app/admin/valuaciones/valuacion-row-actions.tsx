"use client";

import { eliminarValuacionAction } from "./actions";
import { ValuacionDialog } from "./valuacion-dialog";
import { Button } from "@/components/ui/button";
import { ConfirmDialog } from "@/components/confirm-dialog";
import { fechaLarga } from "@/lib/theme";
import { Pencil, Trash2 } from "lucide-react";

type Valuacion = {
  fecha: Date;
  valorCuotaparte: number | null;
  valorTotalFondo: number | null;
  cuotapartesTotales: number | null;
};

export function ValuacionRowActions({ valuacion }: { valuacion: Valuacion }) {
  const fechaIso = valuacion.fecha.toISOString().slice(0, 10);

  return (
    <div className="flex justify-end gap-1.5">
      <ValuacionDialog
        valuacion={valuacion}
        trigger={
          <Button variant="outline" size="icon-sm" aria-label="Editar valuación">
            <Pencil />
          </Button>
        }
      />
      <ConfirmDialog
        trigger={
          <Button variant="outline" size="icon-sm" className="text-neg hover:text-neg" aria-label="Eliminar valuación">
            <Trash2 />
          </Button>
        }
        title="Eliminar valuación"
        description="Esta acción no se puede deshacer."
        confirmLabel="Eliminar"
        confirmPendingLabel="Eliminando..."
        destructive
        onConfirm={() => eliminarValuacionAction(fechaIso)}
      >
        <div className="text-[13.5px] text-foreground">Valuación del {fechaLarga(valuacion.fecha)}</div>
      </ConfirmDialog>
    </div>
  );
}
