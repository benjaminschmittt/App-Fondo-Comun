import type { ParsedWorkbook, SheetRecord } from "./parse";
import {
  ValorCuotaparteRow,
  PosicionRow,
  FondoRow,
  ClienteRow,
  MovimientoRow,
} from "./schemas";

export type ImportError = {
  hoja: string;
  fila: number;
  columna?: string;
  motivo: string;
};

export type ValidatedData = {
  navRows: { fecha: Date; valorCuotaparte: number }[];
  positions: {
    fecha: Date;
    ticker: string;
    nombre: string;
    tipoInstrumento: string;
    sector: string;
    cantidad: number;
    precio: number;
    valorMercado: number;
  }[];
  snapshots: { fecha: Date; valorTotalFondo: number; cuotapartesTotales: number }[];
  clients: { clienteId: string; nombre: string; email: string; activo: boolean }[];
  movements: { clienteId: string; fecha: Date; tipo: "aporte" | "retiro"; monto: number }[];
};

export type ValidationResult =
  | { ok: true; data: ValidatedData }
  | { ok: false; errors: ImportError[] };

function dayKey(d: Date): string {
  return d.toISOString().slice(0, 10);
}

// Parsea una hoja fila por fila con su schema de zod, acumulando errores
// legibles (hoja, fila, columna, motivo) en vez de tirar una excepcion.
function parseSheet<T>(
  hoja: string,
  rows: SheetRecord[],
  schema: { safeParse: (v: unknown) => { success: boolean; data?: T; error?: { issues: { path: PropertyKey[]; message: string }[] } } },
  errors: ImportError[]
): T[] {
  const out: T[] = [];
  for (const r of rows) {
    const parsed = schema.safeParse(r.data);
    if (!parsed.success) {
      for (const issue of parsed.error!.issues) {
        errors.push({
          hoja,
          fila: r.row,
          columna: issue.path.join(".") || undefined,
          motivo: issue.message,
        });
      }
    } else {
      out.push(parsed.data as T);
    }
  }
  return out;
}

const TOLERANCIA_NAV = 0.005; // 0.5%
const TOLERANCIA_TOTAL = 0.01; // 1%

