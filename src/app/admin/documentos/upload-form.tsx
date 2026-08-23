"use client";

import { useActionState } from "react";
import { FileText } from "lucide-react";
import { subirDocumento, type ActionResult } from "./actions";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { UploadCard } from "@/components/upload-card";

const initialState: ActionResult | undefined = undefined;

export function UploadForm() {
  const [state, formAction, pending] = useActionState(subirDocumento, initialState);

  return (
    <div className="space-y-4">
      <form action={formAction} className="space-y-4">
        <div className="space-y-1.5">
          <Label htmlFor="nombre">Nombre del documento</Label>
          <Input
            id="nombre"
            name="nombre"
            placeholder="Ej: Estado de cuenta - Julio 2026"
            required
            disabled={pending}
          />
        </div>
        <UploadCard
          name="archivo"
          accept="application/pdf"
          required
          disabled={pending}
          title="Arrastrá el PDF aquí"
          hint="o hacé click para elegirlo — solo .pdf"
          selectedIcon={FileText}
        />
        <Button type="submit" disabled={pending}>
          {pending ? "Subiendo..." : "Subir documento"}
        </Button>
      </form>

      {state && !state.ok && (
        <Alert variant="destructive">
          <AlertDescription>{state.error}</AlertDescription>
        </Alert>
      )}

      {state?.ok && (
        <Alert className="border-pos/30 bg-pos-soft text-pos [&_[data-slot=alert-description]]:text-pos">
          <AlertDescription>Documento subido correctamente.</AlertDescription>
        </Alert>
      )}
    </div>
  );
}
