import { SectionCard } from "@/components/section-card";
import { UploadForm } from "./upload-form";

export default function ImportarPage() {
  return (
    <SectionCard title="Importar Excel">
      <p className="mb-4 text-[13px] text-muted-foreground">
        El archivo debe tener las hojas: valor_cuotaparte, posiciones, fondo, clientes, movimientos.
        Se valida todo antes de tocar la base de datos: si hay un error, no se importa nada.
      </p>
      <UploadForm />
    </SectionCard>
  );
}
