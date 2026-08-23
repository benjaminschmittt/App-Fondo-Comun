import "server-only";
import { Prisma } from "@/generated/prisma/client";
import { prisma } from "@/lib/prisma";
import { requireAdmin, requireClient } from "./auth";
import { getDefaultFundId } from "./fondo";
import { registrarAuditoria } from "./audit";
import { cuotapartesEnFecha, type Movement, type NavPoint } from "@/lib/calculos";
import {
  calcularFeeCliente,
  cuotapartesTransferidasHasta,
  hwmDespuesDeFee,
  type CalculoFee,
  type Transferencia,
} from "@/lib/comisiones";

// Acepta tanto el cliente normal como el de una transaccion — aplicarPeriodo
// necesita leer DENTRO de la misma transaccion en la que escribe, para que
// la revalidacion de cuotapartes sea consistente con lo que se va a grabar.
type Db = typeof prisma | Prisma.TransactionClient;

// Junta todo lo que necesita src/lib/comisiones.ts para un cliente: sus
// movimientos reales, la serie de NAV del fondo, sus cobros de fee previos
// (para no inflar cuotapartesAntes) y su marca de agua vigente. La fecha
// "efectiva" de cada ShareTransfer es la del cierre del periodo que lo
// origino (feeCalculation.feePeriod.periodEnd), no created_at — evita
// agregar una columna de fecha redundante en la tabla.
async function datosClienteParaFee(db: Db, clientId: string, fundId: string) {
  const [movementRows, navRows, transferRows, hwm] = await Promise.all([
    db.clientMovement.findMany({ where: { clientId, fundId } }),
    db.fundNav.findMany({ where: { fundId } }),
    db.shareTransfer.findMany({
      where: { clientId, fundId },
      include: { feeCalculation: { include: { feePeriod: true } } },
    }),
    db.clientHighWaterMark.findUnique({ where: { clientId_fundId: { clientId, fundId } } }),
  ]);

  const movements: Movement[] = movementRows.map((m) => ({
    fecha: m.fecha,
    tipo: m.tipo,
    monto: m.monto.toNumber(),
  }));
  const navSeries: NavPoint[] = navRows.map((n) => ({
    fecha: n.fecha,
    valorCuotaparte: n.valorCuotaparte.toNumber(),
  }));
  const transferenciasPrevias: Transferencia[] = transferRows.map((t) => ({
    fecha: t.feeCalculation.feePeriod.periodEnd,
    shares: t.shares.toNumber(),
  }));

  return {
    movements,
    navSeries,
    transferenciasPrevias,
    hwmAnterior: hwm ? hwm.highWaterMarkValue.toNumber() : 0,
    hwmDesde: hwm ? hwm.highWaterMarkDate : null,
  };
}

async function cuotapartesManagerActuales(db: Db, fundId: string): Promise<number> {
  const manager = await db.managerAccount.findUnique({ where: { fundId } });
  if (!manager) return 0;
  const agg = await db.shareTransfer.aggregate({
    where: { managerAccountId: manager.id },
    _sum: { shares: true },
  });
  return agg._sum.shares?.toNumber() ?? 0;
}

// Fechas de corte con NAV cargado, para que el admin elija el cierre de
// un periodo de una lista real en vez de un date-picker libre (evita
// crear un periodo con una fecha que despues no se puede calcular).
export async function fechasDeCorteDisponibles(): Promise<Date[]> {
  await requireAdmin();
  const fundId = await getDefaultFundId();
  const rows = await prisma.fundNav.findMany({
    where: { fundId },
    orderBy: { fecha: "desc" },
    select: { fecha: true },
  });
  return rows.map((r) => r.fecha);
}

export type PeriodoResult = { ok: true; id: string } | { ok: false; error: string };

