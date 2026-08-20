// Calculos financieros del portal. Funciones puras: no tocan la base
// de datos ni la sesion. Ver docs/portal-clientes-fondo-documento-tecnico.md
// seccion 5 ("la clave de precision que evita errores").

export type NavPoint = { fecha: Date; valorCuotaparte: number };
export type Movement = { fecha: Date; tipo: "aporte" | "retiro"; monto: number };

export type PuntoEvolucion = {
  fecha: Date;
  valorCuotaparte: number;
  cuotapartes: number;
  valorInversion: number;
};

function dayKey(d: Date): string {
  return d.toISOString().slice(0, 10);
}

function navPorFecha(navSeries: NavPoint[]): Map<string, number> {
  const map = new Map<string, number>();
  for (const p of navSeries) map.set(dayKey(p.fecha), p.valorCuotaparte);
  return map;
}

// Cuotapartes acumuladas de un cliente hasta (e incluyendo) una fecha dada.
export function cuotapartesEnFecha(
  movements: Movement[],
  navSeries: NavPoint[],
  hasta: Date
): number {
  const nav = navPorFecha(navSeries);
  const hastaKey = dayKey(hasta);

  return movements
    .filter((m) => dayKey(m.fecha) <= hastaKey)
    .reduce((acc, m) => {
      const navEnFecha = nav.get(dayKey(m.fecha));
      // Si no hay NAV para la fecha del movimiento, el importador ya
      // deberia haberlo rechazado. Se ignora en vez de romper el dashboard.
      if (navEnFecha == null || navEnFecha <= 0) return acc;
      const cp = m.monto / navEnFecha;
      return acc + (m.tipo === "aporte" ? cp : -cp);
    }, 0);
}

// Serie completa de evolucion de la inversion de un cliente, un punto
// por cada fecha de corte del historico de la cuotaparte.
export function evolucionInversion(
  movements: Movement[],
  navSeries: NavPoint[]
): PuntoEvolucion[] {
  return [...navSeries]
    .sort((a, b) => a.fecha.getTime() - b.fecha.getTime())
    .map((p) => {
      const cuotapartes = cuotapartesEnFecha(movements, navSeries, p.fecha);
      return {
        fecha: p.fecha,
        valorCuotaparte: p.valorCuotaparte,
        cuotapartes,
        valorInversion: cuotapartes > 0 ? cuotapartes * p.valorCuotaparte : 0,
      };
    });
}

// Aportes menos retiros (capital neto invertido), en pesos.
export function aportesNetos(movements: Movement[]): number {
  return movements.reduce(
    (acc, m) => acc + (m.tipo === "aporte" ? m.monto : -m.monto),
    0
  );
}

// Cuotapartes que representa un movimiento individual (monto / NAV de esa fecha).
export function cuotapartesDeMovimiento(
  m: Movement,
  navSeries: NavPoint[]
): number {
  const nav = navPorFecha(navSeries).get(dayKey(m.fecha));
  return nav && nav > 0 ? m.monto / nav : 0;
}

// ============================================================
// Rendimiento del FONDO (Time-Weighted Return).
//
// Como el fondo funciona con cuotapartes, el crecimiento del valor de
// la cuotaparte YA ES el TWR: los aportes/retiros de los clientes no
// distorsionan este numero (compran/venden cuotapartes al valor del
// dia, nunca inflan ni diluyen el rendimiento del fondo en si). Por
// eso alcanza con comparar el NAV actual contra el NAV de hace 1 mes /
// 3 meses / el primero de la serie — sin necesidad de encadenar
// sub-periodos geometricamente, que es la parte complicada del TWR
// cuando SI hay flujos de caja externos al calculo (no es el caso aca).
// ============================================================

export type RendimientoFondo = {
  mensual: number | null;
  trimestral: number | null;
  acumulado: number | null;
};

