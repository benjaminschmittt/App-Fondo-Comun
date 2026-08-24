"use client";

import { useMemo, useState } from "react";
import {
  ResponsiveContainer,
  LineChart,
  Line,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  PieChart,
  Pie,
  Cell,
  BarChart,
  Bar,
} from "recharts";
import { TrendingUp, Wallet, Layers, PiggyBank } from "lucide-react";
import { CHART_COLORS, money, pct, numero, fechaCorta, fechaLarga, bytes } from "@/lib/theme";
import { cn } from "@/lib/utils";
import { MetricCard } from "@/components/metric-card";
import { SectionCard } from "@/components/section-card";
import { ChartCard, chartAxisTick, chartGridProps, chartTooltipStyle } from "@/components/chart-card";
import { DataTable, type DataTableColumn } from "@/components/data-table";
import { StatusBadge } from "@/components/status-badge";
import type { MiInversion } from "@/data/inversion";
import type { listarDocumentosCliente } from "@/data/documentos";
import type { listarCobrosFeeCliente } from "@/data/comisiones";
import { DocumentDownloadButton } from "./document-download-button";

function RendimientoStat({ label, valor }: { label: string; valor: number | null }) {
  const toneClass =
    valor == null ? "text-muted-foreground" : valor >= 0 ? "text-pos" : "text-neg";
  return (
    <div className="text-center">
      <div className="label-eyebrow text-muted-foreground">
        {label}
      </div>
      <div className={cn("tnum mt-1 font-heading text-xl font-semibold", toneClass)}>
        {valor == null ? "—" : pct(valor)}
      </div>
      {valor == null && (
        <div className="mt-0.5 text-[10.5px] text-muted-foreground">
          sin historico suficiente
        </div>
      )}
    </div>
  );
}

type Posicion = MiInversion["fondo"]["positions"][number];
type Movimiento = MiInversion["movimientos"][number];
type Documento = Awaited<ReturnType<typeof listarDocumentosCliente>>[number];
type CobroFee = Awaited<ReturnType<typeof listarCobrosFeeCliente>>[number];

