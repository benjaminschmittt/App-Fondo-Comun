"use client";

import { useState, type ReactNode } from "react";
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
import { Alert, AlertDescription } from "@/components/ui/alert";

// Reemplaza confirm()/window.confirm() en toda la app: el dialogo nativo
// queda suprimido en algunos entornos (embebidos, ciertas extensiones) y
// ahi confirm() devuelve false en silencio — el boton parece no hacer
// nada, sin ningun error visible. Este dialogo propio siempre se ve y
// siempre responde.
export function ConfirmDialog({
  trigger,
  title,
  description,
  confirmLabel,
  confirmPendingLabel = "Procesando...",
  destructive,
  onConfirm,
  children,
}: {
  trigger: ReactNode;
  title: string;
  description: string;
  confirmLabel: string;
  confirmPendingLabel?: string;
  destructive?: boolean;
  onConfirm: () => Promise<{ ok: boolean; error?: string }>;
  children?: ReactNode;
}) {
  const [open, setOpen] = useState(false);
  const [pending, setPending] = useState(false);
  const [error, setError] = useState<string | null>(null);

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
          <DialogTitle>{title}</DialogTitle>
          <DialogDescription>{description}</DialogDescription>
        </DialogHeader>
        {children}
        {error && (
          <Alert variant="destructive">
            <AlertDescription>{error}</AlertDescription>
          </Alert>
        )}
        <DialogFooter>
          <Button variant="outline" onClick={() => setOpen(false)} disabled={pending}>
            Volver
          </Button>
          <Button
            variant={destructive ? "destructive" : "default"}
            disabled={pending}
            onClick={async () => {
              setPending(true);
              setError(null);
              const result = await onConfirm();
              setPending(false);
              if (result.ok) setOpen(false);
              else setError(result.error ?? "No se pudo completar la acción.");
            }}
          >
            {pending ? confirmPendingLabel : confirmLabel}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
