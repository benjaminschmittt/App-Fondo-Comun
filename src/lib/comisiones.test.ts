import { describe, it, expect } from "vitest";
import {
  ajustarMarcaDeAgua,
  calcularFeeCliente,
  cuotapartesTransferidasHasta,
  hwmDespuesDeFee,
  type Transferencia,
} from "./comisiones";
import type { Movement, NavPoint } from "./calculos";

// Serie de NAV generica para los tests: mismo estilo que calculos.test.ts.
const NAV: NavPoint[] = [
  { fecha: new Date("2026-01-31"), valorCuotaparte: 1000 },
  { fecha: new Date("2026-02-28"), valorCuotaparte: 800 },
  { fecha: new Date("2026-03-31"), valorCuotaparte: 900 },
  { fecha: new Date("2026-04-30"), valorCuotaparte: 950 },
  { fecha: new Date("2026-05-31"), valorCuotaparte: 1050 },
  { fecha: new Date("2026-06-30"), valorCuotaparte: 1200 },
  { fecha: new Date("2026-07-31"), valorCuotaparte: 1200 }, // NAV plano, para el test de retiro despues de un cobro
];

describe("calcularFeeCliente — casos base", () => {
  it("1) no supera la marca de agua: comision 0, marca no cambia", () => {
    // 1000 cuotapartes a NAV 800 = $800.000, marca en $1.000.000 (esta abajo).
    const movements: Movement[] = [
      { fecha: new Date("2026-01-31"), tipo: "aporte", monto: 1000000 },
    ];
    const r = calcularFeeCliente({
      hwmAnterior: 1000000,
      hwmDesde: new Date("2026-01-31"),
      movements,
      navSeries: NAV,
      periodoFin: new Date("2026-02-28"),
      feeRate: 0.2,
    });
    expect(r.gananciaSujetaAFee).toBeCloseTo(-200000, 6);
    expect(r.feeAmount).toBe(0);
    expect(r.cuotapartesATransferir).toBe(0);
    expect(r.hwmNueva).toBe(1000000); // la marca no baja por rendimiento negativo
  });

  it("2) supera la marca de agua: cobra solo sobre el excedente (ejemplo del diseño)", () => {
    // 1000 cuotapartes, NAV actual 1200 -> valor $1.200.000. Marca $1.000.000.
    const movements: Movement[] = [
      { fecha: new Date("2026-01-31"), tipo: "aporte", monto: 1000000 },
    ];
    const r = calcularFeeCliente({
      hwmAnterior: 1000000,
      hwmDesde: new Date("2026-01-31"),
      movements,
      navSeries: NAV,
      periodoFin: new Date("2026-06-30"),
      feeRate: 0.2,
    });
    expect(r.cuotapartesAntes).toBeCloseTo(1000, 6);
    expect(r.valorActual).toBeCloseTo(1200000, 6);
    expect(r.gananciaSujetaAFee).toBeCloseTo(200000, 6);
    expect(r.feeAmount).toBeCloseTo(40000, 6);
    expect(r.cuotapartesATransferir).toBeCloseTo(33.333333, 5);
    expect(r.cuotapartesDespues).toBeCloseTo(966.666667, 5);
    // La marca nueva es el valor NETO post-fee, no el valor pre-fee.
    expect(r.hwmNueva).toBeCloseTo(1160000, 6);
  });

  it("6) cae y despues recupera sin superar la marca anterior: comision 0", () => {
    const movements: Movement[] = [
      { fecha: new Date("2026-01-31"), tipo: "aporte", monto: 1000000 },
    ];
    // Cae a NAV 800 en feb, sube a NAV 950 en abril (1000 cuotapartes * 950 = 950.000 < 1.000.000).
    const r = calcularFeeCliente({
      hwmAnterior: 1000000,
      hwmDesde: new Date("2026-01-31"),
      movements,
      navSeries: NAV,
      periodoFin: new Date("2026-04-30"),
      feeRate: 0.2,
    });
    expect(r.valorActual).toBeCloseTo(950000, 6);
    expect(r.feeAmount).toBe(0);
    expect(r.hwmNueva).toBe(1000000);
  });
});

