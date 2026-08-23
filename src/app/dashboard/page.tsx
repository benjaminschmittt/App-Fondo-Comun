import type { Metadata } from "next";
import { getMiInversion } from "@/data/inversion";
import { listarDocumentosCliente } from "@/data/documentos";
import { ClientTopbar } from "@/components/client-topbar";
import { DashboardView } from "./dashboard-view";

export const metadata: Metadata = { title: "Dashboard" };

export default async function DashboardPage() {
  const [data, documentos] = await Promise.all([getMiInversion(), listarDocumentosCliente()]);

  return (
    <>
      <ClientTopbar nombre={data.nombre} fechaCorte={data.fondo.fechaCorte} />
      <DashboardView data={data} documentos={documentos} />
    </>
  );
}
