import { NextResponse } from "next/server";
import { generarReporteClienteAdmin } from "@/data/reportes";

export async function GET(
  _request: Request,
  { params }: { params: Promise<{ clientId: string }> }
) {
  const { clientId } = await params;

  let resultado;
  try {
    resultado = await generarReporteClienteAdmin(clientId);
  } catch (e) {
    return new NextResponse(e instanceof Error ? e.message : "No se pudo generar el reporte.", {
      status: 404,
    });
  }

  return new NextResponse(new Uint8Array(resultado.pdf), {
    headers: {
      "Content-Type": "application/pdf",
      "Content-Disposition": `attachment; filename="estado-cuenta-${resultado.clienteId}.pdf"`,
      "Cache-Control": "no-store",
    },
  });
}
