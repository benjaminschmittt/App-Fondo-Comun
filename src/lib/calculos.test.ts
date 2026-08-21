import { describe, it, expect } from "vitest";
import {
  cuotapartesEnFecha,
  evolucionInversion,
  aportesNetos,
  cuotapartesDeMovimiento,
  rendimientoFondo,
  tirAnualizada,
  type Movement,
  type NavPoint,
} from "./calculos";

// Datos reales importados durante Fase 1/2 (docs/fondo-archivo-madre-ejemplo.xlsx,
// cliente Juan Perez). Sirven de fixture de regresion: si estos numeros
// cambian, algo se rompio.
const NAV_SERIES: NavPoint[] = [
  { fecha: new Date("2025-07-31"), valorCuotaparte: 100.0 },
  { fecha: new Date("2025-08-31"), valorCuotaparte: 102.3 },
  { fecha: new Date("2025-09-30"), valorCuotaparte: 101.1 },
  { fecha: new Date("2025-10-31"), valorCuotaparte: 105.6 },
  { fecha: new Date("2025-11-30"), valorCuotaparte: 108.2 },
  { fecha: new Date("2025-12-31"), valorCuotaparte: 110.5 },
  { fecha: new Date("2026-01-31"), valorCuotaparte: 109.0 },
  { fecha: new Date("2026-02-28"), valorCuotaparte: 113.4 },
  { fecha: new Date("2026-03-31"), valorCuotaparte: 117.8 },
  { fecha: new Date("2026-04-30"), valorCuotaparte: 119.2 },
  { fecha: new Date("2026-05-31"), valorCuotaparte: 124.6 },
  { fecha: new Date("2026-06-30"), valorCuotaparte: 128.9 },
];

const JUAN_MOVEMENTS: Movement[] = [
  { fecha: new Date("2025-07-31"), tipo: "aporte", monto: 100000 },
  { fecha: new Date("2026-01-31"), tipo: "aporte", monto: 50000 },
];

describe("cuotapartesEnFecha", () => {
  it("acumula cuotapartes de aportes hasta la fecha (inclusive)", () => {
    const cp = cuotapartesEnFecha(JUAN_MOVEMENTS, NAV_SERIES, new Date("2026-06-30"));
    // 100000/100 + 50000/109 = 1000 + 458.7155963...
    expect(cp).toBeCloseTo(1458.7155963302753, 6);
  });

  it("solo cuenta movimientos hasta la fecha dada, no los posteriores", () => {
    const cp = cuotapartesEnFecha(JUAN_MOVEMENTS, NAV_SERIES, new Date("2025-12-31"));
    expect(cp).toBeCloseTo(1000, 6); // solo el aporte de julio
  });

  it("retiros restan cuotapartes", () => {
    const movs: Movement[] = [
      { fecha: new Date("2025-07-31"), tipo: "aporte", monto: 100000 },
      { fecha: new Date("2025-08-31"), tipo: "retiro", monto: 20000 },
    ];
    const cp = cuotapartesEnFecha(movs, NAV_SERIES, new Date("2025-08-31"));
    // 1000 - 20000/102.3
    expect(cp).toBeCloseTo(1000 - 20000 / 102.3, 6);
  });
});

describe("evolucionInversion", () => {
  it("un punto por cada fecha del historico de NAV, ordenado", () => {
    const serie = evolucionInversion(JUAN_MOVEMENTS, NAV_SERIES);
    expect(serie).toHaveLength(NAV_SERIES.length);
    expect(serie[0].fecha).toEqual(new Date("2025-07-31"));
    expect(serie[serie.length - 1].fecha).toEqual(new Date("2026-06-30"));
  });

  it("valorInversion = cuotapartes * NAV de esa fecha, y matchea el valor actual conocido", () => {
    const serie = evolucionInversion(JUAN_MOVEMENTS, NAV_SERIES);
    const ultimo = serie[serie.length - 1];
    expect(ultimo.valorInversion).toBeCloseTo(188028.44036697248, 4);
  });

  it("antes del primer aporte, valorInversion es 0 (no negativo ni NaN)", () => {
    const movs: Movement[] = [{ fecha: new Date("2026-01-31"), tipo: "aporte", monto: 50000 }];
    const serie = evolucionInversion(movs, NAV_SERIES);
    expect(serie[0].valorInversion).toBe(0);
  });
});