// Compara contra la posicion N-atras en la serie (no por aritmetica de
// fechas): el historico es un corte por mes segun la convencion del
// Excel, y restar "un mes" a una fecha de fin de mes con setUTCMonth
// desalinea cuando el mes de origen tiene menos dias (ej. 30/jun - 1 mes
// = 30/may, pero el dato real esta cargado el 31/may) — se salta un
// corte entero. Ir por posicion evita ese problema de raiz.
function navHaceNCortes(sorted: NavPoint[], n: number): number | null {
  const idx = sorted.length - 1 - n;
  return idx >= 0 ? sorted[idx].valorCuotaparte : null;
}

export function rendimientoFondo(navSeries: NavPoint[]): RendimientoFondo {
  if (navSeries.length === 0) return { mensual: null, trimestral: null, acumulado: null };

  const sorted = [...navSeries].sort((a, b) => a.fecha.getTime() - b.fecha.getTime());
  const navActual = sorted[sorted.length - 1].valorCuotaparte;

  const navHaceUnMes = navHaceNCortes(sorted, 1);
  const navHaceTresMeses = navHaceNCortes(sorted, 3);
  const navInicial = sorted[0].valorCuotaparte;

  return {
    mensual: navHaceUnMes && navHaceUnMes > 0 ? navActual / navHaceUnMes - 1 : null,
    trimestral: navHaceTresMeses && navHaceTresMeses > 0 ? navActual / navHaceTresMeses - 1 : null,
    acumulado: navInicial > 0 ? navActual / navInicial - 1 : null,
  };
}

// ============================================================
// Rentabilidad ANUALIZADA de un cliente particular (TIR / money-weighted
// return, el equivalente a XIRR de una planilla de calculo).
//
// A diferencia del TWR del fondo, esto SI depende de cuando y cuanto
// aporto/retiro cada cliente en particular — es la tasa que realmente
// rindio su plata, a diferencia del % simple (ganancia / aportes) que
// engaña cuando hay aportes en momentos distintos.
// ============================================================

type Cashflow = { fecha: Date; monto: number };

function valorActualNeto(cashflows: Cashflow[], rate: number, t0: number): number {
  return cashflows.reduce((sum, cf) => {
    const years = (cf.fecha.getTime() - t0) / (1000 * 60 * 60 * 24 * 365.25);
    return sum + cf.monto / Math.pow(1 + rate, years);
  }, 0);
}

export function tirAnualizada(
  movements: Movement[],
  valorActual: number,
  fechaCorte: Date
): number | null {
  if (movements.length === 0 || valorActual <= 0) return null;

  const cashflows: Cashflow[] = [
    ...movements.map((m) => ({
      fecha: m.fecha,
      monto: m.tipo === "aporte" ? -m.monto : m.monto,
    })),
    { fecha: fechaCorte, monto: valorActual },
  ].sort((a, b) => a.fecha.getTime() - b.fecha.getTime());

  const t0 = cashflows[0].fecha.getTime();
  const spanDays = (cashflows[cashflows.length - 1].fecha.getTime() - t0) / (1000 * 60 * 60 * 24);
  // Con menos de una semana de historia, "anualizar" es ruido puro.
  if (spanDays < 7) return null;

  let lo = -0.9999;
  let hi = 100;
  let vanLo = valorActualNeto(cashflows, lo, t0);
  const vanHi = valorActualNeto(cashflows, hi, t0);

  if (!Number.isFinite(vanLo) || !Number.isFinite(vanHi) || vanLo * vanHi > 0) {
    return null; // caso degenerado, no se encontro una raiz en el rango
  }

  for (let i = 0; i < 100; i++) {
    const mid = (lo + hi) / 2;
    const vanMid = valorActualNeto(cashflows, mid, t0);
    if (Math.abs(vanMid) < 1e-6) return mid;
    if (Math.sign(vanMid) === Math.sign(vanLo)) {
      lo = mid;
      vanLo = vanMid;
    } else {
      hi = mid;
    }
  }
  return (lo + hi) / 2;
}
