"use client";

import { useState, useTransition } from "react";
import { calcularPeriodoAction, cancelarPeriodoAction, aplicarPeriodoAction } from "../actions";
import { Button } from "@/components/ui/button";
import { ConfirmDialog } from "@/components/confirm-dialog";
import { money, numero } from "@/lib/theme";

type Estado = "draft" | "calculated" | "applied" | "cancelled";

export function PeriodoHeaderActions({
  feePeriodId,
  status,
  yaHayAprobados,
  resumenAplicar,
}: {
  feePeriodId: string;
  status: Estado;
  yaHayAprobados: boolean;
  resumenAplicar: { clientes: number; totalFee: number; totalCuotapartes: number };
}) {
  const [pending, startTransition] = useTransition();
  const [error, setError] = useState<string | null>(null);

  function run(action: (id: string) => Promise<{ ok: boolean; error?: string }>) {
    setError(null);
    startTransition(async () => {
      const result = await action(feePeriodId);
      if (!result.ok) setError(result.error ?? "No se pudo completar la acción.");
    });
  }

  if (status === "applied" || status === "cancelled") return null;

  return (
    <div className="flex flex-col items-end gap-2">
      <div className="flex flex-wrap items-center justify-end gap-2">
        {status === "draft" && (
          <Button disabled={pending} onClick={() => run(calcularPeriodoAction)}>
            {pending ? "Calculando..." : "Calcular comisiones sugeridas"}
          </Button>
        )}
        {status === "calculated" && !yaHayAprobados && (
          <Button variant="outline" disabled={pending} onClick={() => run(calcularPeriodoAction)}>
            Recalcular
          </Button>
        )}
        {status === "calculated" && (
          <ConfirmDialog
            trigger={<Button disabled={pending || resumenAplicar.clientes === 0}>Confirmar y aplicar</Button>}
            title="Confirmar cobro de comisión"
            description="Esta acción transfiere cuotapartes de verdad, de cada cliente aprobado hacia el gestor. No se puede deshacer desde la app."
            confirmLabel="Aplicar cobro"
            confirmPendingLabel="Aplicando..."
            onConfirm={() => aplicarPeriodoAction(feePeriodId)}
          >
            <div className="space-y-1 text-[13.5px] text-foreground">
              <div>
                <strong className="tnum">{resumenAplicar.clientes}</strong> cliente(s) aprobado(s)
              </div>
              <div>
                Total a cobrar: <strong className="tnum">{money(resumenAplicar.totalFee)}</strong>
              </div>
              <div>
                Cuotapartes a transferir:{" "}
                <strong className="tnum">{numero(resumenAplicar.totalCuotapartes, 4)}</strong>
              </div>
            </div>
          </ConfirmDialog>
        )}
        <ConfirmDialog
          trigger={
            <Button variant="outline" disabled={pending} className="text-neg hover:text-neg">
              Cancelar período
            </Button>
          }
          title="Cancelar período"
          description="El período queda cancelado y no se le va a poder cobrar comisión a ningún cliente en base a este cálculo. No se puede deshacer."
          confirmLabel="Cancelar período"
          confirmPendingLabel="Cancelando..."
          destructive
          onConfirm={() => cancelarPeriodoAction(feePeriodId)}
        />
      </div>
      {error && <span className="text-[11px] text-neg">{error}</span>}
    </div>
  );
}
