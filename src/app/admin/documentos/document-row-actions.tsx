"use client";

import { useState, useTransition } from "react";
import { Download, Trash2 } from "lucide-react";
import { eliminarDocumento, obtenerUrlDescargaAdmin } from "./actions";
import { Button } from "@/components/ui/button";
import { ConfirmDialog } from "@/components/confirm-dialog";

export function DocumentRowActions({ id, nombre }: { id: string; nombre: string }) {
  const [pending, startTransition] = useTransition();
  const [error, setError] = useState<string | null>(null);

  return (
    <div className="flex flex-col items-end gap-1">
      <div className="flex justify-end gap-1.5">
        <Button
          variant="outline"
          size="icon-sm"
          disabled={pending}
          aria-label={`Descargar ${nombre}`}
          onClick={() => {
            setError(null);
            startTransition(async () => {
              const url = await obtenerUrlDescargaAdmin(id);
              if (url) window.open(url, "_blank");
              else setError("No se pudo generar el enlace de descarga.");
            });
          }}
        >
          <Download />
        </Button>
        <ConfirmDialog
          trigger={
            <Button
              variant="outline"
              size="icon-sm"
              aria-label={`Eliminar ${nombre}`}
              className="text-neg hover:text-neg"
            >
              <Trash2 />
            </Button>
          }
          title="Eliminar documento"
          description={`¿Eliminar "${nombre}"? Esta acción no se puede deshacer.`}
          confirmLabel="Eliminar"
          confirmPendingLabel="Eliminando..."
          destructive
          onConfirm={() => eliminarDocumento(id)}
        />
      </div>
      {error && <span className="text-[11px] text-neg">{error}</span>}
    </div>
  );
}
