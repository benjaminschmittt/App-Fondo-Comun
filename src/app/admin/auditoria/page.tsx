import type { Metadata } from "next";
import { listarAuditoria, listarAccionesAuditadas } from "@/data/audit";
import { SectionCard } from "@/components/section-card";
import { DataTable, type DataTableColumn } from "@/components/data-table";

export const metadata: Metadata = { title: "Auditoría" };

type LogEntry = Awaited<ReturnType<typeof listarAuditoria>>[number];

const selectClass =
  "flex h-10 w-full rounded-lg border border-border bg-background px-3 text-sm outline-none focus-visible:border-ring focus-visible:ring-3 focus-visible:ring-ring/50";

export default async function AuditoriaPage({
  searchParams,
}: {
  searchParams: Promise<{ accion?: string }>;
}) {
  const { accion } = await searchParams;
  const [logs, acciones] = await Promise.all([
    listarAuditoria({ accion: accion || undefined }),
    listarAccionesAuditadas(),
  ]);

  const columns: DataTableColumn<LogEntry>[] = [
    {
      key: "fecha",
      header: "Fecha",
      render: (l) => (
        <span className="tnum text-muted-foreground">
          {l.creadoEn.toLocaleDateString("es-AR")} {l.creadoEn.toLocaleTimeString("es-AR")}
        </span>
      ),
    },
    { key: "actor", header: "Actor", render: (l) => <span className="text-foreground">{l.actorEmail}</span> },
    {
      key: "accion",
      header: "Acción",
      render: (l) => <span className="font-semibold text-foreground">{l.accion}</span>,
    },
    {
      key: "entidad",
      header: "Entidad",
      render: (l) => (
        <span className="text-muted-foreground">
          {l.entidad ?? "—"}
          {l.entidadId ? ` · ${l.entidadId.slice(0, 8)}` : ""}
        </span>
      ),
    },
    {
      key: "detalle",
      header: "Detalle",
      render: (l) => (
        <span className="block max-w-xs truncate text-xs text-muted-foreground" title={JSON.stringify(l.detalle)}>
          {l.detalle ? JSON.stringify(l.detalle) : "—"}
        </span>
      ),
    },
  ];

  return (
    <div className="fade-up space-y-5">
      <h1 className="sr-only">Panel administrador — Auditoría</h1>
      <SectionCard title={`Historial de auditoría (${logs.length}${logs.length === 100 ? "+" : ""})`}>
        <form method="get" className="mb-4 flex items-center gap-2">
          <select name="accion" defaultValue={accion ?? ""} className={selectClass} style={{ maxWidth: 260 }}>
            <option value="">Todas las acciones</option>
            {acciones.map((a) => (
              <option key={a} value={a}>
                {a}
              </option>
            ))}
          </select>
          <button
            type="submit"
            className="h-10 rounded-lg border border-border bg-background px-3.5 text-sm font-semibold hover:bg-muted"
          >
            Filtrar
          </button>
        </form>
        <DataTable
          columns={columns}
          rows={logs}
          rowKey={(l) => l.id}
          emptyTitle="Sin registros"
          emptyDescription="No hay acciones auditadas todavía con este filtro."
        />
      </SectionCard>
    </div>
  );
}