export function validateWorkbook(wb: ParsedWorkbook): ValidationResult {
  const errors: ImportError[] = [];

  const navRowsRaw = parseSheet("valor_cuotaparte", wb.valorCuotaparte, ValorCuotaparteRow, errors);
  const posicionesRaw = parseSheet("posiciones", wb.posiciones, PosicionRow, errors);
  const fondoRaw = parseSheet("fondo", wb.fondo, FondoRow, errors);
  const clientesRaw = parseSheet("clientes", wb.clientes, ClienteRow, errors);
  const movimientosRaw = parseSheet("movimientos", wb.movimientos, MovimientoRow, errors);

  // --- valor_cuotaparte: fechas unicas ---
  const navByDate = new Map<string, number>();
  {
    const seen = new Map<string, number>();
    for (let i = 0; i < navRowsRaw.length; i++) {
      const row = navRowsRaw[i];
      const key = dayKey(row.fecha);
      if (seen.has(key)) {
        errors.push({
          hoja: "valor_cuotaparte",
          fila: wb.valorCuotaparte[i].row,
          columna: "fecha",
          motivo: `Fecha duplicada (ya definida en la fila ${seen.get(key)}).`,
        });
        continue;
      }
      seen.set(key, wb.valorCuotaparte[i].row);
      navByDate.set(key, row.valor_cuotaparte);
    }
  }

  // --- clientes: cliente_id y email unicos ---
  const clienteIdSet = new Set<string>();
  const emailSet = new Set<string>();
  const clients: ValidatedData["clients"] = [];
  {
    const seenIds = new Map<string, number>();
    const seenEmails = new Map<string, number>();
    for (let i = 0; i < clientesRaw.length; i++) {
      const row = clientesRaw[i];
      const excelRow = wb.clientes[i].row;
      const emailKey = row.email.toLowerCase();

      let dup = false;
      if (seenIds.has(row.cliente_id)) {
        errors.push({
          hoja: "clientes",
          fila: excelRow,
          columna: "cliente_id",
          motivo: `cliente_id duplicado (ya definido en la fila ${seenIds.get(row.cliente_id)}).`,
        });
        dup = true;
      }
      if (seenEmails.has(emailKey)) {
        errors.push({
          hoja: "clientes",
          fila: excelRow,
          columna: "email",
          motivo: `email duplicado (ya definido en la fila ${seenEmails.get(emailKey)}).`,
        });
        dup = true;
      }
      seenIds.set(row.cliente_id, excelRow);
      seenEmails.set(emailKey, excelRow);
      if (dup) continue;

      clienteIdSet.add(row.cliente_id);
      emailSet.add(emailKey);
      clients.push({
        clienteId: row.cliente_id,
        nombre: row.nombre,
        email: row.email,
        activo: row.activo === "si",
      });
    }
  }

  // --- posiciones: fecha debe existir en valor_cuotaparte; ticker unico por fecha ---
  const positions: ValidatedData["positions"] = [];
  const totalPorFecha = new Map<string, number>();
  {
    const seenTickerFecha = new Set<string>();
    for (let i = 0; i < posicionesRaw.length; i++) {
      const row = posicionesRaw[i];
      const excelRow = wb.posiciones[i].row;
      const key = dayKey(row.fecha);

      if (!navByDate.has(key)) {
        errors.push({
          hoja: "posiciones",
          fila: excelRow,
          columna: "fecha",
          motivo: `No hay un valor de cuotaparte definido para esta fecha en la hoja "valor_cuotaparte".`,
        });
        continue;
      }

      const tickerKey = `${key}|${row.ticker.toUpperCase()}`;
      if (seenTickerFecha.has(tickerKey)) {
        errors.push({
          hoja: "posiciones",
          fila: excelRow,
          columna: "ticker",
          motivo: `Ticker duplicado para la misma fecha de corte.`,
        });
        continue;
      }
      seenTickerFecha.add(tickerKey);

      const valorMercado = row.cantidad * row.precio;
      totalPorFecha.set(key, (totalPorFecha.get(key) ?? 0) + valorMercado);
      positions.push({
        fecha: row.fecha,
        ticker: row.ticker.toUpperCase(),
        nombre: row.nombre,
        tipoInstrumento: row.tipo_instrumento,
        sector: row.sector,
        cantidad: row.cantidad,
        precio: row.precio,
        valorMercado,
      });
    }
  }

  // --- fondo: fecha unica, debe existir en valor_cuotaparte y coincidir,
  //     y el total declarado debe coincidir con la suma de posiciones ---
  const snapshots: ValidatedData["snapshots"] = [];
  {
    const seenFechas = new Map<string, number>();
    for (let i = 0; i < fondoRaw.length; i++) {
      const row = fondoRaw[i];
      const excelRow = wb.fondo[i].row;
      const key = dayKey(row.fecha);

      if (seenFechas.has(key)) {
        errors.push({
          hoja: "fondo",
          fila: excelRow,
          columna: "fecha",
          motivo: `Fecha duplicada (ya definida en la fila ${seenFechas.get(key)}).`,
        });
        continue;
      }
      seenFechas.set(key, excelRow);

      const navEsperado = navByDate.get(key);
      if (navEsperado == null) {
        errors.push({
          hoja: "fondo",
          fila: excelRow,
          columna: "fecha",
          motivo: `No hay un valor de cuotaparte definido para esta fecha en la hoja "valor_cuotaparte".`,
        });
        continue;
      }
      if (Math.abs(row.valor_cuotaparte - navEsperado) / navEsperado > TOLERANCIA_NAV) {
        errors.push({
          hoja: "fondo",
          fila: excelRow,
          columna: "valor_cuotaparte",
          motivo: `No coincide con el valor de la hoja "valor_cuotaparte" para esta fecha (${navEsperado}).`,
        });
      }

      const totalPosiciones = totalPorFecha.get(key);
      if (totalPosiciones == null) {
        errors.push({
          hoja: "fondo",
          fila: excelRow,
          columna: "valor_total_fondo",
          motivo: `No hay posiciones cargadas en la hoja "posiciones" para esta fecha de corte.`,
        });
      } else if (
        Math.abs(row.valor_total_fondo - totalPosiciones) / totalPosiciones >
        TOLERANCIA_TOTAL
      ) {
        errors.push({
          hoja: "fondo",
          fila: excelRow,
          columna: "valor_total_fondo",
          motivo: `No coincide con la suma de "posiciones" para esta fecha (calculado: ${totalPosiciones.toFixed(2)}).`,
        });
      }

      snapshots.push({
        fecha: row.fecha,
        valorTotalFondo: row.valor_total_fondo,
        cuotapartesTotales: row.cuotapartes_totales,
      });
    }
  }

  // --- movimientos: cliente_id debe existir, fecha debe tener NAV definido ---
  const movements: ValidatedData["movements"] = [];
  for (let i = 0; i < movimientosRaw.length; i++) {
    const row = movimientosRaw[i];
    const excelRow = wb.movimientos[i].row;

    if (!clienteIdSet.has(row.cliente_id)) {
      errors.push({
        hoja: "movimientos",
        fila: excelRow,
        columna: "cliente_id",
        motivo: `cliente_id no existe en la hoja "clientes".`,
      });
      continue;
    }
    if (!navByDate.has(dayKey(row.fecha))) {
      errors.push({
        hoja: "movimientos",
        fila: excelRow,
        columna: "fecha",
        motivo: `No hay un valor de cuotaparte definido para esta fecha en la hoja "valor_cuotaparte".`,
      });
      continue;
    }

    movements.push({
      clienteId: row.cliente_id,
      fecha: row.fecha,
      tipo: row.tipo,
      monto: row.monto,
    });
  }

  const navRows = [...navByDate.entries()].map(([key, valorCuotaparte]) => ({
    fecha: new Date(key),
    valorCuotaparte,
  }));

  if (errors.length > 0) {
    return { ok: false, errors };
  }

  return {
    ok: true,
    data: { navRows, positions, snapshots, clients, movements },
  };
}
