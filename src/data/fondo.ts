import "server-only";
import { prisma } from "@/lib/prisma";
import { requireUser } from "./auth";

// Datos a nivel fondo: iguales para todos los clientes autenticados.
// No son secretos entre clientes, pero si requieren estar logueado
// (no son publicos para cualquiera en internet).
export async function getFondoData() {
  await requireUser();

  const [navRows, latestSnapshot] = await Promise.all([
    prisma.fundNav.findMany({ orderBy: { fecha: "asc" } }),
    prisma.fundSnapshot.findFirst({ orderBy: { fecha: "desc" } }),
  ]);

  const navSeries = navRows.map((r) => ({
    fecha: r.fecha,
    valorCuotaparte: r.valorCuotaparte.toNumber(),
  }));

  if (!latestSnapshot) {
    return {
      navSeries,
      fechaCorte: null as Date | null,
      valorTotalFondo: 0,
      cuotapartesTotales: 0,
      positions: [] as Array<{
        ticker: string;
        nombre: string;
        tipoInstrumento: string;
        sector: string;
        cantidad: number;
        precio: number;
        valorMercado: number;
      }>,
    };
  }

  const positions = await prisma.position.findMany({
    where: { fecha: latestSnapshot.fecha },
    orderBy: { valorMercado: "desc" },
  });

  return {
    navSeries,
    fechaCorte: latestSnapshot.fecha,
    valorTotalFondo: latestSnapshot.valorTotalFondo.toNumber(),
    cuotapartesTotales: latestSnapshot.cuotapartesTotales.toNumber(),
    positions: positions.map((p) => ({
      ticker: p.ticker,
      nombre: p.nombre,
      tipoInstrumento: p.tipoInstrumento,
      sector: p.sector,
      cantidad: p.cantidad.toNumber(),
      precio: p.precio.toNumber(),
      valorMercado: p.valorMercado.toNumber(),
    })),
  };
}

export type FondoData = Awaited<ReturnType<typeof getFondoData>>;
