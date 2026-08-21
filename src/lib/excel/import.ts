import "server-only";
import { prisma } from "@/lib/prisma";
import { readWorkbook, ExcelFormatError } from "./parse";
import { validateWorkbook, type ImportError, type ValidatedData } from "./validate";
import { DEFAULT_FONDO_SENTINEL } from "./schemas";

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

// Resuelve cada nombre de fondo usado en el archivo a un id real. El
// sentinel (columna "fondo" vacia/omitida) resuelve al fondo default
// (el primero activo, mas antiguo). Cualquier otro nombre debe existir
// ya en la tabla "funds" — el importador no crea fondos nuevos solo.
async function resolverFondos(
  data: ValidatedData
): Promise<{ ok: true; porNombre: Map<string, string> } | { ok: false; errors: ImportError[] }> {
  const nombres = new Set<string>();
  for (const r of [...data.navRows, ...data.positions, ...data.snapshots, ...data.movements]) {
    nombres.add(r.fondo);
  }

  const defaultFund = await prisma.fund.findFirst({
    where: { activo: true },
    orderBy: { createdAt: "asc" },
  });
  if (!defaultFund) {
    return {
      ok: false,
      errors: [{ hoja: "-", fila: 0, motivo: "No hay ningun fondo activo configurado en el sistema." }],
    };
  }

  const porNombre = new Map<string, string>();
  porNombre.set(DEFAULT_FONDO_SENTINEL, defaultFund.id);

  const nombresCustom = [...nombres].filter((n) => n !== DEFAULT_FONDO_SENTINEL);
  if (nombresCustom.length > 0) {
    const fondosDb = await prisma.fund.findMany({
      where: { nombre: { in: nombresCustom, mode: "insensitive" } },
    });
    const encontrados = new Map(fondosDb.map((f) => [f.nombre.toLowerCase(), f.id]));

    const errors: ImportError[] = [];
    for (const nombre of nombresCustom) {
      const id = encontrados.get(nombre.toLowerCase());
      if (!id) {
        errors.push({
          hoja: "-",
          fila: 0,
          motivo: `El fondo "${nombre}" no existe. Creá el fondo primero, o dejá la columna "fondo" vacía para usar el fondo default.`,
        });
      } else {
        porNombre.set(nombre, id);
      }
    }
    if (errors.length > 0) return { ok: false, errors };
  }

  return { ok: true, porNombre };
}

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

  // Resolver nombres de fondo a ids ANTES de abrir la transaccion. Es una
  // lectura, no una escritura, asi que no rompe la garantia de "todo o
  // nada": si un nombre de fondo no existe, no se escribe absolutamente nada.
  const fondos = await resolverFondos(data);
  if (!fondos.ok) {
    await prisma.importBatch.create({
      data: {
        archivoNombre: meta.archivoNombre,
        importadoPorId: meta.importadoPorId,
        importadoPorEmail: meta.importadoPorEmail,
        filasProcesadas: totalFilas,
        estado: "error",
        detalle: { errors: fondos.errors },
      },
    });
    return { ok: false, errors: fondos.errors };
  }
  const fundIdDe = (nombre: string) => fondos.porNombre.get(nombre)!;

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
        const fundId = fundIdDe(n.fondo);
        await tx.fundNav.upsert({
          where: { fundId_fecha: { fundId, fecha: n.fecha } },
          create: { fundId, fecha: n.fecha, valorCuotaparte: n.valorCuotaparte },
          update: { valorCuotaparte: n.valorCuotaparte },
        });
      }

      for (const s of data.snapshots) {
        const fundId = fundIdDe(s.fondo);
        await tx.fundSnapshot.upsert({
          where: { fundId_fecha: { fundId, fecha: s.fecha } },
          create: {
            fundId,
            fecha: s.fecha,
            valorTotalFondo: s.valorTotalFondo,
            cuotapartesTotales: s.cuotapartesTotales,
          },
          update: {
            valorTotalFondo: s.valorTotalFondo,
            cuotapartesTotales: s.cuotapartesTotales,
          },
        });
      }

      // Posiciones: se reemplazan por completo para cada (fondo, fecha de
      // corte) presente en el archivo (una nueva carga puede agregar/quitar
      // tickers).
      const clavesPosiciones = new Set(
        data.positions.map((p) => `${fundIdDe(p.fondo)}|${p.fecha.toISOString()}`)
      );
      for (const clave of clavesPosiciones) {
        const [fundId, fechaIso] = clave.split("|");
        await tx.position.deleteMany({ where: { fundId, fecha: new Date(fechaIso) } });
      }
      if (data.positions.length > 0) {
        await tx.position.createMany({
          data: data.positions.map((p) => ({
            fundId: fundIdDe(p.fondo),
            fecha: p.fecha,
            ticker: p.ticker,
            nombre: p.nombre,
            tipoInstrumento: p.tipoInstrumento,
            sector: p.sector,
            cantidad: p.cantidad,
            precio: p.precio,
            valorMercado: p.valorMercado,
          })),
        });
      }

      // Movimientos: el Excel es la fuente completa de verdad por
      // (cliente, fondo) — se reemplazan todos los movimientos de cada par
      // que aparece en la hoja "movimientos", sin tocar movimientos de ese
      // mismo cliente en OTROS fondos que este archivo no menciona.
      const clientesDb = await tx.client.findMany({
        where: { clienteId: { in: data.clients.map((c) => c.clienteId) } },
        select: { id: true, clienteId: true },
      });
      const idPorClienteId = new Map(clientesDb.map((c) => [c.clienteId, c.id]));

      const paresClienteFondo = new Set(
        data.movements.map((m) => `${idPorClienteId.get(m.clienteId)}|${fundIdDe(m.fondo)}`)
      );
      for (const par of paresClienteFondo) {
        const [clientId, fundId] = par.split("|");
        await tx.clientMovement.deleteMany({ where: { clientId, fundId } });
        await tx.clientFund.upsert({
          where: { clientId_fundId: { clientId, fundId } },
          create: { clientId, fundId },
          update: {},
        });
      }
      if (data.movements.length > 0) {
        await tx.clientMovement.createMany({
          data: data.movements.map((m) => ({
            clientId: idPorClienteId.get(m.clienteId)!,
            fundId: fundIdDe(m.fondo),
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
