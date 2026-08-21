import "server-only";
import { unstable_cache } from "next/cache";
import { prisma } from "@/lib/prisma";
import { requireUser } from "./auth";
import { rendimientoFondo } from "@/lib/calculos";

export const FONDO_DATA_TAG = "fondo-data";

// Fase 3, Etapa 1: el esquema ya es multi-fondo, pero la UI todavia no
// expone seleccion de fondo. Hasta que exista esa UI, toda la app apunta
// al fondo default: el primero activo, mas antiguo. Nunca un id
// hardcodeado — se resuelve por consulta cada vez.
async function getDefaultFundId(): Promise<string> {
  const fund = await prisma.fund.findFirst({
    where: { activo: true },
    orderBy: { createdAt: "asc" },
  });
  if (!fund) {
    throw new Error("No hay ningun fondo activo configurado.");
  }
  return fund.id;
}

// Datos a nivel fondo: iguales para todos los clientes autenticados de
// ese fondo. No son secretos entre clientes, pero si requieren estar
// logueado (no son publicos para cualquiera en internet). Por eso el
// chequeo de sesion queda AFUERA de unstable_cache (no se puede usar
// cookies() adentro de una funcion cacheada) y solo se cachea la consulta
// en si, invalidada explicitamente con updateTag() cuando se importa un
// Excel nuevo — nunca queda desactualizada por mas de eso.
export async function getFondoData() {
  await requireUser();
  const fundId = await getDefaultFundId();
  const cached = await getFondoDataCached(fundId);
  const navSeries = cached.navSeries.map((r) => ({ ...r, fecha: new Date(r.fecha) }));
  return {
    ...cached,
    fundId,
    fechaCorte: cached.fechaCorte ? new Date(cached.fechaCorte) : null,
    navSeries,
    rendimiento: rendimientoFondo(navSeries),
  };
}

// Fechas como string ISO (no Date): unstable_cache serializa el resultado
// para guardarlo, y no hay garantia de que un Date sobreviva el viaje de
// ida y vuelta como Date — el wrapper de arriba lo reconstruye. fundId es
// argumento de la funcion, asi que unstable_cache ya lo incluye solo en
// la clave de cache (distintos fondos, distintas entradas).
const getFondoDataCached = unstable_cache(
  async (fundId: string) => {
    const [navRows, latestSnapshot] = await Promise.all([
      prisma.fundNav.findMany({ where: { fundId }, orderBy: { fecha: "asc" } }),
      prisma.fundSnapshot.findFirst({ where: { fundId }, orderBy: { fecha: "desc" } }),
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
      where: { fundId, fecha: latestSnapshot.fecha },
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