// Crea un periodo de calculo en borrador. No calcula nada todavia — eso
// es un paso aparte (calcularPeriodo), a proposito: el admin puede crear
// el periodo, revisar la fecha/porcentaje, y recien despues disparar el
// calculo.
export async function crearPeriodo(input: {
  fundId: string;
  periodStart: Date;
  periodEnd: Date;
  feeRate: number;
}): Promise<PeriodoResult> {
  const user = await requireAdmin();

  if (!(input.feeRate > 0 && input.feeRate < 1)) {
    return { ok: false, error: "El porcentaje de fee tiene que estar entre 0% y 100%." };
  }
  if (input.periodEnd <= input.periodStart) {
    return { ok: false, error: "La fecha de fin tiene que ser posterior a la de inicio." };
  }

  // La fecha de cierre tiene que ser una fecha de corte real: sin esto,
  // calcularFeeCliente() no tiene con que valuar la posicion del cliente.
  const navExists = await prisma.fundNav.findUnique({
    where: { fundId_fecha: { fundId: input.fundId, fecha: input.periodEnd } },
  });
  if (!navExists) {
    return {
      ok: false,
      error:
        "No hay valor de cuotaparte cargado para esa fecha de cierre. Elegí una fecha de corte que ya exista.",
    };
  }

  const period = await prisma.feePeriod.create({
    data: {
      fundId: input.fundId,
      periodStart: input.periodStart,
      periodEnd: input.periodEnd,
      feeRate: input.feeRate,
      createdBy: user.id,
    },
  });

  await registrarAuditoria({
    actorId: user.id,
    actorEmail: user.email ?? "",
    accion: "crear_periodo_fee",
    entidad: "fee_period",
    entidadId: period.id,
    detalle: { periodStart: input.periodStart, periodEnd: input.periodEnd, feeRate: input.feeRate },
  });

  return { ok: true, id: period.id };
}

export type CalcularResult = { ok: true; clientesCalculados: number } | { ok: false; error: string };

// Calcula (o RE-calcula) las comisiones sugeridas de un periodo: una fila
// PerformanceFeeCalculation en borrador por cada cliente del fondo con
// cuotapartes > 0. Idempotente sobre las filas en borrador (las reemplaza
// por completo); se niega a correr si ya hay alguna fila aprobada, para no
// pisar una decision del admin sin que se de cuenta.
export async function calcularPeriodo(feePeriodId: string): Promise<CalcularResult> {
  const user = await requireAdmin();

  const period = await prisma.feePeriod.findUnique({ where: { id: feePeriodId } });
  if (!period) return { ok: false, error: "Período no encontrado." };
  if (period.status === "applied") return { ok: false, error: "Este período ya fue aplicado." };
  if (period.status === "cancelled") return { ok: false, error: "Este período está cancelado." };

  const aprobados = await prisma.performanceFeeCalculation.count({
    where: { feePeriodId, status: "approved" },
  });
  if (aprobados > 0) {
    return {
      ok: false,
      error: "Hay clientes ya aprobados en este período — recalcular perdería esas aprobaciones.",
    };
  }

  const clientFunds = await prisma.clientFund.findMany({
    where: { fundId: period.fundId },
    select: { clientId: true },
  });
  const managerSharesActuales = await cuotapartesManagerActuales(prisma, period.fundId);
  const feeRate = period.feeRate.toNumber();

  const calculos: { clientId: string; resultado: CalculoFee }[] = [];
  try {
    for (const { clientId } of clientFunds) {
      const datos = await datosClienteParaFee(prisma, clientId, period.fundId);
      const resultado = calcularFeeCliente({
        hwmAnterior: datos.hwmAnterior,
        hwmDesde: datos.hwmDesde,
        movements: datos.movements,
        navSeries: datos.navSeries,
        transferenciasPrevias: datos.transferenciasPrevias,
        periodoFin: period.periodEnd,
        feeRate,
      });
      // Cliente sin posicion real (retiro todo, o nunca aporto en este
      // fondo) — nada que calcular.
      if (resultado.cuotapartesAntes <= 0.000001) continue;
      calculos.push({ clientId, resultado });
    }
  } catch (e) {
    return { ok: false, error: e instanceof Error ? e.message : "No se pudo calcular el período." };
  }

  await prisma.$transaction(async (tx) => {
    await tx.performanceFeeCalculation.deleteMany({ where: { feePeriodId, status: "draft" } });
    if (calculos.length > 0) {
      await tx.performanceFeeCalculation.createMany({
        data: calculos.map(({ clientId, resultado }) => ({
          feePeriodId,
          clientId,
          fundId: period.fundId,
          clientSharesBefore: resultado.cuotapartesAntes,
          currentValue: resultado.valorActual,
          previousHighWaterMark: resultado.hwmAnterior,
          adjustedHighWaterMark: resultado.hwmAjustada,
          gainAboveHwm: resultado.gananciaSujetaAFee,
          feeRate: resultado.feeRate,
          feeAmount: resultado.feeAmount,
          navPerShare: resultado.navActual,
          sharesToTransfer: resultado.cuotapartesATransferir,
          clientSharesAfter: resultado.cuotapartesDespues,
          managerSharesBefore: managerSharesActuales,
          managerSharesAfter: managerSharesActuales + resultado.cuotapartesATransferir,
        })),
      });
    }
    await tx.feePeriod.update({ where: { id: feePeriodId }, data: { status: "calculated" } });
  });

  await registrarAuditoria({
    actorId: user.id,
    actorEmail: user.email ?? "",
    accion: "calcular_periodo_fee",
    entidad: "fee_period",
    entidadId: feePeriodId,
    detalle: { clientesCalculados: calculos.length },
  });

  return { ok: true, clientesCalculados: calculos.length };
}

