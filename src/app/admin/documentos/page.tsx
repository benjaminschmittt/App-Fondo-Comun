import type { Metadata } from "next";
import { listarDocumentosAdmin } from "@/data/documentos";
import { bytes, fechaLarga } from "@/lib/theme";
import { SectionCard } from "@/components/section-card";
import { DataTable, type DataTableColumn } from "@/components/data-table";
import { UploadForm } from "./upload-form";
import { DocumentRowActions } from "./document-row-actions";

export const metadata: Metadata = { title: "Documentos" };

type Documento = Awaited<ReturnType<typeof listarDocumentosAdmin>>[number];

export default async function DocumentosAdminPage() {
  const documentos = await listarDocumentosAdmin();

  const columns: DataTableColumn<Documento>[] = [
    {
      key: "nombre",
      header: "Nombre",
      render: (d) => <span className="font-semibold text-foreground">{d.nombre}</span>,
    },
    {
      key: "tamanio",
      header: "Tamaño",
      render: (d) => <span className="text-muted-foreground">{bytes(d.tamanioBytes)}</span>,
    },
    {
      key: "subidoPor",
      header: "Subido por",
      render: (d) => <span className="text-muted-foreground">{d.subidoPorEmail}</span>,
    },
    {
      key: "fecha",
      header: "Fecha",
      render: (d) => <span className="text-muted-foreground">{fechaLarga(d.createdAt)}</span>,
    },
    {
      key: "accion",
      header: "",
      align: "right",
      render: (d) => <DocumentRowActions id={d.id} nombre={d.nombre} />,
    },
  ];

  return (
    <div className="fade-up space-y-5">
      <h1 className="sr-only">Panel administrador — Documentos</h1>
      <SectionCard title="Subir documento">
        <p className="mb-4 text-[13px] text-muted-foreground">
          PDFs de respaldo de la cuenta de inversión (banco/broker). Se suben a nivel fondo:
          todos los clientes del fondo los ven y descargan.
        </p>
        <UploadForm />
      </SectionCard>

      <SectionCard title={`Documentos (${documentos.length})`}>
        <DataTable
          columns={columns}
          rows={documentos}
          rowKey={(d) => d.id}
          emptyTitle="Sin documentos"
          emptyDescription="Todavía no se subió ningún documento para este fondo."
        />
      </SectionCard>
    </div>
  );
}
