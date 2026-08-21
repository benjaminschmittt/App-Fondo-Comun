import { describe, it, expect } from "vitest";
import { validateWorkbook } from "./validate";
import type { ParsedWorkbook, SheetRecord } from "./parse";

// Helper: fila {row, data} a partir de un numero de fila y un objeto plano.
function row(n: number, data: SheetRecord["data"]): SheetRecord {
  return { row: n, data };
}

const VALID_WORKBOOK: ParsedWorkbook = {
  valorCuotaparte: [
    row(2, { fecha: new Date("2026-01-31"), valor_cuotaparte: 100 }),
    row(3, { fecha: new Date("2026-02-28"), valor_cuotaparte: 105 }),
  ],
  posiciones: [
    row(2, {
      fecha: new Date("2026-02-28"),
      ticker: "AAPL",
      nombre: "Apple",
      tipo_instrumento: "Accion",
      sector: "Tech",
      cantidad: 10,
      precio: 100,
    }),
  ],
  fondo: [
    row(2, {
      fecha: new Date("2026-02-28"),
      valor_total_fondo: 1000,
      valor_cuotaparte: 105,
      cuotapartes_totales: 9.52,
    }),
  ],
  clientes: [row(2, { cliente_id: "CLI-0001", nombre: "Juan Perez", email: "juan@ejemplo.com", activo: "si" })],
  movimientos: [row(2, { cliente_id: "CLI-0001", fecha: new Date("2026-01-31"), tipo: "aporte", monto: 1000 })],
};

describe("validateWorkbook — archivo valido", () => {
  it("acepta un archivo bien formado y deriva los datos correctos", () => {
    const result = validateWorkbook(VALID_WORKBOOK);
    expect(result.ok).toBe(true);
    if (!result.ok) return;
    expect(result.data.clients).toHaveLength(1);
    expect(result.data.navRows).toHaveLength(2);
    expect(result.data.positions).toHaveLength(1);
    // valor_mercado se recalcula (cantidad * precio), nunca se confia en el Excel.
    expect(result.data.positions[0].valorMercado).toBe(1000);
    expect(result.data.movements).toHaveLength(1);
  });

  it("normaliza el ticker a mayusculas", () => {
    const wb: ParsedWorkbook = {
      ...VALID_WORKBOOK,
      posiciones: [{ ...VALID_WORKBOOK.posiciones[0], data: { ...VALID_WORKBOOK.posiciones[0].data, ticker: "aapl" } }],
    };
    const result = validateWorkbook(wb);
    expect(result.ok).toBe(true);
    if (result.ok) expect(result.data.positions[0].ticker).toBe("AAPL");
  });
});

describe("validateWorkbook — archivo mal armado (regresion del caso probado en produccion)", () => {
  // Mismo archivo de prueba usado manualmente durante la sesion: 8 errores
  // distintos, ninguno debe tirar una excepcion, todos deben reportarse.
  const BAD_WORKBOOK: ParsedWorkbook = {
    valorCuotaparte: [
      row(2, { fecha: new Date("2026-01-31"), valor_cuotaparte: 100 }),
      row(3, { fecha: new Date("2026-01-31"), valor_cuotaparte: 105 }), // fecha duplicada
    ],
    posiciones: [
      row(2, {
        fecha: new Date("2026-01-31"),
        ticker: "AAPL",
        nombre: "Apple",
        tipo_instrumento: "Accion",
        sector: "Tech",
        cantidad: 10,
        precio: 100,
      }),
      row(3, {
        fecha: new Date("2026-02-28"),
        ticker: "MSFT",
        nombre: "Microsoft",
        tipo_instrumento: "Accion",
        sector: "Tech",
        cantidad: -5, // cantidad negativa
        precio: 50,
      }),
      row(4, {
        fecha: "no es una fecha", // fecha invalida
        ticker: "SPY",
        nombre: "ETF",
        tipo_instrumento: "ETF",
        sector: "Div",
        cantidad: 10,
        precio: 10,
      }),
    ],
    fondo: [
      row(2, {
        fecha: new Date("2026-01-31"),
        valor_total_fondo: 999999, // no coincide con la suma de posiciones
        valor_cuotaparte: 100,
        cuotapartes_totales: 10,
      }),
    ],
    clientes: [
      row(2, { cliente_id: "CLI-0001", nombre: "Juan Perez", email: "no-es-un-email", activo: "si" }), // email invalido
      row(3, { cliente_id: "CLI-0001", nombre: "Juan Duplicado", email: "juan2@ejemplo.com", activo: "tal-vez" }), // activo invalido
    ],
    movimientos: [
      row(2, { cliente_id: "CLI-9999", fecha: new Date("2026-01-31"), tipo: "aporte", monto: 1000 }), // cliente inexistente
      row(3, { cliente_id: "CLI-0001", fecha: new Date("2026-01-31"), tipo: "compra", monto: 500 }), // tipo invalido
    ],
  };

  it("rechaza el archivo sin tirar una excepcion", () => {
    expect(() => validateWorkbook(BAD_WORKBOOK)).not.toThrow();
    const result = validateWorkbook(BAD_WORKBOOK);
    expect(result.ok).toBe(false);
  });

  it("reporta exactamente los 8 errores esperados, con hoja/fila/motivo", () => {
    const result = validateWorkbook(BAD_WORKBOOK);
    if (result.ok) throw new Error("se esperaba que la validacion fallara");
    expect(result.errors).toHaveLength(8);

    const motivos = result.errors.map((e) => `${e.hoja}:${e.fila}`).sort();
    expect(motivos).toEqual(
      [
        "posiciones:3", // cantidad negativa
        "posiciones:4", // fecha invalida
        "clientes:2", // email invalido
        "clientes:3", // activo invalido
        "movimientos:3", // tipo invalido
        "valor_cuotaparte:3", // fecha duplicada
        "fondo:2", // total no coincide
        "movimientos:2", // cliente inexistente
      ].sort()
    );
  });
});

describe("validateWorkbook — casos borde de referencias cruzadas", () => {
  it("rechaza una posicion en una fecha sin valor_cuotaparte definido", () => {
    const wb: ParsedWorkbook = {
      ...VALID_WORKBOOK,
      posiciones: [
        row(2, {
          fecha: new Date("2026-03-31"), // no existe en valorCuotaparte
          ticker: "AAPL",
          nombre: "Apple",
          tipo_instrumento: "Accion",
          sector: "Tech",
          cantidad: 10,
          precio: 100,
        }),
      ],
    };
    const result = validateWorkbook(wb);
    expect(result.ok).toBe(false);
    if (!result.ok) {
      expect(result.errors.some((e) => e.hoja === "posiciones" && e.motivo.includes("valor_cuotaparte"))).toBe(true);
    }
  });

  it("rechaza cliente_id duplicado en la hoja clientes", () => {
    const wb: ParsedWorkbook = {
      ...VALID_WORKBOOK,
      clientes: [
        row(2, { cliente_id: "CLI-0001", nombre: "Juan", email: "juan@ejemplo.com", activo: "si" }),
        row(3, { cliente_id: "CLI-0001", nombre: "Juan Otra Vez", email: "otro@ejemplo.com", activo: "si" }),
      ],
    };
    const result = validateWorkbook(wb);
    expect(result.ok).toBe(false);
    if (!result.ok) {
      expect(result.errors.some((e) => e.hoja === "clientes" && e.motivo.includes("duplicado"))).toBe(true);
    }
  });
});
