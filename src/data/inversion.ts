import "server-only";
import { prisma } from "@/lib/prisma";
import { requireClient } from "./auth";
import { getFondoData, type FondoData } from "./fondo";
import {
  evolucionInversion,
  aportesNetos,
  cuotapartesDeMovimiento,
  tirAnualizada,
} from "@/lib/calculos";
import { cuotapartesTransferidasHasta, type Transferencia } from "@/lib/comisiones";

// Calculo puro (bueno, casi: hace una consulta) de la inversion de UN
// cliente ya resuelto, dado el fondo ya cargado. Separado de
// getMiInversion() para que el reporte PDF generado por el admin (para
// un cliente arbitrario, no el de la sesion) pueda reusar exactamente
// este mismo calculo — ver src/data/reportes.ts. Nunca se llama con un
// cliente sin verificar: getMiInversion() lo resuelve de la sesion,
// reportes.ts lo resuelve solo despues de requireAdmin().
export async function calcularInversion(
  client: { id: string; nombre: string },
  fondo: FondoData
) {
  const [movementRows, transferRows] = await Promise.all([
    prisma.clientMovement.findMany({
      where: { clientId: client.id, fundId: fondo.fundId },
      orderBy: { fecha: "asc" },
    }),
    prisma.shareTransfer.findMany({
      where: { clientId: client.id, fundId: fondo.fundId },
      include: { feeCalculation: { include: { feePeriod: true } } },
    }),
  ]);

  const movements = movementRows.map((m) => ({
    fecha: m.fecha,
    tipo: m.tipo,
    monto: m.monto.toNumber(),
  }));

  // Cuotapartes que salieron por comision de performance — nunca pasan
  // por ClientMovement (ver diseño del modulo de comisiones), asi que
  // evolucionInversion() no se entera solo. Sin este ajuste, un cliente
  // al que ya se le cobro fee veria su valor de ANTES del cobro, tanto
  // en "Tus cuotapartes"/"Valor de tu inversion" como en el reporte PDF
  // (que reusa esta misma funcion).
  const transferencias: Transferencia[] = transferRows.map((t) => ({
    fecha: t.feeCalculation.feePeriod.periodEnd,
    shares: t.shares.toNumber(),
  }));

  const serie = evolucionInversion(movements, fondo.navSeries).map((p) => {
    const transferidas = cuotapartesTransferidasHasta(transferencias, p.fecha);
    const cuotapartes = p.cuotapartes - transferidas;
    return { ...p, cuotapartes, valorInversion: cuotapartes > 0 ? cuotapartes * p.valorCuotaparte : 0 };
  });
  const ultimo = serie[serie.length - 1];
  const cuotapartes = ultimo?.cuotapartes ?? 0;
  const valorActual = ultimo?.valorInversion ?? 0;
  const netos = aportesNetos(movements);
  const resultado = valorActual - netos;
  const rentabilidadAnualizada = ultimo
    ? tirAnualizada(movements, valorActual, ultimo.fecha)
    : null;

  return {
    id: client.id,
    nombre: client.nombre,
    cuotapartes,
    valorActual,
    aportesNetos: netos,
    resultado,
    resultadoPct: netos > 0 ? resultado / netos : 0,
    rentabilidadAnualizada,
    serie,
    movimientos: movements.map((m) => ({
      ...m,
      cuotapartes: cuotapartesDeMovimiento(m, fondo.navSeries),
    })),
    fondo,
  };
}

// DTO con TODO lo que el dashboard necesita del cliente autenticado.
// requireClient() resuelve el cliente desde la sesion (nunca desde
// un parametro del cliente), asi que esta funcion es imposible de
// llamar "para otro cliente" desde afuera.
export async function getMiInversion() {
  const client = await requireClient();
  const fondo = await getFondoData();
  return calcularInversion(client, fondo);
}

export type MiInversion = Awaited<ReturnType<typeof getMiInversion>>;