describe("ajustarMarcaDeAgua — aportes y retiros intermedios", () => {
  it("3) un aporte intermedio no genera base de comision (la marca sube el mismo monto)", () => {
    // Entra con $1.000.000 en enero (NAV 1000 -> 1000 cuotapartes).
    // Aporta $500.000 mas en marzo (NAV 900 -> 555.5556 cuotapartes nuevas).
    const movements: Movement[] = [
      { fecha: new Date("2026-01-31"), tipo: "aporte", monto: 1000000 },
      { fecha: new Date("2026-03-31"), tipo: "aporte", monto: 500000 },
    ];
    const hwmAjustada = ajustarMarcaDeAgua(1000000, movements, NAV, new Date("2026-01-31"), new Date("2026-03-31"));
    // La marca sube exactamente el aporte, sin importar el NAV al que entro.
    expect(hwmAjustada).toBeCloseTo(1500000, 6);

    // El fondo bajo de NAV 1000 (enero) a NAV 900 (marzo) antes del
    // aporte: la posicion original SI esta en perdida real ($100.000,
    // nada que ver con el aporte nuevo) al momento de evaluar. Es
    // correcto que la ganancia gravable de este calculo sea negativa —
    // lo que prueba este test es que el aporte NO agrego $500.000 de
    // "ganancia" encima de esa perdida real.
    const r = calcularFeeCliente({
      hwmAnterior: 1000000,
      hwmDesde: new Date("2026-01-31"),
      movements,
      navSeries: NAV,
      periodoFin: new Date("2026-03-31"),
      feeRate: 0.2,
    });
    expect(r.valorActual).toBeCloseTo(1400000, 6); // 900.000 (perdida) + 500.000 (aporte nuevo)
    expect(r.gananciaSujetaAFee).toBeCloseTo(-100000, 6); // NO -100.000 + 500.000
    expect(r.feeAmount).toBe(0);

    // Aislado: un aporte evaluado en el mismo instante en que se hizo
    // (sin que pase tiempo/NAV despues) nunca genera ganancia gravable
    // por si solo.
    const aporteSolo = calcularFeeCliente({
      hwmAnterior: 0,
      hwmDesde: null,
      movements: [{ fecha: new Date("2026-03-31"), tipo: "aporte", monto: 500000 }],
      navSeries: NAV,
      periodoFin: new Date("2026-03-31"),
      feeRate: 0.2,
    });
    expect(aporteSolo.gananciaSujetaAFee).toBeCloseTo(0, 6);
  });

  it("4) un retiro intermedio ajusta la marca PROPORCIONALMENTE, no dolar a dolar", () => {
    // Para que el valor ANTES del retiro sea exactamente $800.000 al NAV
    // de febrero (800), el cliente tiene que tener 1000 cuotapartes en
    // ese momento -> aporte de $1.000.000 en enero (NAV 1000). Retira
    // $400.000 (la mitad de su posicion) en febrero.
    const movements: Movement[] = [
      { fecha: new Date("2026-01-31"), tipo: "aporte", monto: 1000000 },
      { fecha: new Date("2026-02-28"), tipo: "retiro", monto: 400000 },
    ];
    const hwmAjustada = ajustarMarcaDeAgua(
      1000000,
      movements,
      NAV,
      new Date("2026-01-31"),
      new Date("2026-02-28")
    );
    // f = 400.000 / 800.000 = 50% -> hwm_nueva = 1.000.000 * 0.5 = 500.000
    expect(hwmAjustada).toBeCloseTo(500000, 6);
  });

  it("retiro proporcional preserva la posicion relativa (no la resta dolar a dolar)", () => {
    // Mismo escenario que el test anterior, pero comparado explicitamente
    // contra lo que daria una resta dolar a dolar (metodo descartado).
    const movements: Movement[] = [
      { fecha: new Date("2026-01-31"), tipo: "aporte", monto: 1000000 },
      { fecha: new Date("2026-02-28"), tipo: "retiro", monto: 400000 },
    ];
    const hwmProporcional = ajustarMarcaDeAgua(1000000, movements, NAV, new Date("2026-01-31"), new Date("2026-02-28"));
    const hwmDolarADolar = 1000000 - 400000; // metodo descartado, solo para comparar
    expect(hwmProporcional).not.toBeCloseTo(hwmDolarADolar, 0);
    expect(hwmProporcional).toBeCloseTo(500000, 6);

    // Verificacion economica: antes del retiro el cliente estaba 20%
    // abajo de su marca (800k vs 1.000k). Despues del retiro proporcional
    // sigue 20% abajo de la marca (400k vs 500k) — la posicion relativa
    // no cambia solo por retirar.
    const distanciaAntes = (1000000 - 800000) / 1000000;
    const distanciaDespues = (hwmProporcional - 400000) / hwmProporcional;
    expect(distanciaDespues).toBeCloseTo(distanciaAntes, 6);
  });

  it("5) cliente nuevo a mitad de periodo: la marca arranca en 0 y el aporte la fija", () => {
    const movements: Movement[] = [
      { fecha: new Date("2026-03-31"), tipo: "aporte", monto: 500000 }, // NAV 900 -> 555.5556 cuotapartes
    ];
    const r = calcularFeeCliente({
      hwmAnterior: 0,
      hwmDesde: null,
      movements,
      navSeries: NAV,
      periodoFin: new Date("2026-06-30"), // NAV 1200
      feeRate: 0.2,
    });
    // Cuotapartes: 500000/900 = 555.5556. Valor a NAV 1200: $666.667.
    expect(r.cuotapartesAntes).toBeCloseTo(555.555556, 5);
    expect(r.valorActual).toBeCloseTo(666666.67, 1);
    // La marca ajustada es 0 + 500.000 (el aporte) = 500.000, no 0 y no
    // el valor pre-existente del fondo (nunca tuvo exposicion antes).
    expect(r.hwmAjustada).toBeCloseTo(500000, 6);
    expect(r.gananciaSujetaAFee).toBeCloseTo(166666.67, 1);
    expect(r.feeAmount).toBeCloseTo(33333.33, 1);
  });
});

