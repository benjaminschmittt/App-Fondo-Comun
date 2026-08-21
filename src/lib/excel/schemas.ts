import { z } from "zod";

// Los valores de fecha ya llegan como Date (ExcelJS los parsea asi para
// celdas con formato fecha). Si el admin escribio texto en vez de fecha,
// esto falla con un mensaje claro en vez de romper silenciosamente.
const fecha = z.date({ error: "La fecha no tiene formato de fecha valido." });

const numeroPositivo = z
  .number({ error: "Debe ser un numero." })
  .positive({ error: "Debe ser mayor a 0." });

const si_no = z
  .string({ error: "Debe ser \"si\" o \"no\"." })
  .trim()
  .transform((s) => s.toLowerCase())
  .pipe(z.enum(["si", "no"], { error: 'Debe ser "si" o "no".' }));

const aporte_retiro = z
  .string({ error: 'Debe ser "aporte" o "retiro".' })
  .trim()
  .transform((s) => s.toLowerCase())
  .pipe(z.enum(["aporte", "retiro"], { error: 'Debe ser "aporte" o "retiro".' }));

// Columna "fondo" opcional (Fase 3, Etapa 1): si se omite, la fila se
// asigna al fondo default en el momento de importar (ver import.ts). No
// se resuelve nombre -> id aca porque este archivo no toca la base de
// datos — validate.ts sigue siendo puro/sincrono a proposito.
export const DEFAULT_FONDO_SENTINEL = "__default__";

const fondoOpcional = z
  .string()
  .trim()
  .nullish()
  .transform((s) => (s && s.length > 0 ? s : DEFAULT_FONDO_SENTINEL));

export const ValorCuotaparteRow = z.object({
  fecha,
  valor_cuotaparte: numeroPositivo,
  fondo: fondoOpcional,
});

export const PosicionRow = z.object({
  fecha,
  ticker: z.string({ error: "Ticker requerido." }).trim().min(1, { error: "Ticker requerido." }),
  nombre: z.string({ error: "Nombre requerido." }).trim().min(1, { error: "Nombre requerido." }),
  tipo_instrumento: z
    .string({ error: "Tipo de instrumento requerido." })
    .trim()
    .min(1, { error: "Tipo de instrumento requerido." }),
  sector: z.string({ error: "Sector requerido." }).trim().min(1, { error: "Sector requerido." }),
  cantidad: numeroPositivo,
  precio: z.number({ error: "Debe ser un numero." }).nonnegative({ error: "No puede ser negativo." }),
  fondo: fondoOpcional,
});

export const FondoRow = z.object({
  fecha,
  valor_total_fondo: numeroPositivo,
  valor_cuotaparte: numeroPositivo,
  cuotapartes_totales: numeroPositivo,
  fondo: fondoOpcional,
});

export const ClienteRow = z.object({
  cliente_id: z.string({ error: "cliente_id requerido." }).trim().min(1, { error: "cliente_id requerido." }),
  nombre: z.string({ error: "nombre requerido." }).trim().min(1, { error: "nombre requerido." }),
  email: z.email({ error: "Email invalido." }).trim(),
  activo: si_no,
});

export const MovimientoRow = z.object({
  cliente_id: z.string({ error: "cliente_id requerido." }).trim().min(1, { error: "cliente_id requerido." }),
  fecha,
  tipo: aporte_retiro,
  monto: numeroPositivo,
  fondo: fondoOpcional,
});

export type ValorCuotaparteRow = z.infer<typeof ValorCuotaparteRow>;
export type PosicionRow = z.infer<typeof PosicionRow>;
export type FondoRow = z.infer<typeof FondoRow>;
export type ClienteRow = z.infer<typeof ClienteRow>;
export type MovimientoRow = z.infer<typeof MovimientoRow>;
