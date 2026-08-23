// Comision de performance con marca de agua (high-water mark), por
// cliente y por fondo. Funciones puras: no tocan la base de datos ni
// la sesion, igual que calculos.ts. Ver el diseño financiero completo
// (metodologia, ejemplos, casos especiales) en la conversacion de
// diseño de este modulo antes de tocar esto.
//
// El cobro se paga en cuotapartes (nunca en efectivo): se descuentan
// del cliente y se acreditan a una cuenta interna del gestor. Por eso
// estas cuotapartes NUNCA pasan por ClientMovement (aportesNetos/
// tirAnualizada tratarian el cobro como capital real entrado/salido,
// lo cual seria incorrecto) — viven en una ledger de transferencias
// separada (Transferencia), sumada aparte de cuotapartesEnFecha().

import { cuotapartesEnFecha, dayKey, navPorFecha, type Movement, type NavPoint } from "./calculos";

export type Transferencia = { fecha: Date; shares: number };

// Tolerancia para comparar "ganancia sujeta a fee" contra cero. Dos
// caminos aritmeticos distintos pueden llegar al MISMO valor teorico
// (ej. valorActual calculado por multiplicacion vs. hwmNueva de un
// periodo anterior calculado por resta) sin dar exactamente el mismo
// float — sin este margen, un cliente exactamente en su marca podria
// generar un cobro de centavos de peso por puro ruido de redondeo.
const EPSILON_GANANCIA = 0.01;

// Marca de agua que queda DESPUES de un cobro (o de un periodo sin
// cobro). Exportada (no solo interna) para que la capa de datos pueda
// re-derivar el mismo numero al aplicar un PerformanceFeeCalculation ya
// aprobado — sin esto, aplicarPeriodo() en src/data/comisiones.ts
// tendria que reimplementar esta formula a mano, con riesgo real de que
// las dos copias diverjan con el tiempo.
//
// Si hubo cobro, la marca pasa a ser el valor NETO post-fee (lo que le
// queda al cliente) — no el valor pre-fee. Si no hubo cobro, la marca
// solo lleva los ajustes de flujos de caja (nunca baja por rendimiento
// negativo: es una marca de MAXIMO, no un promedio).
export function hwmDespuesDeFee(valorActual: number, feeAmount: number, hwmAjustada: number): number {
  return feeAmount > 0 ? valorActual - feeAmount : hwmAjustada;
}

// Cuotapartes transferidas (entrada o salida, segun el signo con el que
// se hayan guardado) hasta una fecha dada. Sirve tanto para "cuanto le
// sacaron a este cliente" (shares positivos, se restan aparte) como
// para "cuanto acumulo la cuenta del gestor" (shares positivos, se suman).
export function cuotapartesTransferidasHasta(transfers: Transferencia[], hasta: Date): number {
  const hastaKey = dayKey(hasta);
  return transfers
    .filter((t) => dayKey(t.fecha) <= hastaKey)
    .reduce((acc, t) => acc + t.shares, 0);
}

// Recorre cronologicamente los movimientos entre el checkpoint anterior
// ("desde", exclusive — null si el cliente todavia no tenia marca) y la
// fecha de corte a evaluar ("hasta", inclusive), ajustando la marca de
// agua en cada aporte/retiro:
//
// - Aporte: la marca sube el monto exacto (capital nuevo no es ganancia,
//   no debe generar base de comision).
// - Retiro: la marca baja PROPORCIONALMENTE (no dolar a dolar) para
//   preservar la distancia relativa entre valor y marca. Ejemplo: un
//   cliente $200k por debajo de su marca que retira la mitad de su
//   posicion sigue, en terminos relativos, $100k por debajo de la mitad
//   de su marca — no exactamente en su marca (que es lo que daria una
//   resta dolar a dolar, y generaria comision sobre la primera suba
//   minima aunque el cliente siga en la misma posicion relativa).
//
// Recorrer TODOS los movimientos desde el ultimo checkpoint (no solo los
// del periodo que se esta calculando ahora) permite que el admin se
// salte un periodo de calculo sin romper nada: el proximo calculo
// simplemente arrastra un rango mas largo.
//
// "desde" es EXCLUSIVE: representa la fecha hasta la cual hwmInicial ya
// refleja todo. Un movimiento fechado exactamente en "desde" queda
// afuera del recorrido a proposito (se asume ya contemplado en
// hwmInicial). En el uso real esto nunca genera ambiguedad porque
// "desde" siempre es la fecha de CIERRE de un calculo anterior, y ese
// calculo ya habria consumido cualquier movimiento de ese mismo dia.
//
// "transferenciasPrevias" es NECESARIO si el cliente ya tuvo algun cobro
// de fee antes de "desde": el punto de partida de cuotapartes tiene que
// ser el REAL (post-fee), no el que da cuotapartesEnFecha() solo con los
// movimientos de plata — si no, el retiro proporcional de esta funcion
// calcularia "valorAntes" sobre cuotapartes que el cliente ya no tiene,
// reduciendo la marca de menos de lo que corresponde.
export function ajustarMarcaDeAgua(
  hwmInicial: number,
  movements: Movement[],
  navSeries: NavPoint[],
  desde: Date | null,
  hasta: Date,
  transferenciasPrevias: Transferencia[] = []
): number {
  const nav = navPorFecha(navSeries);
  const desdeKey = desde ? dayKey(desde) : null;
  const hastaKey = dayKey(hasta);

  const relevantes = movements
    .filter((m) => {
      const key = dayKey(m.fecha);
      return (desdeKey === null || key > desdeKey) && key <= hastaKey;
    })
    .sort((a, b) => a.fecha.getTime() - b.fecha.getTime());

  let hwm = hwmInicial;
  let cuotapartes = desde
    ? cuotapartesEnFecha(movements, navSeries, desde) -
      cuotapartesTransferidasHasta(transferenciasPrevias, desde)
    : 0;

  for (const m of relevantes) {
    const navEnFecha = nav.get(dayKey(m.fecha));
    // Si no hay NAV para la fecha del movimiento, el importador ya
    // deberia haberlo rechazado (mismo criterio que cuotapartesEnFecha).
    if (navEnFecha == null || navEnFecha <= 0) continue;

    const valorAntes = cuotapartes * navEnFecha;
    if (m.tipo === "aporte") {
      hwm += m.monto;
      cuotapartes += m.monto / navEnFecha;
    } else {
      if (valorAntes > 0) {
        hwm = hwm * Math.max(0, (valorAntes - m.monto) / valorAntes);
      }
      cuotapartes -= m.monto / navEnFecha;
    }
  }

  return hwm;
}

