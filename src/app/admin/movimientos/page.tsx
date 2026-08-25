import type { Metadata } from "next";
import { prisma } from "@/lib/prisma";
import { getDefaultFundId } from "@/data/fondo";
import { listarMovimientos } from "@/data/movimientos";
import { fechaLarga, money } from "@/lib/theme";
import { SectionCard } from "@/components/section-card";
import { DataTable, type DataTableColumn } from "@/components/data-table";
import { StatusBadge } from "@/components/status-badge";
import { MovimientoDialog } from "./movimiento-dialog";
import { MovimientoRowActions } from "./movimiento-row-actions";
import { Button } from "@/components/ui/button";
import { Plus } from "lucide-react";

export const metadata: Metadata = { title: "Movimientos" };

type Movimiento = Awaited<ReturnType<typeof listarMovimientos>>[number];

export default async function MovimientosPage() {
  const fundId = await getDefaultFundId();
  const [movimientos, clientes] = await Promise.all([
    listarMovimientos(fundId),
    prisma.client.findMany({ orderBy: { nombre: "asc" }, select: { id: true, nombre: true, clienteId: true } }),
  ]);

  const columns: DataTableColumn<Movimiento>[] = [
    {
      key: "cliente",
      header: "Cliente",
      render: (m) => (
        <div>
          <div className="font-semibold text-foreground">{m.client.nombre}</div>
          <div className="text-xs text-muted-foreground">{m.client.clienteId}</div>
        </div>
      ),
    },
    { key: "fecha", header: "Fecha", render: (m) => <span className="tnum">{fechaLarga(m.fecha)}</span> },
    {
      key: "tipo",
      header: "Tipo",
      render: (m) => <StatusBadge tone={m.tipo === "aporte" ? "pos" : "neg"}>{m.tipo}</StatusBadge>,
    },
    {
      key: "monto",
      header: "Monto",
      align: "right",
      render: (m) => <span className="tnum">{money(m.monto.toNumber())}</span>,
    },
    {
      key: "acciones",
      header: "",
      align: "right",
      render: (m) => (
        <MovimientoRowActions
          movimiento={{ id: m.id, clienteNombre: m.client.nombre, fecha: m.fecha, tipo: m.tipo, monto: m.monto.toNumber() }}
        />
      ),
    },
  ];

  return (
    <div className="fade-up space-y-5">
      <h1 className="sr-only">Panel administrador — Movimientos</h1>
      <SectionCard
        title={`Aportes y retiros (${movimientos.length})`}
        action={
          <MovimientoDialog
            clientes={clientes}
            trigger={
              <Button size="sm" className="gap-1.5">
                <Plus size={14} /> Nuevo movimiento
              </Button>
            }
          />
        }
      >
        <DataTable
          columns={columns}
          rows={movimientos}
          rowKey={(m) => m.id}
          emptyTitle="Sin movimientos"
          emptyDescription="Todavía no hay aportes ni retiros cargados."
        />
      </SectionCard>
    </div>
  );
}
