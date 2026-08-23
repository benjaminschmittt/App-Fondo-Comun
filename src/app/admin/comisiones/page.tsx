import type { Metadata } from "next";
import Link from "next/link";
import { listarPeriodos, fechasDeCorteDisponibles } from "@/data/comisiones";
import { fechaLarga, numero } from "@/lib/theme";
import { SectionCard } from "@/components/section-card";
import { DataTable, type DataTableColumn } from "@/components/data-table";
import { StatusBadge } from "@/components/status-badge";
import { CrearPeriodoForm } from "./crear-periodo-form";

export const metadata: Metadata = { title: "Comisiones" };

type Periodo = Awaited<ReturnType<typeof listarPeriodos>>[number];

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

export default async function ComisionesPage() {
  const [periodos, fechasDeCorte] = await Promise.all([listarPeriodos(), fechasDeCorteDisponibles()]);

  const columns: DataTableColumn<Periodo>[] = [
    {
      key: "periodo",
      header: "Período",
      render: (p) => (
        <span className="font-semibold text-foreground">
          {fechaLarga(p.periodStart)} — {fechaLarga(p.periodEnd)}
        </span>
      ),
    },
    {
      key: "fee",
      header: "Fee",
      align: "right",
      render: (p) => <span className="tnum">{numero(p.feeRate.toNumber() * 100, 1)}%</span>,
    },
    {
      key: "estado",
      header: "Estado",
      render: (p) => <StatusBadge tone={ESTADO_TONE[p.status]}>{ESTADO_LABEL[p.status]}</StatusBadge>,
    },
    {
      key: "creado",
      header: "Creado",
      render: (p) => <span className="text-muted-foreground">{fechaLarga(p.createdAt)}</span>,
    },
    {
      key: "accion",
      header: "",
      align: "right",
      render: (p) => (
        <Link href={`/admin/comisiones/${p.id}`} className="text-sm font-semibold text-accent hover:underline">
          Ver
        </Link>
      ),
    },
  ];

  return (
    <div className="fade-up space-y-5">
      <h1 className="sr-only">Panel administrador — Comisiones</h1>
      <SectionCard title="Nuevo período de comisión">
        {fechasDeCorte.length === 0 ? (
          <p className="text-[13px] text-muted-foreground">
            Todavía no hay ninguna fecha de corte cargada — importá un Excel con la hoja
            «valor_cuotaparte» antes de crear un período.
          </p>
        ) : (
          <CrearPeriodoForm fechasDeCorte={fechasDeCorte} />
        )}
      </SectionCard>

      <SectionCard title={`Períodos (${periodos.length})`}>
        <DataTable
          columns={columns}
          rows={periodos}
          rowKey={(p) => p.id}
          emptyTitle="Sin períodos"
          emptyDescription="Todavía no se creó ningún período de comisión."
        />
      </SectionCard>
    </div>
  );
}
