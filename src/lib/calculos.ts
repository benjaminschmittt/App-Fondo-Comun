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
