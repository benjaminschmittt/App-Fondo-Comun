import "server-only";
import { prisma } from "@/lib/prisma";
import { requireClient } from "./auth";
import { getFondoData } from "./fondo";
import {
  evolucionInversion,
  aportesNetos,
  cuotapartesDeMovimiento,
  tirAnualizada,
} from "@/lib/calculos";

// DTO con TODO lo que el dashboard necesita del cliente autenticado.
// requireClient() resuelve el cliente desde la sesion (nunca desde
// un parametro del cliente), asi que esta funcion es imposible de
// llamar "para otro cliente" desde afuera.
export async function getMiInversion() {
  const client = await requireClient();
  const fondo = await getFondoData();

  const movementRows = await prisma.clientMovement.findMany({
    where: { clientId: client.id },
    orderBy: { fecha: "asc" },
  });

  const movements = movementRows.map((m) => ({
    fecha: m.fecha,
    tipo: m.tipo,
    monto: m.monto.toNumber(),
  }));

  const serie = evolucionInversion(movements, fondo.navSeries);
  const ultimo = serie[serie.length - 1];
  const cuotapartes = ultimo?.cuotapartes ?? 0;
  const valorActual = ultimo?.valorInversion ?? 0;
  const netos = aportesNetos(movements);
  const resultado = valorActual - netos;
  const rentabilidadAnualizada = ultimo
    ? tirAnualizada(movements, valorActual, ultimo.fecha)
    : null;

  return {
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

export type MiInversion = Awaited<ReturnType<typeof getMiInversion>>;
