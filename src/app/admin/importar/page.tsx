import { C } from "@/lib/theme";
import { UploadForm } from "./upload-form";

export default function ImportarPage() {
  return (
    <div>
      <div className="rounded-2xl p-5" style={{ background: "#fff", border: `1px solid ${C.line}` }}>
        <h2 style={{ fontFamily: "var(--font-fraunces), serif", fontSize: 16, color: C.ink, fontWeight: 600, marginBottom: 4 }}>
          Importar Excel
        </h2>
        <p style={{ color: C.muted, fontSize: 13, marginBottom: 16 }}>
          El archivo debe tener las hojas: valor_cuotaparte, posiciones, fondo, clientes, movimientos. Se valida
          todo antes de tocar la base de datos: si hay un error, no se importa nada.
        </p>
        <UploadForm />
      </div>
    </div>
  );
}
