import type { Metadata } from "next";
import Link from "next/link";
import { ArrowLeft } from "lucide-react";
import { notFound } from "next/navigation";
import { obtenerPeriodo } from "@/data/comisiones";
import { money, numero, fechaLarga } from "@/lib/theme";
import { SectionCard } from "@/components/section-card";
import { DataTable, type DataTableColumn } from "@/components/data-table";
import { StatusBadge } from "@/components/status-badge";
import { PeriodoHeaderActions } from "./periodo-header-actions";
import { CalculoRowActions } from "./calculo-row-actions";

export const metadata: Metadata = { title: "Período de comisión" };

const ESTADO_TONE = {
  draft: "muted",
  calculated: "warn",
  applied: "pos",
  cancelled: "neg",
} as const;

const ESTADO_LABEL = {
  draft: "Borrador",
  calculated: "Calculado",
  applied: "Aplicado",
  cancelled: "Cancelado",
} as const;

type Calculo = Awaited<ReturnType<typeof obtenerPeriodo>> extends { calculations: (infer C)[] } | null
  ? C
  : never;

export default async function ComisionPeriodoPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  const periodo = await obtenerPeriodo(id);
  if (!periodo) notFound();

  const aprobados = periodo.calculations.filter((c) => c.status === "approved");
  const resumenAplicar = {
    clientes: aprobados.length,
    totalFee: aprobados.reduce((s, c) => s + c.feeAmount.toNumber(), 0),
    totalCuotapartes: aprobados.reduce((s, c) => s + c.sharesToTransfer.toNumber(), 0),
  };

  const columns: DataTableColumn<Calculo>[] = [
    {
      key: "cliente",
      header: "Cliente",
      render: (c) => (
        <>
          <strong className="text-foreground">{c.client.nombre}</strong>{" "}
          <span className="text-muted-foreground">· {c.client.clienteId}</span>
        </>
      ),
    },
    {
      key: "valorActual",
      header: "Valor actual",
      align: "right",
      render: (c) => money(c.currentValue.toNumber()),
    },
    {
      key: "hwmAnterior",
      header: "Marca anterior",
      align: "right",
      render: (c) => (
        <span className="text-muted-foreground">{money(c.previousHighWaterMark.toNumber())}</span>
      ),
    },
    {
      key: "hwmAjustada",
      header: "Marca ajustada",
      align: "right",
      render: (c) => (
        <span className="text-muted-foreground">{money(c.adjustedHighWaterMark.toNumber())}</span>
      ),
    },
    {
      key: "ganancia",
      header: "Ganancia gravable",
      align: "right",
      render: (c) => {
        const g = c.gainAboveHwm.toNumber();
        return <span className={g > 0 ? "text-pos" : "text-muted-foreground"}>{money(g)}</span>;
      },
    },
    {
      key: "fee",
      header: "Comisión",
      align: "right",
      render: (c) => <strong className="tnum">{money(c.feeAmount.toNumber())}</strong>,
    },
    {
      key: "cuotapartes",
      header: "Cuotapartes",
      align: "right",
      render: (c) => (
        <span className="text-muted-foreground">{numero(c.sharesToTransfer.toNumber(), 4)}</span>
      ),
    },
    {
      key: "accion",
      header: "",
      align: "right",
      render: (c) => (
        <CalculoRowActions calculationId={c.id} feePeriodId={periodo.id} status={c.status} />
      ),
    },
  ];

  return (
    <div className="fade-up space-y-5">
      <h1 className="sr-only">Panel administrador — Período de comisión</h1>
      <Link
        href="/admin/comisiones"
        className="inline-flex items-center gap-1.5 text-[13px] font-semibold text-muted-foreground hover:text-foreground"
      >
        <ArrowLeft size={14} /> Volver a Comisiones
      </Link>
      <SectionCard
        title={`${fechaLarga(periodo.periodStart)} — ${fechaLarga(periodo.periodEnd)}`}
        action={<PeriodoHeaderActions
          feePeriodId={periodo.id}
          status={periodo.status}
          yaHayAprobados={aprobados.length > 0}
          resumenAplicar={resumenAplicar}
        />}
      >
        <div className="flex flex-wrap items-center gap-3 text-[13.5px] text-muted-foreground">
          <StatusBadge tone={ESTADO_TONE[periodo.status]}>{ESTADO_LABEL[periodo.status]}</StatusBadge>
          <span>Fee: {numero(periodo.feeRate.toNumber() * 100, 1)}%</span>
          <span>Creado: {fechaLarga(periodo.createdAt)}</span>
          {periodo.appliedAt && <span>Aplicado: {fechaLarga(periodo.appliedAt)}</span>}
        </div>
      </SectionCard>

      <SectionCard title={`Clientes (${periodo.calculations.length})`}>
        <DataTable
          columns={columns}
          rows={periodo.calculations}
          rowKey={(c) => c.id}
          emptyTitle="Sin calcular todavía"
          emptyDescription="Usá «Calcular comisiones sugeridas» para generar la lista de clientes de este período."
        />
      </SectionCard>
    </div>
  );
}
