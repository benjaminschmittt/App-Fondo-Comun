import { NextResponse } from "next/server";
import { requireUser, requireClient } from "@/data/auth";
import { getMiInversion } from "@/data/inversion";
import { registrarAuditoria } from "@/data/audit";
import { generarReportePDF } from "@/lib/pdf/reporte-cliente";

// getMiInversion() ya resuelve el cliente desde la sesion (requireClient()
// por dentro) — un cliente nunca puede pedir el reporte de otro porque
// nunca hay un id de cliente que venga del navegador. requireClient() se
// vuelve a llamar aca (cacheado por React, no pega dos veces a la base)
// solo para tener el id y poder auditar "ultimo reporte de ESTE cliente".
export async function GET() {
  const [user, client, data] = await Promise.all([requireUser(), requireClient(), getMiInversion()]);
  const generadoEn = new Date();

  const pdf = await generarReportePDF(data, generadoEn);

  await registrarAuditoria({
    actorId: user.id,
    actorEmail: user.email ?? "",
    accion: "generar_reporte_cliente",
    entidad: "client",
    entidadId: client.id,
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