export function DashboardView({
  data,
  documentos,
  cobrosFee,
}: {
  data: MiInversion;
  documentos: Documento[];
  cobrosFee: CobroFee[];
}) {
  const [breakdown, setBreakdown] = useState<"tipo" | "sector">("tipo");

  const nav = data.fondo.navSeries;
  const navActual = nav[nav.length - 1]?.valorCuotaparte ?? 0;
  const navAnterior = nav[nav.length - 2]?.valorCuotaparte ?? navActual;
  const navVar = navAnterior > 0 ? (navActual - navAnterior) / navAnterior : 0;

  const serieChart = useMemo(
    () => data.serie.map((p) => ({ ...p, label: fechaCorta(p.fecha) })),
    [data.serie]
  );

  const navChart = useMemo(
    () => nav.map((p) => ({ ...p, label: fechaCorta(p.fecha) })),
    [nav]
  );

  const composicion = useMemo(() => {
    const key = breakdown === "tipo" ? "tipoInstrumento" : "sector";
    const map = new Map<string, number>();
    for (const p of data.fondo.positions) {
      map.set(p[key], (map.get(p[key]) ?? 0) + p.valorMercado);
    }
    return [...map.entries()]
      .map(([name, value]) => ({ name, value }))
      .sort((a, b) => b.value - a.value);
  }, [breakdown, data.fondo.positions]);

  const composicionTotal = composicion.reduce((s, x) => s + x.value, 0);

  const bardata = useMemo(
    () =>
      [...data.fondo.positions]
        .sort((a, b) => b.valorMercado - a.valorMercado)
        .map((p) => ({ name: p.ticker, valor: p.valorMercado })),
    [data.fondo.positions]
  );

  const posicionesOrdenadas = useMemo(
    () => [...data.fondo.positions].sort((a, b) => b.valorMercado - a.valorMercado),
    [data.fondo.positions]
  );

  const positionColumns: DataTableColumn<Posicion>[] = [
    {
      key: "activo",
      header: "Activo",
      render: (p) => (
        <>
          <strong className="text-foreground">{p.ticker}</strong>{" "}
          <span className="text-muted-foreground">· {p.nombre}</span>
        </>
      ),
    },
    {
      key: "tipo",
      header: "Tipo",
      render: (p) => <span className="text-muted-foreground">{p.tipoInstrumento}</span>,
    },
    {
      key: "valor",
      header: "Valor",
      align: "right",
      render: (p) => money(p.valorMercado),
    },
    {
      key: "pct",
      header: "%",
      align: "right",
      render: (p) => (
        <span className="text-muted-foreground">
          {data.fondo.valorTotalFondo > 0
            ? ((p.valorMercado / data.fondo.valorTotalFondo) * 100).toFixed(1)
            : "0.0"}
          %
        </span>
      ),
    },
  ];

  const movementColumns: DataTableColumn<Movimiento & { idx: number }>[] = [
    { key: "fecha", header: "Fecha", render: (mv) => fechaCorta(mv.fecha) },
    {
      key: "tipo",
      header: "Tipo",
      render: (mv) => (
        <StatusBadge tone={mv.tipo === "aporte" ? "pos" : "neg"}>{mv.tipo}</StatusBadge>
      ),
    },
    { key: "monto", header: "Monto", align: "right", render: (mv) => money(mv.monto) },
    {
      key: "cuotapartes",
      header: "Cuotapartes",
      align: "right",
      render: (mv) => <span className="text-muted-foreground">{numero(mv.cuotapartes)}</span>,
    },
  ];

  const documentColumns: DataTableColumn<Documento>[] = [
    {
      key: "nombre",
      header: "Nombre",
      render: (d) => <span className="font-semibold text-foreground">{d.nombre}</span>,
    },
    {
      key: "fecha",
      header: "Fecha",
      render: (d) => <span className="text-muted-foreground">{fechaLarga(d.createdAt)}</span>,
    },
    {
      key: "tamanio",
      header: "Tamaño",
      align: "right",
      render: (d) => <span className="text-muted-foreground">{bytes(d.tamanioBytes)}</span>,
    },
    {
      key: "accion",
      header: "",
      align: "right",
      render: (d) => <DocumentDownloadButton id={d.id} nombre={d.nombre} />,
    },
  ];

  const feeColumns: DataTableColumn<CobroFee>[] = [
    {
      key: "periodo",
      header: "Período",
      render: (c) => (
        <span className="font-semibold text-foreground">
          Comisión de performance — {fechaCorta(c.periodoInicio)} a {fechaCorta(c.periodoFin)}
        </span>
      ),
    },
    {
      key: "monto",
      header: "Monto",
      align: "right",
      render: (c) => money(c.monto),
    },
    {
      key: "cuotapartes",
      header: "Cuotapartes descontadas",
      align: "right",
      render: (c) => <span className="text-muted-foreground">{numero(c.cuotapartes)}</span>,
    },
  ];

  return (
    <main className="fade-up mx-auto max-w-[1160px] px-5 py-6 md:px-8">
      <h1 className="sr-only">Tu inversión</h1>
      <div className="mb-6 grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4">
        <MetricCard
          variant="hero"
          className="sm:col-span-2 lg:col-span-1"
          icon={<Wallet size={14} />}
          label="Valor de tu inversion"
          value={money(data.valorActual)}
          sub={
            (data.resultado >= 0 ? "▲ " : "▼ ") +
            `${money(data.resultado)} (${pct(data.resultadoPct)} total)` +
            (data.rentabilidadAnualizada != null
              ? ` · TIR ${pct(data.rentabilidadAnualizada)}`
              : "")
          }
        />
        <MetricCard
          icon={<Layers size={14} />}
          label="Valor de la cuotaparte"
          value={money(navActual, 2)}
          sub={pct(navVar) + " vs. corte anterior"}
          subTone={navVar >= 0 ? "pos" : "neg"}
        />
        <MetricCard
          icon={<PiggyBank size={14} />}
          label="Tus cuotapartes"
          value={numero(data.cuotapartes)}
          sub={`sobre ${numero(data.fondo.cuotapartesTotales, 0)} totales`}
        />
        <MetricCard
          icon={<TrendingUp size={14} />}
          label="Aportes netos"
          value={money(data.aportesNetos)}
          sub="capital invertido"
        />
      </div>

      <SectionCard title="Rendimiento del fondo" className="mb-5">
        <div className="grid grid-cols-3 gap-4">
          <RendimientoStat label="Mensual" valor={data.fondo.rendimiento.mensual} />
          <RendimientoStat label="Trimestral" valor={data.fondo.rendimiento.trimestral} />
          <RendimientoStat label="Acumulado" valor={data.fondo.rendimiento.acumulado} />
        </div>
      </SectionCard>

      <div className="mb-5 grid grid-cols-1 gap-5 lg:grid-cols-2">
        <ChartCard title="Evolucion de tu inversion">
          <ResponsiveContainer width="100%" height={260}>
            <LineChart data={serieChart} margin={{ top: 8, right: 12, left: 4, bottom: 0 }}>
              <CartesianGrid {...chartGridProps} />
              <XAxis dataKey="label" tick={chartAxisTick} axisLine={false} tickLine={false} />
              <YAxis
                tick={chartAxisTick}
                axisLine={false}
                tickLine={false}
                width={64}
                tickFormatter={(v: number) =>
                  "$" + new Intl.NumberFormat("es-AR", { notation: "compact" }).format(v)
                }
              />
              <Tooltip formatter={(v) => [money(Number(v)), "Valor"]} contentStyle={chartTooltipStyle} />
              <Line
                type="monotone"
                dataKey="valorInversion"
                stroke="var(--primary)"
                strokeWidth={2.5}
                dot={false}
                activeDot={{ r: 5 }}
                connectNulls
              />
            </LineChart>
          </ResponsiveContainer>
        </ChartCard>

        <ChartCard
          title="Composicion del fondo"
          action={
            <div className="flex gap-0.5 rounded-lg border border-border p-0.5">
              {(["tipo", "sector"] as const).map((b) => (
                <button
                  key={b}
                  type="button"
                  aria-pressed={breakdown === b}
                  onClick={() => setBreakdown(b)}
                  className={cn(
                    "rounded-md px-3 py-1 text-xs font-semibold capitalize transition-colors",
                    breakdown === b
                      ? "bg-primary text-primary-foreground"
                      : "text-muted-foreground hover:text-foreground"
                  )}
                >
                  {b === "tipo" ? "Por tipo" : "Por sector"}
                </button>
              ))}
            </div>
          }
        >
          <div className="flex items-center gap-2">
            <ResponsiveContainer width="55%" height={240}>
              <PieChart>
                <Pie
                  data={composicion}
                  dataKey="value"
                  nameKey="name"
                  innerRadius={52}
                  outerRadius={88}
                  paddingAngle={2}
                  stroke="none"
                >
                  {composicion.map((_, i) => (
                    <Cell key={i} fill={CHART_COLORS[i % CHART_COLORS.length]} />
                  ))}
                </Pie>
                <Tooltip formatter={(v) => money(Number(v))} contentStyle={chartTooltipStyle} />
              </PieChart>
            </ResponsiveContainer>
            <div className="flex-1">
              {composicion.map((c, i) => (
                <div
                  key={c.name}
                  className="flex items-center justify-between border-b border-border py-1.5"
                >
                  <span className="flex items-center gap-2 text-[13px] text-foreground">
                    <span
                      className="size-2.5 rounded-sm"
                      style={{ background: CHART_COLORS[i % CHART_COLORS.length] }}
                    />
                    {c.name}
                  </span>
                  <span className="tnum text-[13px] font-semibold text-foreground">
                    {composicionTotal > 0 ? ((c.value / composicionTotal) * 100).toFixed(0) : 0}%
                  </span>
                </div>
              ))}
            </div>
          </div>
        </ChartCard>
      </div>

      <div className="mb-5 grid grid-cols-1 gap-5 lg:grid-cols-2">
        <ChartCard title="Evolucion del valor de la cuotaparte">
          <ResponsiveContainer width="100%" height={240}>
            <LineChart data={navChart} margin={{ top: 8, right: 12, left: 4, bottom: 0 }}>
              <CartesianGrid {...chartGridProps} />
              <XAxis dataKey="label" tick={chartAxisTick} axisLine={false} tickLine={false} />
              <YAxis
                tick={chartAxisTick}
                axisLine={false}
                tickLine={false}
                width={44}
                domain={["dataMin - 4", "dataMax + 4"]}
              />
              <Tooltip
                formatter={(v) => [money(Number(v), 2), "Cuotaparte"]}
                contentStyle={chartTooltipStyle}
              />
              <Line
                type="monotone"
                dataKey="valorCuotaparte"
                stroke="var(--accent)"
                strokeWidth={2.5}
                dot={false}
                activeDot={{ r: 5 }}
              />
            </LineChart>
          </ResponsiveContainer>
        </ChartCard>

        <ChartCard title="Principales posiciones del fondo">
          <ResponsiveContainer width="100%" height={240}>
            <BarChart data={bardata} margin={{ top: 8, right: 12, left: 4, bottom: 0 }}>
              <CartesianGrid {...chartGridProps} />
              <XAxis dataKey="name" tick={chartAxisTick} axisLine={false} tickLine={false} />
              <YAxis
                tick={chartAxisTick}
                axisLine={false}
                tickLine={false}
                width={52}
                tickFormatter={(v: number) =>
                  "$" + new Intl.NumberFormat("es-AR", { notation: "compact" }).format(v)
                }
              />
              <Tooltip
                formatter={(v) => [money(Number(v)), "Valor"]}
                contentStyle={chartTooltipStyle}
                cursor={{ fill: "var(--muted)" }}
              />
              <Bar dataKey="valor" radius={[5, 5, 0, 0]} fill="var(--primary)" />
            </BarChart>
          </ResponsiveContainer>
        </ChartCard>
      </div>

      <div className="grid grid-cols-1 gap-5 lg:grid-cols-2">
        <SectionCard title="Posiciones actuales del fondo">
          <DataTable
            columns={positionColumns}
            rows={posicionesOrdenadas}
            rowKey={(p) => p.ticker}
            emptyTitle="Sin posiciones"
            emptyDescription="El fondo todavia no tiene posiciones cargadas."
          />
        </SectionCard>

        <SectionCard title="Tus movimientos">
          <DataTable
            columns={movementColumns}
            rows={data.movimientos.map((mv, idx) => ({ ...mv, idx }))}
            rowKey={(mv) => mv.idx}
            emptyTitle="Sin movimientos"
            emptyDescription="Todavia no registras aportes ni retiros."
          />
        </SectionCard>
      </div>

      <SectionCard title="Documentos" className="mt-5">
        <DataTable
          columns={documentColumns}
          rows={documentos}
          rowKey={(d) => d.id}
          emptyTitle="Sin documentos"
          emptyDescription="Todavía no hay documentos de respaldo cargados para este fondo."
        />
      </SectionCard>

      {cobrosFee.length > 0 && (
        <SectionCard title="Comisiones" className="mt-5">
          <DataTable columns={feeColumns} rows={cobrosFee} rowKey={(c) => c.id} />
        </SectionCard>
      )}

      <div className="mt-7 text-center text-[11.5px] leading-relaxed text-muted-foreground">
        El rendimiento del fondo es Time-Weighted Return (TWR): no lo afectan los aportes/retiros de
        los clientes. Tu rentabilidad anualizada (TIR) sí considera cuándo aportaste cada peso. Ninguno
        constituye asesoramiento financiero.
      </div>
    </main>
  );
}
