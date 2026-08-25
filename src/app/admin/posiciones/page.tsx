import type { Metadata } from "next";
import { getDefaultFundId } from "@/data/fondo";
import { listarPosiciones } from "@/data/posiciones";
import { fechaLarga, money, numero } from "@/lib/theme";
import { SectionCard } from "@/components/section-card";
import { DataTable, type DataTableColumn } from "@/components/data-table";
import { PosicionDialog } from "./posicion-dialog";
import { PosicionRowActions } from "./posicion-row-actions";
import { Button } from "@/components/ui/button";
import { Plus } from "lucide-react";

export const metadata: Metadata = { title: "Posiciones" };

type Posicion = Awaited<ReturnType<typeof listarPosiciones>>[number];

export default async function PosicionesPage() {
  const fundId = await getDefaultFundId();
  const posiciones = await listarPosiciones(fundId);

  const columns: DataTableColumn<Posicion>[] = [
    { key: "fecha", header: "Fecha de corte", render: (p) => <span className="tnum">{fechaLarga(p.fecha)}</span> },
    {
      key: "ticker",
      header: "Instrumento",
      render: (p) => (
        <div>
          <div className="font-semibold text-foreground">{p.ticker}</div>
          <div className="text-xs text-muted-foreground">{p.nombre}</div>
        </div>
      ),
    },
    { key: "tipo", header: "Tipo", render: (p) => <span className="text-muted-foreground">{p.tipoInstrumento}</span> },
    { key: "sector", header: "Sector", render: (p) => <span className="text-muted-foreground">{p.sector}</span> },
    { key: "cantidad", header: "Cantidad", align: "right", render: (p) => <span className="tnum">{numero(p.cantidad.toNumber(), 4)}</span> },
    { key: "precio", header: "Precio", align: "right", render: (p) => <span className="tnum">{money(p.precio.toNumber(), 2)}</span> },
    { key: "valorMercado", header: "Valor de mercado", align: "right", render: (p) => <span className="tnum">{money(p.valorMercado.toNumber())}</span> },
    {
      key: "acciones",
      header: "",
      align: "right",
      render: (p) => (
        <PosicionRowActions
          posicion={{
            id: p.id,
            fecha: p.fecha,
            ticker: p.ticker,
            nombre: p.nombre,
            tipoInstrumento: p.tipoInstrumento,
            sector: p.sector,
            cantidad: p.cantidad.toNumber(),
            precio: p.precio.toNumber(),
            valorMercado: p.valorMercado.toNumber(),
          }}
        />
      ),
    },
  ];

  return (
    <div className="fade-up space-y-5">
      <h1 className="sr-only">Panel administrador — Posiciones</h1>
      <SectionCard
        title={`Posiciones (${posiciones.length})`}
        action={
          <PosicionDialog
            trigger={
              <Button size="sm" className="gap-1.5">
                <Plus size={14} /> Nueva posición
              </Button>
            }
          />
        }
      >
        <DataTable
          columns={columns}
          rows={posiciones}
          rowKey={(p) => p.id}
          emptyTitle="Sin posiciones"
          emptyDescription="Todavía no hay posiciones cargadas."
        />
      </SectionCard>
    </div>
  );
}
