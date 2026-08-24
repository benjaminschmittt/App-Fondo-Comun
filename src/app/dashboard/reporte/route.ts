import { NextResponse } from "next/server";
import { requireUser } from "@/data/auth";
import { getMiInversion } from "@/data/inversion";
import { registrarAuditoria } from "@/data/audit";
import { generarReportePDF } from "@/lib/pdf/reporte-cliente";

// getMiInversion() ya resuelve el cliente desde la sesion (requireClient()
// por dentro) — un cliente nunca puede pedir el reporte de otro porque
// nunca hay un id de cliente que venga del navegador.
export async function GET() {
  const user = await requireUser();
  const data = await getMiInversion();
  const generadoEn = new Date();

  const pdf = await generarReportePDF(data, generadoEn);

  await registrarAuditoria({
    actorId: user.id,
    actorEmail: user.email ?? "",
    accion: "generar_reporte_cliente",
    entidad: "client",
    detalle: { nombre: data.nombre },
  });

  return new NextResponse(new Uint8Array(pdf), {
    headers: {
      "Content-Type": "application/pdf",
      "Content-Disposition": `attachment; filename="estado-cuenta-${generadoEn.toISOString().slice(0, 10)}.pdf"`,
      "Cache-Control": "no-store",
    },
  });
}
