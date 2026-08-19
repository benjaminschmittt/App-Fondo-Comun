import { getMiInversion } from "@/data/inversion";
import { AppHeader } from "@/components/app-header";
import { DashboardView } from "./dashboard-view";

export default async function DashboardPage() {
  const data = await getMiInversion();

  return (
    <>
      <AppHeader nombre={data.nombre} fechaCorte={data.fondo.fechaCorte} />
      <DashboardView data={data} />
    </>
  );
}
