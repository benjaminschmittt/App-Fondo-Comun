"use client";

import { useActionState } from "react";
import { subirExcel, type UploadState } from "./actions";
import type { ImportError } from "@/lib/excel/validate";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { Button } from "@/components/ui/button";
import { UploadCard } from "@/components/upload-card";
import { DataTable, type DataTableColumn } from "@/components/data-table";

const initialState: UploadState = undefined;

const errorColumns: DataTableColumn<ImportError & { idx: number }>[] = [
  { key: "hoja", header: "Hoja", render: (e) => e.hoja },
  { key: "fila", header: "Fila", render: (e) => e.fila || "-" },
  { key: "columna", header: "Columna", render: (e) => e.columna ?? "-" },
  { key: "motivo", header: "Motivo", render: (e) => e.motivo },
];

export function UploadForm() {
  const [state, formAction, pending] = useActionState(subirExcel, initialState);

  return (
    <div className="space-y-5">
      <form action={formAction} className="space-y-4">
        <UploadCard name="archivo" accept=".xlsx" required disabled={pending} />
        <Button type="submit" disabled={pending}>
          {pending ? "Procesando..." : "Importar"}
        </Button>
      </form>

      {state && !state.ok && (
        <div className="space-y-3">
          <Alert variant="destructive">
            <AlertDescription>
              Se encontraron {state.errors.length} error(es). No se modificó la base de datos.
            </AlertDescription>
          </Alert>
          <DataTable
            columns={errorColumns}
            rows={state.errors.map((e, idx) => ({ ...e, idx }))}
            rowKey={(e) => e.idx}
          />
        </div>
      )}

      {state?.ok && (
        <Alert className="border-pos/30 bg-pos-soft text-pos [&_[data-slot=alert-description]]:text-pos">
          <AlertDescription>
            Importación exitosa: {state.resumen.clientes} clientes, {state.resumen.historicoCuotaparte}{" "}
            fechas de cuotaparte, {state.resumen.posiciones} posiciones, {state.resumen.movimientos}{" "}
            movimientos.
          </AlertDescription>
        </Alert>
      )}
    </div>
  );
}