describe("aportesNetos", () => {
  it("suma aportes menos retiros", () => {
    expect(aportesNetos(JUAN_MOVEMENTS)).toBe(150000);
  });

  it("da 0 si no hay movimientos", () => {
    expect(aportesNetos([])).toBe(0);
  });
});

describe("cuotapartesDeMovimiento", () => {
  it("calcula monto / NAV de la fecha del movimiento", () => {
    const cp = cuotapartesDeMovimiento(
      { fecha: new Date("2026-01-31"), tipo: "aporte", monto: 50000 },
      NAV_SERIES
    );
    expect(cp).toBeCloseTo(50000 / 109.0, 6);
  });
});

describe("rendimientoFondo (TWR)", () => {
  it("calcula mensual, trimestral y acumulado por posicion en la serie, no por resta de fechas", () => {
    const r = rendimientoFondo(NAV_SERIES);
    // Verificado a mano: estos son los valores que se mostraron en produccion.
    expect(r.mensual).toBeCloseTo(128.9 / 124.6 - 1, 9); // ~3.45%
    expect(r.trimestral).toBeCloseTo(128.9 / 117.8 - 1, 9); // ~9.42%
    expect(r.acumulado).toBeCloseTo(128.9 / 100 - 1, 9); // 28.9%
  });

  it("devuelve null si no hay suficiente historico para el periodo", () => {
    const cortita = NAV_SERIES.slice(-1); // un solo punto
    const r = rendimientoFondo(cortita);
    expect(r.mensual).toBeNull();
    expect(r.trimestral).toBeNull();
    expect(r.acumulado).toBe(0); // unico punto vs si mismo
  });

  it("devuelve todo null con una serie vacia", () => {
    const r = rendimientoFondo([]);
    expect(r).toEqual({ mensual: null, trimestral: null, acumulado: null });
  });
});

describe("tirAnualizada (money-weighted return / XIRR)", () => {
  it("matchea el valor verificado a mano para el caso real de Juan", () => {
    const tir = tirAnualizada(JUAN_MOVEMENTS, 188028.44036697248, new Date("2026-06-30"));
    expect(tir).not.toBeNull();
    expect(tir!).toBeCloseTo(0.349, 2); // ~34.9% anualizado
  });

  it("caso de control: aporte unico, un año exacto, debe dar la tasa de crecimiento simple", () => {
    const tir = tirAnualizada(
      [{ fecha: new Date("2025-01-01"), tipo: "aporte", monto: 100000 }],
      150000,
      new Date("2026-01-01")
    );
    expect(tir).not.toBeNull();
    // ~50% (la pequeña diferencia es la convencion de 365.25 dias/año)
    expect(tir!).toBeCloseTo(0.5, 1);
  });

  it("el VAN evaluado en la TIR encontrada es (casi) cero", () => {
    const tir = tirAnualizada(JUAN_MOVEMENTS, 188028.44036697248, new Date("2026-06-30"));
    expect(tir).not.toBeNull();

    const t0 = JUAN_MOVEMENTS[0].fecha.getTime();
    const cashflows = [
      ...JUAN_MOVEMENTS.map((m) => ({ fecha: m.fecha, monto: -m.monto })),
      { fecha: new Date("2026-06-30"), monto: 188028.44036697248 },
    ];
    const van = cashflows.reduce((sum, cf) => {
      const years = (cf.fecha.getTime() - t0) / (1000 * 60 * 60 * 24 * 365.25);
      return sum + cf.monto / Math.pow(1 + tir!, years);
    }, 0);
    expect(Math.abs(van)).toBeLessThan(1);
  });

  it("devuelve null sin movimientos", () => {
    expect(tirAnualizada([], 1000, new Date())).toBeNull();
  });

  it("devuelve null con valor actual 0 o negativo", () => {
    expect(tirAnualizada(JUAN_MOVEMENTS, 0, new Date("2026-06-30"))).toBeNull();
  });

  it("devuelve null si todos los flujos ocurren el mismo dia (no se puede anualizar)", () => {
    const hoy = new Date("2026-01-01");
    const tir = tirAnualizada([{ fecha: hoy, tipo: "aporte", monto: 100000 }], 100000, hoy);
    expect(tir).toBeNull();
  });
});