export type SimpleResult = { ok: true } | { ok: false; error: string };

async function cambiarEstadoCalculo(
  calculationId: string,
  nuevoEstado: "approved" | "skipped" | "draft",
  accionAuditoria: string
): Promise<SimpleResult> {
  const user = await requireAdmin();

  const calc = await prisma.performanceFeeCalculation.findUnique({
    where: { id: calculationId },
    include: { feePeriod: true },
  });
  if (!calc) return { ok: false, error: "Cálculo no encontrado." };
  if (calc.feePeriod.status !== "calculated") {
    return { ok: false, error: "El período no está en revisión." };
  }
  if (calc.status === "applied") return { ok: false, error: "Ya fue aplicado, no se puede modificar." };

  await prisma.performanceFeeCalculation.update({
    where: { id: calculationId },
    data: {
      status: nuevoEstado,
      approvedAt: nuevoEstado === "approved" ? new Date() : null,
    },
  });

  await registrarAuditoria({
    actorId: user.id,
    actorEmail: user.email ?? "",
    accion: accionAuditoria,
    entidad: "performance_fee_calculation",
    entidadId: calculationId,
  });

  return { ok: true };
}

export const aprobarCalculo = (calculationId: string) =>
  cambiarEstadoCalculo(calculationId, "approved", "aprobar_fee_cliente");

export const excluirCalculo = (calculationId: string) =>
  cambiarEstadoCalculo(calculationId, "skipped", "excluir_fee_cliente");

// Vuelve un calculo aprobado/excluido a borrador — el admin puede cambiar
// de opinion antes de la confirmacion final.
export const revertirCalculo = (calculationId: string) =>
  cambiarEstadoCalculo(calculationId, "draft", "revertir_fee_cliente");

// Descarta un periodo entero antes de aplicarlo (ej. el admin decide no
// cobrar este trimestre). Nunca se puede cancelar un periodo ya aplicado
// — las transferencias reales ya ocurrieron, revertirlas es un caso
// manual, no un boton.
export async function cancelarPeriodo(feePeriodId: string): Promise<SimpleResult> {
  const user = await requireAdmin();

  const period = await prisma.feePeriod.findUnique({ where: { id: feePeriodId } });
  if (!period) return { ok: false, error: "Período no encontrado." };
  if (period.status === "applied") {
    return { ok: false, error: "Este período ya fue aplicado, no se puede cancelar." };
  }
  if (period.status === "cancelled") return { ok: true };

  await prisma.feePeriod.update({ where: { id: feePeriodId }, data: { status: "cancelled" } });

  await registrarAuditoria({
    actorId: user.id,
    actorEmail: user.email ?? "",
    accion: "cancelar_periodo_fee",
    entidad: "fee_period",
    entidadId: feePeriodId,
  });

  return { ok: true };
}

export type AplicarResult = { ok: true; clientesAplicados: number } | { ok: false; error: string };