describe("calcularFeeCliente — precision y cobros sucesivos", () => {
  it("7) la conversion a cuotapartes es exacta (sin arrastre de redondeo)", () => {
    const movements: Movement[] = [{ fecha: new Date("2026-01-31"), tipo: "aporte", monto: 1000000 }];
    const r = calcularFeeCliente({
      hwmAnterior: 1000000,
      hwmDesde: new Date("2026-01-31"),
      movements,
      navSeries: NAV,
      periodoFin: new Date("2026-06-30"),
      feeRate: 0.2,
    });
    // cuotapartesATransferir * navActual debe reconstruir feeAmount exacto.
    expect(r.cuotapartesATransferir * r.navActual).toBeCloseTo(r.feeAmount, 9);
    // cuotapartesAntes - cuotapartesATransferir = cuotapartesDespues, exacto.
    expect(r.cuotapartesAntes - r.cuotapartesATransferir).toBeCloseTo(r.cuotapartesDespues, 12);
  });

  it("hwmDespuesDeFee: exportada para que la capa de datos la reuse en vez de reimplementarla", () => {
    // Con cobro: valor neto post-fee.
    expect(hwmDespuesDeFee(1200000, 40000, 1000000)).toBeCloseTo(1160000, 6);
    // Sin cobro (feeAmount 0): queda la marca ajustada, no el valor actual.
    expect(hwmDespuesDeFee(800000, 0, 1000000)).toBe(1000000);
  });

  it("8) no se cobra dos veces sobre la misma ganancia (periodo siguiente arranca desde la marca nueva)", () => {
    const movements: Movement[] = [{ fecha: new Date("2026-01-31"), tipo: "aporte", monto: 1000000 }];

    const periodo1 = calcularFeeCliente({
      hwmAnterior: 1000000,
      hwmDesde: new Date("2026-01-31"),
      movements,
      navSeries: NAV,
      periodoFin: new Date("2026-06-30"), // NAV 1200
      feeRate: 0.2,
    });
    expect(periodo1.feeAmount).toBeCloseTo(40000, 6);
    expect(periodo1.hwmNueva).toBeCloseTo(1160000, 6);

    // Transferencia real que se hubiera aplicado con ese resultado.
    const transferencias: Transferencia[] = [
      { fecha: new Date("2026-06-30"), shares: periodo1.cuotapartesATransferir },
    ];

    // Un segundo periodo, en una fecha de corte POSTERIOR real (no la
    // misma que periodo1), con NAV plano: si nada cambio, no debe cobrar
    // de nuevo sobre la misma ganancia.
    const periodo2 = calcularFeeCliente({
      hwmAnterior: periodo1.hwmNueva,
      hwmDesde: new Date("2026-06-30"),
      movements,
      navSeries: NAV,
      transferenciasPrevias: transferencias,
      periodoFin: new Date("2026-07-31"),
      feeRate: 0.2,
    });
    // cuotapartesAntes ya tiene que reflejar que se le sacaron cuotapartes.
    expect(periodo2.cuotapartesAntes).toBeCloseTo(966.666667, 5);
    expect(periodo2.gananciaSujetaAFee).toBeCloseTo(0, 6);
    expect(periodo2.feeAmount).toBe(0);
  });

  it("un retiro DESPUES de un cobro de fee ajusta la marca sobre las cuotapartes reales (post-fee), no las originales", () => {
    // Repite el cobro de periodo 1 del test anterior: 1000 cuotapartes,
    // NAV sube de 1000 a 1200, fee de 20% sobre $200.000 de ganancia =
    // $40.000 = 33,333333 cuotapartes transferidas. Cliente real queda
    // con 966,666667 cuotapartes = $1.160.000 (== hwmNueva).
    const movements: Movement[] = [
      { fecha: new Date("2026-01-31"), tipo: "aporte", monto: 1000000 },
      // Retira exactamente la mitad de su valor REAL ($1.160.000 / 2 =
      // $580.000) en el periodo siguiente, a NAV plano (1200).
      { fecha: new Date("2026-07-31"), tipo: "retiro", monto: 580000 },
    ];
    const transferenciasPrevias: Transferencia[] = [
      { fecha: new Date("2026-06-30"), shares: 40000 / 1200 }, // 33,333333
    ];

    const hwmAjustada = ajustarMarcaDeAgua(
      1160000,
      movements,
      NAV,
      new Date("2026-06-30"),
      new Date("2026-07-31"),
      transferenciasPrevias
    );
    // Retiro proporcional correcto: retira el 50% de su valor real
    // ($580.000 / $1.160.000) -> la marca baja a la mitad ($580.000).
    // Si el ajuste ignorara transferenciasPrevias (bug real que se
    // encontro en la revision de este modulo), calcularia el retiro
    // contra las 1000 cuotapartes ORIGINALES en vez de las 966,666667
    // reales, y daria $599.333,33 en vez de $580.000 — una marca
    // artificialmente alta que subcobraria fee en el futuro.
    expect(hwmAjustada).toBeCloseTo(580000, 2);
  });

  it("cuotapartesTransferidasHasta suma solo hasta la fecha dada", () => {
    const transfers: Transferencia[] = [
      { fecha: new Date("2026-03-31"), shares: 10 },
      { fecha: new Date("2026-06-30"), shares: 5 },
    ];
    expect(cuotapartesTransferidasHasta(transfers, new Date("2026-04-30"))).toBeCloseTo(10, 6);
    expect(cuotapartesTransferidasHasta(transfers, new Date("2026-06-30"))).toBeCloseTo(15, 6);
    expect(cuotapartesTransferidasHasta(transfers, new Date("2026-01-31"))).toBe(0);
  });

  it("el orden de los movimientos en el array no importa: se procesan por fecha, no por posicion", () => {
    // Mismo escenario que el test 4 (retiro proporcional), pero con el
    // array pasado en orden INVERSO al cronologico — si ajustarMarcaDeAgua
    // no ordenara internamente por fecha, el retiro se procesaria antes
    // que el aporte que lo hace posible y el resultado seria distinto.
    const movementsDesordenados: Movement[] = [
      { fecha: new Date("2026-02-28"), tipo: "retiro", monto: 400000 },
      { fecha: new Date("2026-01-31"), tipo: "aporte", monto: 1000000 },
    ];
    const hwmAjustada = ajustarMarcaDeAgua(
      1000000,
      movementsDesordenados,
      NAV,
      new Date("2026-01-31"),
      new Date("2026-02-28")
    );
    expect(hwmAjustada).toBeCloseTo(500000, 6); // mismo resultado que el test 4
  });

  it("un retiro mayor al valor disponible no deja la marca negativa (guardia defensiva)", () => {
    const movements: Movement[] = [
      { fecha: new Date("2026-01-31"), tipo: "aporte", monto: 100000 }, // 100 cuotapartes a NAV 1000
      { fecha: new Date("2026-02-28"), tipo: "retiro", monto: 999999999 }, // no deberia pasar validate.ts, pero no debe romper esto
    ];
    const hwmAjustada = ajustarMarcaDeAgua(100000, movements, NAV, new Date("2026-01-31"), new Date("2026-02-28"));
    expect(hwmAjustada).toBeGreaterThanOrEqual(0);
  });

  it("calcularFeeCliente tira un error claro si no hay NAV para la fecha de corte", () => {
    const movements: Movement[] = [{ fecha: new Date("2026-01-31"), tipo: "aporte", monto: 1000000 }];
    expect(() =>
      calcularFeeCliente({
        hwmAnterior: 1000000,
        hwmDesde: new Date("2026-01-31"),
        movements,
        navSeries: NAV,
        periodoFin: new Date("2026-08-31"), // no existe en NAV
        feeRate: 0.2,
      })
    ).toThrow(/No hay valor de cuotaparte/);
  });
});
