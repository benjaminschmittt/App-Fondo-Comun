import { NextResponse } from "next/server";
import JSZip from "jszip";
import { generarReportesTodosLosClientes } from "@/data/reportes";

export async function GET() {
  const resultados = await generarReportesTodosLosClientes();

  const zip = new JSZip();
  for (const r of resultados) {
    zip.file(`estado-cuenta-${r.clienteId}.pdf`, r.pdf);
  }
  const buffer = await zip.generateAsync({ type: "nodebuffer" });

  return new NextResponse(new Uint8Array(buffer), {
    headers: {
      "Content-Type": "application/zip",
      "Content-Disposition": `attachment; filename="reportes-${new Date().toISOString().slice(0, 10)}.zip"`,
      "Cache-Control": "no-store",
    },
  });
}