// Aplica de verdad los cobros aprobados de un periodo: transferencia de
// cuotapartes + actualizacion de marca de agua + auditoria, todo en UNA
// transaccion (todo o nada — si un cliente falla, no queda nada aplicado).
// Revalida las cuotapartes reales de cada cliente DENTRO de la transaccion
// antes de escribir nada, por si algo cambio desde que se calculo (ej. un
// Excel importado en el medio) — si no coincide, aborta todo el batch.
export async function aplicarPeriodo(feePeriodId: string): Promise<AplicarResult> {
  const user = await requireAdmin();

  const period = await prisma.feePeriod.findUnique({ where: { id: feePeriodId } });
  if (!period) return { ok: false, error: "Período no encontrado." };
  if (period.status === "applied") return { ok: false, error: "Este período ya fue aplicado." };
  if (period.status !== "calculated") {
    return { ok: false, error: "El período tiene que estar calculado antes de aplicarlo." };
  }

  const aprobados = await prisma.performanceFeeCalculation.findMany({
    where: { feePeriodId, status: "approved" },
  });
  if (aprobados.length === 0) {
    return { ok: false, error: "No hay ningún cliente aprobado para aplicar." };
  }

  const manager = await prisma.managerAccount.findUnique({ where: { fundId: period.fundId } });
  if (!manager) return { ok: false, error: "El fondo no tiene cuenta de gestor configurada." };

  try {
    await prisma.$transaction(
      async (tx) => {
        for (const calc of aprobados) {
          const datos = await datosClienteParaFee(tx, calc.clientId, period.fundId);
          const sharesReales =
            cuotapartesEnFecha(datos.movements, datos.navSeries, period.periodEnd) -
            cuotapartesTransferidasHasta(datos.transferenciasPrevias, period.periodEnd);

          if (Math.abs(sharesReales - calc.clientSharesBefore.toNumber()) > 0.000001) {
            throw new Error(
              "Las cuotapartes de al menos un cliente cambiaron desde que se calculó este período (por ejemplo, se importó un Excel nuevo). Recalculá antes de aplicar."
            );
          }

          const hwmNueva = hwmDespuesDeFee(
            calc.currentValue.toNumber(),
            calc.feeAmount.toNumber(),
            calc.adjustedHighWaterMark.toNumber()
          );

          await tx.shareTransfer.create({
            data: {
              fundId: period.fundId,
              clientId: calc.clientId,
              managerAccountId: manager.id,
              shares: calc.sharesToTransfer,
              navPerShare: calc.navPerShare,
              moneyEquivalent: calc.feeAmount,
              transferType: "performance_fee",
              feeCalculationId: calc.id,
              createdBy: user.id,
            },
          });

          await tx.clientHighWaterMark.upsert({
            where: { clientId_fundId: { clientId: calc.clientId, fundId: period.fundId } },
            create: {
              clientId: calc.clientId,
              fundId: period.fundId,
              highWaterMarkValue: hwmNueva,
              highWaterMarkDate: period.periodEnd,
              highWaterMarkNav: calc.navPerShare,
              sharesAtHwm: calc.clientSharesAfter,
              lastFeePeriodId: feePeriodId,
            },
            update: {
              highWaterMarkValue: hwmNueva,
              highWaterMarkDate: period.periodEnd,
              highWaterMarkNav: calc.navPerShare,
              sharesAtHwm: calc.clientSharesAfter,
              lastFeePeriodId: feePeriodId,
            },
          });

          await tx.performanceFeeCalculation.update({
            where: { id: calc.id },
            data: { status: "applied", appliedAt: new Date() },
          });

          await tx.auditLog.create({
            data: {
              actorId: user.id,
              actorEmail: user.email ?? "",
              accion: "aplicar_fee_cliente",
              entidad: "performance_fee_calculation",
              entidadId: calc.id,
              detalle: {
                clientId: calc.clientId,
                feeAmount: calc.feeAmount.toString(),
                sharesToTransfer: calc.sharesToTransfer.toString(),
                hwmNueva,
              },
            },
          });
        }

        await tx.feePeriod.update({
          where: { id: feePeriodId },
          data: { status: "applied", appliedAt: new Date(), approvedBy: user.id },
        });

        await tx.auditLog.create({
          data: {
            actorId: user.id,
            actorEmail: user.email ?? "",
            accion: "aplicar_periodo_fee",
            entidad: "fee_period",
            entidadId: feePeriodId,
            detalle: { clientesAplicados: aprobados.length },
          },
        });
      },
      { timeout: 60_000 }
    );
  } catch (e) {
    return { ok: false, error: e instanceof Error ? e.message : "No se pudo aplicar el período." };
  }

  return { ok: true, clientesAplicados: aprobados.length };
}

export async function listarPeriodos() {
  await requireAdmin();
  const fundId = await getDefaultFundId();
  return prisma.feePeriod.findMany({ where: { fundId }, orderBy: { periodEnd: "desc" } });
}

export async function obtenerPeriodo(feePeriodId: string) {
  await requireAdmin();
  return prisma.feePeriod.findUnique({
    where: { id: feePeriodId },
    include: {
      calculations: {
        include: { client: { select: { nombre: true, clienteId: true } } },
        orderBy: { currentValue: "desc" },
      },
    },
  });
}

// Cobros de fee YA aplicados del cliente autenticado, para mostrar en su
// dashboard ("Comisión de performance del período X"). Nunca expone marca
// de agua ni ningun detalle de calculo — eso es info interna del admin.
export async function listarCobrosFeeCliente() {
  const client = await requireClient();
  const fundId = await getDefaultFundId();

  const transfers = await prisma.shareTransfer.findMany({
    where: { clientId: client.id, fundId, transferType: "performance_fee" },
    include: { feeCalculation: { include: { feePeriod: true } } },
    orderBy: { createdAt: "desc" },
  });

  return transfers.map((t) => ({
    id: t.id,
    periodoInicio: t.feeCalculation.feePeriod.periodStart,
    periodoFin: t.feeCalculation.feePeriod.periodEnd,
    monto: t.moneyEquivalent.toNumber(),
    cuotapartes: t.shares.toNumber(),
  }));
}
