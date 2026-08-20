import "server-only";
import { unstable_cache } from "next/cache";
import { prisma } from "@/lib/prisma";
import { requireUser } from "./auth";
import { rendimientoFondo } from "@/lib/calculos";

export const FONDO_DATA_TAG = "fondo-data";

// Datos a nivel fondo: iguales para todos los clientes autenticados.
// No son secretos entre clientes, pero si requieren estar logueado
// (no son publicos para cualquiera en internet). Por eso el chequeo de
// sesion queda AFUERA de unstable_cache (no se puede usar cookies()
// adentro de una funcion cacheada) y solo se cachea la consulta en si,
// invalidada explicitamente con revalidateTag() cuando se importa un
// Excel nuevo — nunca queda desactualizada por mas de eso.
export async function getFondoData() {
  await requireUser();
  const cached = await getFondoDataCached();
  const navSeries = cached.navSeries.map((r) => ({ ...r, fecha: new Date(r.fecha) }));
  return {
    ...cached,
    fechaCorte: cached.fechaCorte ? new Date(cached.fechaCorte) : null,
    navSeries,
    rendimiento: rendimientoFondo(navSeries),
  };
}

// Fechas como string ISO (no Date): unstable_cache serializa el resultado
// para guardarlo, y no hay garantia de que un Date sobreviva el viaje de
// ida y vuelta como Date — el wrapper de arriba lo reconstruye.
const getFondoDataCached = unstable_cache(
  async () => {
    const [navRows, latestSnapshot] = await Promise.all([
      prisma.fundNav.findMany({ orderBy: { fecha: "asc" } }),
      prisma.fundSnapshot.findFirst({ orderBy: { fecha: "desc" } }),
    ]);

    const navSeries = navRows.map((r) => ({
      fecha: r.fecha.toISOString(),
      valorCuotaparte: r.valorCuotaparte.toNumber(),
    }));

    if (!latestSnapshot) {
      return {
        navSeries,
        fechaCorte: null as string | null,
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
      fechaCorte: latestSnapshot.fecha.toISOString() as string | null,
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
  },
  ["fondo-data"],
  { tags: [FONDO_DATA_TAG] }
);

export type FondoData = Awaited<ReturnType<typeof getFondoData>>;
