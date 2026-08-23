"use client";

import { useState, useTransition } from "react";
import { Download } from "lucide-react";
import { obtenerUrlDescargaCliente } from "./actions";
import { Button } from "@/components/ui/button";

export function DocumentDownloadButton({ id, nombre }: { id: string; nombre: string }) {
  const [pending, startTransition] = useTransition();
  const [error, setError] = useState<string | null>(null);

  return (
    <div className="flex flex-col items-end gap-1">
      <Button
        variant="outline"
        size="icon-sm"
        disabled={pending}
        aria-label={`Descargar ${nombre}`}
        onClick={() => {
          setError(null);
          startTransition(async () => {
            const url = await obtenerUrlDescargaCliente(id);
            if (url) window.open(url, "_blank");
            else setError("No se pudo generar el enlace de descarga.");
          });
        }}
      >
        <Download />
      </Button>
      {error && <span className="text-[11px] text-neg">{error}</span>}
    </div>
  );
}