export type CalculoFee = {
  hwmAnterior: number;
  hwmAjustada: number;
  cuotapartesAntes: number;
  navActual: number;
  valorActual: number;
  gananciaSujetaAFee: number;
  feeRate: number;
  feeAmount: number;
  cuotapartesATransferir: number;
  cuotapartesDespues: number;
  hwmNueva: number;
};

// Calculo completo de comision de performance para UN cliente en UN
// periodo. No escribe nada — el llamador decide si se aplica (draft de
// revision manual, ver diseño). Tira si no hay NAV para periodoFin: el
// admin tiene que elegir una fecha de corte real, no una fecha libre.
export function calcularFeeCliente(input: {
  hwmAnterior: number;
  // Fecha desde la que vale hwmAnterior (null = el cliente nunca tuvo
  // marca, ej. recien entra en este periodo).
  hwmDesde: Date | null;
  movements: Movement[];
  navSeries: NavPoint[];
  // Cuotapartes ya transferidas en cobros previos (hay que restarlas de
  // cuotapartesEnFecha para no inflar el valor actual con cuotapartes
  // que el cliente ya no tiene).
  transferenciasPrevias?: Transferencia[];
  periodoFin: Date;
  feeRate: number;
}): CalculoFee {
  const { hwmAnterior, hwmDesde, movements, navSeries, periodoFin, feeRate } = input;
  const transferenciasPrevias = input.transferenciasPrevias ?? [];

  const nav = navPorFecha(navSeries);
  const navActual = nav.get(dayKey(periodoFin));
  if (navActual == null || navActual <= 0) {
    throw new Error(
      `No hay valor de cuotaparte para la fecha de corte ${dayKey(periodoFin)}.`
    );
  }

  const hwmAjustada = ajustarMarcaDeAgua(
    hwmAnterior,
    movements,
    navSeries,
    hwmDesde,
    periodoFin,
    transferenciasPrevias
  );

  const cuotapartesAntes =
    cuotapartesEnFecha(movements, navSeries, periodoFin) -
    cuotapartesTransferidasHasta(transferenciasPrevias, periodoFin);

  const valorActual = cuotapartesAntes * navActual;
  const gananciaSujetaAFee = valorActual - hwmAjustada;
  // EPSILON_GANANCIA, no "> 0" a secas: ver comentario de la constante.
  const feeAmount = gananciaSujetaAFee > EPSILON_GANANCIA ? gananciaSujetaAFee * feeRate : 0;
  const cuotapartesATransferir = feeAmount > 0 ? feeAmount / navActual : 0;
  const cuotapartesDespues = cuotapartesAntes - cuotapartesATransferir;
  const hwmNueva = hwmDespuesDeFee(valorActual, feeAmount, hwmAjustada);

  return {
    hwmAnterior,
    hwmAjustada,
    cuotapartesAntes,
    navActual,
    valorActual,
    gananciaSujetaAFee,
    feeRate,
    feeAmount,
    cuotapartesATransferir,
    cuotapartesDespues,
    hwmNueva,
  };
}
