import ExcelJS from "exceljs";

// Convierte el valor crudo de una celda a un tipo simple. Las celdas con
// formula vienen como { formula, result } en vez del valor final: usamos
// el resultado cacheado solo para ubicar la celda en los mensajes de error,
// pero el importador SIEMPRE recalcula los totales el mismo (nunca confia
// en el resultado cacheado de una formula de Excel).
export function cellValue(v: ExcelJS.CellValue): string | number | Date | boolean | null {
  if (v === null || v === undefined) return null;
  if (v instanceof Date) return v;
  if (typeof v === "object") {
    if ("result" in v) {
      const result = (v as { result?: ExcelJS.CellValue }).result;
      return typeof result === "object" ? null : (result ?? null);
    }
    if ("richText" in v) {
      return (v as { richText: { text: string }[] }).richText
        .map((rt) => rt.text)
        .join("");
    }
    if ("text" in v) {
      return String((v as { text: unknown }).text);
    }
    return null;
  }
  return v;
}

export type SheetRow = Record<string, string | number | Date | boolean | null>;
export type SheetRecord = { row: number; data: SheetRow };

// Lee una hoja como una lista de {row, data}, usando la fila 1 como
// encabezados. "row" es el numero de fila real en Excel (para reportar
// errores). Ignora filas completamente vacias.
export function sheetToObjects(ws: ExcelJS.Worksheet): SheetRecord[] {
  const headerRow = ws.getRow(1);
  const headers: string[] = [];
  headerRow.eachCell({ includeEmpty: false }, (cell, colNumber) => {
    headers[colNumber] = String(cell.value ?? "").trim();
  });

  const rows: SheetRecord[] = [];
  for (let r = 2; r <= ws.rowCount; r++) {
    const row = ws.getRow(r);
    if (row.cellCount === 0) continue;

    const obj: SheetRow = {};
    let hasAny = false;
    headers.forEach((h, colNumber) => {
      if (!h) return;
      const value = cellValue(row.getCell(colNumber).value);
      if (value !== null && value !== "") hasAny = true;
      obj[h] = value;
    });

    if (hasAny) rows.push({ row: r, data: obj });
  }
  return rows;
}

export type ParsedWorkbook = {
  valorCuotaparte: SheetRecord[];
  posiciones: SheetRecord[];
  fondo: SheetRecord[];
  clientes: SheetRecord[];
  movimientos: SheetRecord[];
};

const REQUIRED_SHEETS = [
  "valor_cuotaparte",
  "posiciones",
  "fondo",
  "clientes",
  "movimientos",
] as const;

export class ExcelFormatError extends Error {}

export async function readWorkbook(buffer: Buffer): Promise<ParsedWorkbook> {
  const wb = new ExcelJS.Workbook();
  await wb.xlsx.load(buffer as unknown as ExcelJS.Buffer);

  const missing = REQUIRED_SHEETS.filter((name) => !wb.getWorksheet(name));
  if (missing.length > 0) {
    throw new ExcelFormatError(
      `Faltan hojas obligatorias en el Excel: ${missing.join(", ")}.`
    );
  }

  return {
    valorCuotaparte: sheetToObjects(wb.getWorksheet("valor_cuotaparte")!),
    posiciones: sheetToObjects(wb.getWorksheet("posiciones")!),
    fondo: sheetToObjects(wb.getWorksheet("fondo")!),
    clientes: sheetToObjects(wb.getWorksheet("clientes")!),
    movimientos: sheetToObjects(wb.getWorksheet("movimientos")!),
  };
}
