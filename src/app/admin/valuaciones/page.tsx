import type { Metadata } from "next";
import { getDefaultFundId } from "@/data/fondo";
import { listarValuaciones } from "@/data/valuaciones";
import { fechaLarga, money, numero } from "@/lib/theme";
import { SectionCard } from "@/components/section-card";
import { DataTable, type DataTableColumn } from "@/components/data-table";
import { ValuacionDialog } from "./valuacion-dialog";
import { ValuacionRowActions } from "./valuacion-row-actions";
import { Button } from "@/components/ui/button";
import { Plus } from "lucide-react";

export const metadata: Metadata = { title: "Valuaciones" };

type Valuacion = Awaited<ReturnType<typeof listarValuaciones>>[number];

export default async function ValuacionesPage() {
  const fundId = await getDefaultFundId();
  const valuaciones = await listarValuaciones(fundId);

  const columns: DataTableColumn<Valuacion>[] = [
    { key: "fecha", header: "Fecha de corte", render: (v) => <span className="tnum">{fechaLarga(v.fecha)}</span> },
    {
      key: "valorCuotaparte",
      header: "Valor cuotaparte",
      align: "right",
      render: (v) => <span className="tnum">{v.valorCuotaparte != null ? money(v.valorCuotaparte, 4) : "—"}</span>,
    },
    {
      key: "valorTotalFondo",
      header: "Valor total del fondo",
      align: "right",
      render: (v) => <span className="tnum">{v.valorTotalFondo != null ? money(v.valorTotalFondo) : "—"}</span>,
    },
    {
      key: "cuotapartesTotales",
      header: "Cuotapartes totales",
      align: "right",
      render: (v) => <span className="tnum">{v.cuotapartesTotales != null ? numero(v.cuotapartesTotales, 4) : "—"}</span>,
    },
    {
      key: "acciones",
      header: "",
      align: "right",
      render: (v) => <ValuacionRowActions valuacion={v} />,
    },
  ];

  return (
    <div className="fade-up space-y-5">
      <h1 className="sr-only">Panel administrador — Valuaciones</h1>
      <SectionCard
        title={`Valuaciones (${valuaciones.length})`}
        action={
          <ValuacionDialog
            trigger={
              <Button size="sm" className="gap-1.5">
                <Plus size={14} /> Nueva valuación
              </Button>
            }
          />
        }
      >
        <DataTable
          columns={columns}
          rows={valuaciones}
          rowKey={(v) => v.fecha.toISOString()}
          emptyTitle="Sin valuaciones"
          emptyDescription="Todavía no hay valuaciones cargadas."
        />
      </SectionCard>
    </div>
  );
}
