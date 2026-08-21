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
  navRows: { fondo: string; fecha: Date; valorCuotaparte: number }[];
  positions: {
    fondo: string;
    fecha: Date;
    ticker: string;
    nombre: string;
    tipoInstrumento: string;
    sector: string;
    cantidad: number;
    precio: number;
    valorMercado: number;
  }[];
  snapshots: { fondo: string; fecha: Date; valorTotalFondo: number; cuotapartesTotales: number }[];
  clients: { clienteId: string; nombre: string; email: string; activo: boolean }[];
  movements: { fondo: string; clienteId: string; fecha: Date; tipo: "aporte" | "retiro"; monto: number }[];
};

export type ValidationResult =
  | { ok: true; data: ValidatedData }
  | { ok: false; errors: ImportError[] };

function dayKey(d: Date): string {
  return d.toISOString().slice(0, 10);
}

// Clave compuesta fondo+fecha: a partir de Fase 3 el mismo dia puede
// repetirse en fondos distintos, asi que fecha sola ya no alcanza para
// identificar un corte de forma unica.
function fondoFechaKey(fondo: string, fecha: Date): string {
  return `${fondo}|${dayKey(fecha)}`;
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

  // --- valor_cuotaparte: (fondo, fecha) unicos ---
  const navByKey = new Map<string, number>();
  {
    const seen = new Map<string, number>();
    for (let i = 0; i < navRowsRaw.length; i++) {
      const row = navRowsRaw[i];
      const key = fondoFechaKey(row.fondo, row.fecha);
      if (seen.has(key)) {
        errors.push({
          hoja: "valor_cuotaparte",
          fila: wb.valorCuotaparte[i].row,
          columna: "fecha",
          motivo: `Fecha duplicada para este fondo (ya definida en la fila ${seen.get(key)}).`,
        });
        continue;
      }
      seen.set(key, wb.valorCuotaparte[i].row);
      navByKey.set(key, row.valor_cuotaparte);
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

  // --- posiciones: (fondo, fecha) debe existir en valor_cuotaparte;
  //     ticker unico por fondo+fecha ---
  const positions: ValidatedData["positions"] = [];
  const totalPorKey = new Map<string, number>();
  {
    const seenTickerFecha = new Set<string>();
    for (let i = 0; i < posicionesRaw.length; i++) {
      const row = posicionesRaw[i];
      const excelRow = wb.posiciones[i].row;
      const key = fondoFechaKey(row.fondo, row.fecha);

      if (!navByKey.has(key)) {
        errors.push({
          hoja: "posiciones",
          fila: excelRow,
          columna: "fecha",
          motivo: `No hay un valor de cuotaparte definido para esta fecha (y fondo) en la hoja "valor_cuotaparte".`,
        });
        continue;
      }

      const tickerKey = `${key}|${row.ticker.toUpperCase()}`;
      if (seenTickerFecha.has(tickerKey)) {
        errors.push({
          hoja: "posiciones",
          fila: excelRow,
          columna: "ticker",
          motivo: `Ticker duplicado para la misma fecha de corte (y fondo).`,
        });
        continue;
      }
      seenTickerFecha.add(tickerKey);

      const valorMercado = row.cantidad * row.precio;
      totalPorKey.set(key, (totalPorKey.get(key) ?? 0) + valorMercado);
      positions.push({
        fondo: row.fondo,
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

  // --- fondo: (fondo, fecha) unico, debe existir en valor_cuotaparte y
  //     coincidir, y el total declarado debe coincidir con la suma de
  //     posiciones de ese mismo fondo ---
  const snapshots: ValidatedData["snapshots"] = [];
  {
    const seenKeys = new Map<string, number>();
    for (let i = 0; i < fondoRaw.length; i++) {
      const row = fondoRaw[i];
      const excelRow = wb.fondo[i].row;
      const key = fondoFechaKey(row.fondo, row.fecha);

      if (seenKeys.has(key)) {
        errors.push({
          hoja: "fondo",
          fila: excelRow,
          columna: "fecha",
          motivo: `Fecha duplicada para este fondo (ya definida en la fila ${seenKeys.get(key)}).`,
        });
        continue;
      }
      seenKeys.set(key, excelRow);

      const navEsperado = navByKey.get(key);
      if (navEsperado == null) {
        errors.push({
          hoja: "fondo",
          fila: excelRow,
          columna: "fecha",
          motivo: `No hay un valor de cuotaparte definido para esta fecha (y fondo) en la hoja "valor_cuotaparte".`,
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

      const totalPosiciones = totalPorKey.get(key);
      if (totalPosiciones == null) {
        errors.push({
          hoja: "fondo",
          fila: excelRow,
          columna: "valor_total_fondo",
          motivo: `No hay posiciones cargadas en la hoja "posiciones" para esta fecha de corte (y fondo).`,
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
        fondo: row.fondo,
        fecha: row.fecha,
        valorTotalFondo: row.valor_total_fondo,
        cuotapartesTotales: row.cuotapartes_totales,
      });
    }
  }

  // --- movimientos: cliente_id debe existir, (fondo, fecha) debe tener NAV definido ---
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
    if (!navByKey.has(fondoFechaKey(row.fondo, row.fecha))) {
      errors.push({
        hoja: "movimientos",
        fila: excelRow,
        columna: "fecha",
        motivo: `No hay un valor de cuotaparte definido para esta fecha (y fondo) en la hoja "valor_cuotaparte".`,
      });
      continue;
    }

    movements.push({
      fondo: row.fondo,
      clienteId: row.cliente_id,
      fecha: row.fecha,
      tipo: row.tipo,
      monto: row.monto,
    });
  }

  const navRows = [...navByKey.entries()].map(([key, valorCuotaparte]) => {
    const [fondo, fechaStr] = key.split("|");
    return { fondo, fecha: new Date(fechaStr), valorCuotaparte };
  });

  if (errors.length > 0) {
    return { ok: false, errors };
  }

  return {
    ok: true,
    data: { navRows, positions, snapshots, clients, movements },
  };
}
