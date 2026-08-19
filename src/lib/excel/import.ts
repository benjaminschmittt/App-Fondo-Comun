import "server-only";
import { prisma } from "@/lib/prisma";
import { readWorkbook, ExcelFormatError } from "./parse";
import { validateWorkbook, type ImportError } from "./validate";

export type ImportMeta = {
  archivoNombre: string;
  importadoPorId: string;
  importadoPorEmail: string;
};

export type ImportResult =
  | {
      ok: true;
      resumen: {
        clientes: number;
        historicoCuotaparte: number;
        posiciones: number;
        movimientos: number;
      };
    }
  | { ok: false; errors: ImportError[] };

export async function importExcel(
  buffer: Buffer,
  meta: ImportMeta
): Promise<ImportResult> {
  let parsed;
  try {
    parsed = await readWorkbook(buffer);
  } catch (e) {
    const motivo =
      e instanceof ExcelFormatError
        ? e.message
        : "No se pudo leer el archivo. Verifica que sea un .xlsx valido.";
    const errors: ImportError[] = [{ hoja: "-", fila: 0, motivo }];
    await prisma.importBatch.create({
      data: {
        archivoNombre: meta.archivoNombre,
        importadoPorId: meta.importadoPorId,
        importadoPorEmail: meta.importadoPorEmail,
        filasProcesadas: 0,
        estado: "error",
        detalle: { errors },
      },
    });
    return { ok: false, errors };
  }

  const totalFilas =
    parsed.valorCuotaparte.length +
    parsed.posiciones.length +
    parsed.fondo.length +
    parsed.clientes.length +
    parsed.movimientos.length;

  const result = validateWorkbook(parsed);

  if (!result.ok) {
    await prisma.importBatch.create({
      data: {
        archivoNombre: meta.archivoNombre,
        importadoPorId: meta.importadoPorId,
        importadoPorEmail: meta.importadoPorEmail,
        filasProcesadas: totalFilas,
        estado: "error",
        detalle: { errors: result.errors },
      },
    });
    return { ok: false, errors: result.errors };
  }

  const { data } = result;

  await prisma.$transaction(
    async (tx) => {
      for (const c of data.clients) {
        await tx.client.upsert({
          where: { clienteId: c.clienteId },
          create: c,
          update: { nombre: c.nombre, email: c.email, activo: c.activo },
        });
      }

      for (const n of data.navRows) {
        await tx.fundNav.upsert({
          where: { fecha: n.fecha },
          create: n,
          update: { valorCuotaparte: n.valorCuotaparte },
        });
      }

      for (const s of data.snapshots) {
        await tx.fundSnapshot.upsert({
          where: { fecha: s.fecha },
          create: s,
          update: {
            valorTotalFondo: s.valorTotalFondo,
            cuotapartesTotales: s.cuotapartesTotales,
          },
        });
      }

      // Posiciones: se reemplazan por completo para cada fecha de corte
      // presente en el archivo (una nueva carga puede agregar/quitar tickers).
      const fechasPosiciones = [
        ...new Set(data.positions.map((p) => p.fecha.toISOString())),
      ].map((s) => new Date(s));
      if (fechasPosiciones.length > 0) {
        await tx.position.deleteMany({ where: { fecha: { in: fechasPosiciones } } });
      }
      if (data.positions.length > 0) {
        await tx.position.createMany({ data: data.positions });
      }

      // Movimientos: el Excel es la fuente completa de verdad por cliente,
      // asi que se reemplazan todos los movimientos de cada cliente listado
      // en la hoja "clientes" (no solo los que aparecen en "movimientos").
      const clientesDb = await tx.client.findMany({
        where: { clienteId: { in: data.clients.map((c) => c.clienteId) } },
        select: { id: true, clienteId: true },
      });
      const idPorClienteId = new Map(clientesDb.map((c) => [c.clienteId, c.id]));

      await tx.clientMovement.deleteMany({
        where: { clientId: { in: clientesDb.map((c) => c.id) } },
      });
      if (data.movements.length > 0) {
        await tx.clientMovement.createMany({
          data: data.movements.map((m) => ({
            clientId: idPorClienteId.get(m.clienteId)!,
            fecha: m.fecha,
            tipo: m.tipo,
            monto: m.monto,
          })),
        });
      }

      await tx.importBatch.create({
        data: {
          archivoNombre: meta.archivoNombre,
          importadoPorId: meta.importadoPorId,
          importadoPorEmail: meta.importadoPorEmail,
          filasProcesadas: totalFilas,
          estado: "ok",
          detalle: {
            clientes: data.clients.length,
            historicoCuotaparte: data.navRows.length,
            posiciones: data.positions.length,
            movimientos: data.movements.length,
          },
        },
      });
    },
    { timeout: 30_000 }
  );

  return {
    ok: true,
    resumen: {
      clientes: data.clients.length,
      historicoCuotaparte: data.navRows.length,
      posiciones: data.positions.length,
      movimientos: data.movements.length,
    },
  };
}
