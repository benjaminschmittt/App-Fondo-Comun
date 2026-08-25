import type { Metadata } from "next";
import { prisma } from "@/lib/prisma";
import { getEmailsConCuenta } from "@/data/admin-users";
import { ultimosReportesGenerados } from "@/data/reportes";
import { fechaLarga } from "@/lib/theme";
import { SectionCard } from "@/components/section-card";
import { DataTable, type DataTableColumn } from "@/components/data-table";
import { StatusBadge } from "@/components/status-badge";
import { EmptyState } from "@/components/empty-state";
import { InviteButton } from "./invite-button";
import { ClienteDialog } from "./cliente-dialog";
import { Button } from "@/components/ui/button";
import { FileDown, FileStack, Pencil, Plus } from "lucide-react";

export const metadata: Metadata = { title: "Clientes" };

type Cliente = Awaited<ReturnType<typeof prisma.client.findMany>>[number];

export default async function AdminPage() {
  const [ultimaImportacion, clientes, emailsConCuenta] = await Promise.all([
    prisma.importBatch.findFirst({ orderBy: { importadoEn: "desc" } }),
    prisma.client.findMany({ orderBy: { nombre: "asc" } }),
    getEmailsConCuenta(),
  ]);
  const ultimosReportes = await ultimosReportesGenerados(clientes.map((c) => c.id));

  const columns: DataTableColumn<Cliente>[] = [
    { key: "id", header: "ID", render: (c) => <span className="text-muted-foreground">{c.clienteId}</span> },
    { key: "nombre", header: "Nombre", render: (c) => <span className="font-semibold text-foreground">{c.nombre}</span> },
    { key: "email", header: "Email", render: (c) => <span className="text-muted-foreground">{c.email}</span> },
    {
      key: "activo",
      header: "Activo",
      render: (c) => <StatusBadge tone={c.activo ? "pos" : "neg"}>{c.activo ? "Si" : "No"}</StatusBadge>,
    },
    {
      key: "cuenta",
      header: "Cuenta",
      render: (c) => {
        const tieneCuenta = emailsConCuenta.has(c.email.toLowerCase());
        return (
          <StatusBadge tone={tieneCuenta ? "pos" : "muted"}>
            {tieneCuenta ? "Vinculada" : "Sin invitar"}
          </StatusBadge>
        );
      },
    },
    {
      key: "ultimoReporte",
      header: "Último reporte",
      render: (c) => {
        const fecha = ultimosReportes.get(c.id);
        return (
          <span className="text-muted-foreground">{fecha ? fechaLarga(fecha) : "Nunca"}</span>
        );
      },
    },
    {
      key: "reporte",
      header: "",
      align: "right",
      render: (c) => (
        <Button variant="outline" size="icon-sm" asChild aria-label={`Descargar reporte de ${c.nombre}`}>
          <a href={`/admin/reportes/${c.id}`} download>
            <FileDown />
          </a>
        </Button>
      ),
    },
    {
      key: "accion",
      header: "",
      align: "right",
      render: (c) => {
        const tieneCuenta = emailsConCuenta.has(c.email.toLowerCase());
        return tieneCuenta ? null : <InviteButton email={c.email} />;
      },
    },
    {
      key: "editar",
      header: "",
      align: "right",
      render: (c) => (
        <ClienteDialog
          cliente={{ id: c.id, clienteId: c.clienteId, nombre: c.nombre, email: c.email, activo: c.activo }}
          trigger={
            <Button variant="outline" size="icon-sm" aria-label={`Editar ${c.nombre}`}>
              <Pencil />
            </Button>
          }
        />
      ),
    },
  ];

  return (
    <div className="fade-up space-y-5">
      <h1 className="sr-only">Panel administrador — Clientes</h1>
      <SectionCard title="Estado del fondo">
        {ultimaImportacion ? (
          <div className="space-y-1.5 text-[13.5px] text-muted-foreground">
            <div>
              <strong className="text-foreground">{fechaLarga(ultimaImportacion.importadoEn)}</strong>{" "}
              {ultimaImportacion.importadoEn.toLocaleTimeString("es-AR")}
            </div>
            <div>Archivo: {ultimaImportacion.archivoNombre}</div>
            <div>Importado por: {ultimaImportacion.importadoPorEmail}</div>
            <div className="flex items-center gap-2">
              <span>Estado:</span>
              <StatusBadge tone={ultimaImportacion.estado === "ok" ? "pos" : "neg"}>
                {ultimaImportacion.estado === "ok" ? "OK" : "Error"}
              </StatusBadge>
              <span>· {ultimaImportacion.filasProcesadas} filas procesadas</span>
            </div>
          </div>
        ) : (
          <EmptyState
            title="Todavía no se importó ningún Excel"
            description="Subí un archivo desde Importar Excel para cargar los datos del fondo."
          />
        )}
      </SectionCard>

      <SectionCard
        title={`Clientes (${clientes.length})`}
        action={
          <div className="flex items-center gap-2">
            {clientes.length > 0 && (
              <Button variant="outline" size="sm" className="gap-1.5" asChild>
                <a href="/admin/reportes/masivo" download>
                  <FileStack size={14} /> Descargar todos los reportes
                </a>
              </Button>
            )}
            <ClienteDialog
              trigger={
                <Button size="sm" className="gap-1.5">
                  <Plus size={14} /> Nuevo cliente
                </Button>
              }
            />
          </div>
        }
      >
        <DataTable
          columns={columns}
          rows={clientes}
          rowKey={(c) => c.id}
          emptyTitle="Sin clientes"
          emptyDescription="Todavia no hay clientes cargados."
        />
      </SectionCard>
    </div>
  );
}
