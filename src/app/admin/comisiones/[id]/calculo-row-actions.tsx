"use client";

import { useState, useTransition } from "react";
import { aprobarCalculoAction, excluirCalculoAction, revertirCalculoAction } from "../actions";
import { Button } from "@/components/ui/button";
import { StatusBadge } from "@/components/status-badge";

export function CalculoRowActions({
  calculationId,
  feePeriodId,
  status,
}: {
  calculationId: string;
  feePeriodId: string;
  status: "draft" | "approved" | "skipped" | "applied";
}) {
  const [pending, startTransition] = useTransition();
  const [error, setError] = useState<string | null>(null);

  function run(action: (id: string, periodId: string) => Promise<{ ok: boolean; error?: string }>) {
    setError(null);
    startTransition(async () => {
      const result = await action(calculationId, feePeriodId);
      if (!result.ok) setError(result.error ?? "No se pudo actualizar.");
    });
  }

  if (status === "applied") {
    return <StatusBadge tone="pos">Aplicado</StatusBadge>;
  }

  if (status === "approved") {
    return (
      <div className="flex flex-col items-end gap-1">
        <div className="flex items-center gap-2">
          <StatusBadge tone="warn">Aprobado</StatusBadge>
          <Button variant="outline" size="sm" disabled={pending} onClick={() => run(revertirCalculoAction)}>
            Revertir
          </Button>
        </div>
        {error && <span className="text-[11px] text-neg">{error}</span>}
      </div>
    );
  }

  if (status === "skipped") {
    return (
      <div className="flex flex-col items-end gap-1">
        <div className="flex items-center gap-2">
          <StatusBadge tone="muted">Excluido</StatusBadge>
          <Button variant="outline" size="sm" disabled={pending} onClick={() => run(revertirCalculoAction)}>
            Revertir
          </Button>
        </div>
        {error && <span className="text-[11px] text-neg">{error}</span>}
      </div>
    );
  }

  return (
    <div className="flex flex-col items-end gap-1">
      <div className="flex gap-1.5">
        <Button variant="outline" size="sm" disabled={pending} onClick={() => run(aprobarCalculoAction)}>
          Aprobar
        </Button>
        <Button variant="outline" size="sm" disabled={pending} onClick={() => run(excluirCalculoAction)}>
          Excluir
        </Button>
      </div>
      {error && <span className="text-[11px] text-neg">{error}</span>}
    </div>
  );
}
