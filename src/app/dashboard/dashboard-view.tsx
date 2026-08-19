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
import { TrendingUp, TrendingDown, Wallet, Layers, PiggyBank } from "lucide-react";
import { C, CHART_COLORS, money, pct, numero, fechaCorta } from "@/lib/theme";
import type { MiInversion } from "@/data/inversion";

const tooltipStyle = {
  borderRadius: 10,
  border: "1px solid #e6e9ef",
  fontSize: 13,
  boxShadow: "0 8px 24px rgba(0,17,46,0.12)",
};
const th: React.CSSProperties = { padding: "8px 6px", fontWeight: 600 };
const td: React.CSSProperties = { padding: "10px 6px", verticalAlign: "middle" };

function Kpi({
  icon,
  title,
  value,
  sub,
  subColor,
}: {
  icon: React.ReactNode;
  title: string;
  value: string;
  sub: string;
  subColor: string;
}) {
  return (
    <div className="rounded-2xl p-5" style={{ background: "#fff", border: `1px solid ${C.line}` }}>
      <div
        className="flex items-center"
        style={{ gap: 8, color: C.muted, fontSize: 11, letterSpacing: 0.8, textTransform: "uppercase", fontWeight: 600 }}
      >
        {icon} {title}
      </div>
      <div className="tnum" style={{ fontFamily: "var(--font-fraunces), serif", fontSize: 26, fontWeight: 600, color: C.ink, marginTop: 10 }}>
        {value}
      </div>
      <div className="tnum" style={{ fontSize: 12.5, color: subColor, marginTop: 5 }}>
        {sub}
      </div>
    </div>
  );
}

function Card({ title, action, children }: { title: string; action?: React.ReactNode; children: React.ReactNode }) {
  return (
    <div className="rounded-2xl p-5" style={{ background: "#fff", border: `1px solid ${C.line}` }}>
      <div className="flex items-center justify-between mb-3">
        <h2 style={{ fontFamily: "var(--font-fraunces), serif", fontSize: 16, color: C.ink, fontWeight: 600 }}>{title}</h2>
        {action}
      </div>
      {children}
    </div>
  );
}

export function DashboardView({ data }: { data: MiInversion }) {
  const [breakdown, setBreakdown] = useState<"tipo" | "sector">("tipo");

  const nav = data.fondo.navSeries;
  const navActual = nav[nav.length - 1]?.valorCuotaparte ?? 0;
  const navAnterior = nav[nav.length - 2]?.valorCuotaparte ?? navActual;
  const navVar = navAnterior > 0 ? (navActual - navAnterior) / navAnterior : 0;

  const serieChart = useMemo(
    () => data.serie.map((p) => ({ ...p, label: fechaCorta(p.fecha) })),
    [data.serie]
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

  const bardata = useMemo(
    () =>
      [...data.fondo.positions]
        .sort((a, b) => b.valorMercado - a.valorMercado)
        .map((p) => ({ name: p.ticker, valor: p.valorMercado })),
    [data.fondo.positions]
  );

  return (
    <main className="px-5 md:px-8 py-6 fade-up" style={{ maxWidth: 1160, margin: "0 auto" }}>
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 mb-6">
        <div
          className="rounded-2xl p-5 sm:col-span-2 lg:col-span-1"
          style={{ background: C.navy, color: "#fff", boxShadow: "0 16px 40px rgba(0,41,107,0.25)" }}
        >
          <div
            className="flex items-center"
            style={{ gap: 8, color: C.goldSoft, fontSize: 11, letterSpacing: 1.2, textTransform: "uppercase", fontWeight: 600 }}
          >
            <Wallet size={14} /> Valor de tu inversion
          </div>
          <div className="tnum" style={{ fontFamily: "var(--font-fraunces), serif", fontSize: 32, fontWeight: 600, marginTop: 10 }}>
            {money(data.valorActual)}
          </div>
          <div
            className="flex items-center tnum"
            style={{ gap: 6, marginTop: 6, fontSize: 13, color: data.resultado >= 0 ? C.goldSoft : "#fca5a5" }}
          >
            {data.resultado >= 0 ? <TrendingUp size={15} /> : <TrendingDown size={15} />}
            {money(data.resultado)} ({pct(data.resultadoPct)})
          </div>
        </div>

        <Kpi
          icon={<Layers size={14} />}
          title="Valor de la cuotaparte"
          value={money(navActual, 2)}
          sub={pct(navVar) + " vs. corte anterior"}
          subColor={navVar >= 0 ? C.pos : C.neg}
        />
        <Kpi
          icon={<PiggyBank size={14} />}
          title="Tus cuotapartes"
          value={numero(data.cuotapartes)}
          sub={`sobre ${numero(data.fondo.cuotapartesTotales, 0)} totales`}
          subColor={C.muted}
        />
        <Kpi
          icon={<TrendingUp size={14} />}
          title="Aportes netos"
          value={money(data.aportesNetos)}
          sub="capital invertido"
          subColor={C.muted}
        />
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-5 mb-5">
        <Card title="Evolucion de tu inversion">
          <ResponsiveContainer width="100%" height={260}>
            <LineChart data={serieChart} margin={{ top: 8, right: 12, left: 4, bottom: 0 }}>
              <CartesianGrid strokeDasharray="3 3" stroke={C.line} vertical={false} />
              <XAxis dataKey="label" tick={{ fontSize: 11, fill: C.muted }} axisLine={false} tickLine={false} />
              <YAxis
                tick={{ fontSize: 11, fill: C.muted }}
                axisLine={false}
                tickLine={false}
                width={64}
                tickFormatter={(v: number) => "$" + new Intl.NumberFormat("es-AR", { notation: "compact" }).format(v)}
              />
              <Tooltip formatter={(v) => [money(Number(v)), "Valor"]} contentStyle={tooltipStyle} />
              <Line type="monotone" dataKey="valorInversion" stroke={C.navy} strokeWidth={2.5} dot={false} activeDot={{ r: 5 }} connectNulls />
            </LineChart>
          </ResponsiveContainer>
        </Card>

        <Card
          title="Composicion del fondo"
          action={
            <div className="flex rounded-lg" style={{ border: `1px solid ${C.line}`, overflow: "hidden" }}>
              {(["tipo", "sector"] as const).map((b) => (
                <button
                  key={b}
                  onClick={() => setBreakdown(b)}
                  style={{
                    padding: "5px 12px",
                    fontSize: 12,
                    fontWeight: 600,
                    textTransform: "capitalize",
                    background: breakdown === b ? C.navy : "#fff",
                    color: breakdown === b ? "#fff" : C.muted,
                  }}
                >
                  {b === "tipo" ? "Por tipo" : "Por sector"}
                </button>
              ))}
            </div>
          }
        >
          <div className="flex items-center" style={{ gap: 8 }}>
            <ResponsiveContainer width="55%" height={240}>
              <PieChart>
                <Pie data={composicion} dataKey="value" nameKey="name" innerRadius={52} outerRadius={88} paddingAngle={2} stroke="none">
                  {composicion.map((_, i) => (
                    <Cell key={i} fill={CHART_COLORS[i % CHART_COLORS.length]} />
                  ))}
                </Pie>
                <Tooltip formatter={(v) => money(Number(v))} contentStyle={tooltipStyle} />
              </PieChart>
            </ResponsiveContainer>
            <div className="flex-1">
              {composicion.map((c, i) => {
                const tot = composicion.reduce((s, x) => s + x.value, 0);
                return (
                  <div key={c.name} className="flex items-center justify-between" style={{ padding: "5px 0", borderBottom: `1px solid ${C.line}` }}>
                    <span className="flex items-center" style={{ gap: 8, fontSize: 13, color: C.ink }}>
                      <span style={{ width: 9, height: 9, borderRadius: 2, background: CHART_COLORS[i % CHART_COLORS.length] }} />
                      {c.name}
                    </span>
                    <span className="tnum" style={{ fontSize: 13, fontWeight: 600, color: C.ink }}>
                      {tot > 0 ? ((c.value / tot) * 100).toFixed(0) : 0}%
                    </span>
                  </div>
                );
              })}
            </div>
          </div>
        </Card>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-5 mb-5">
        <Card title="Evolucion del valor de la cuotaparte">
          <ResponsiveContainer width="100%" height={240}>
            <LineChart
              data={nav.map((p) => ({ ...p, label: fechaCorta(p.fecha) }))}
              margin={{ top: 8, right: 12, left: 4, bottom: 0 }}
            >
              <CartesianGrid strokeDasharray="3 3" stroke={C.line} vertical={false} />
              <XAxis dataKey="label" tick={{ fontSize: 11, fill: C.muted }} axisLine={false} tickLine={false} />
              <YAxis tick={{ fontSize: 11, fill: C.muted }} axisLine={false} tickLine={false} width={44} domain={["dataMin - 4", "dataMax + 4"]} />
              <Tooltip formatter={(v) => [money(Number(v), 2), "Cuotaparte"]} contentStyle={tooltipStyle} />
              <Line type="monotone" dataKey="valorCuotaparte" stroke={C.gold} strokeWidth={2.5} dot={false} activeDot={{ r: 5 }} />
            </LineChart>
          </ResponsiveContainer>
        </Card>

        <Card title="Principales posiciones del fondo">
          <ResponsiveContainer width="100%" height={240}>
            <BarChart data={bardata} margin={{ top: 8, right: 12, left: 4, bottom: 0 }}>
              <CartesianGrid strokeDasharray="3 3" stroke={C.line} vertical={false} />
              <XAxis dataKey="name" tick={{ fontSize: 11, fill: C.muted }} axisLine={false} tickLine={false} />
              <YAxis
                tick={{ fontSize: 11, fill: C.muted }}
                axisLine={false}
                tickLine={false}
                width={52}
                tickFormatter={(v: number) => "$" + new Intl.NumberFormat("es-AR", { notation: "compact" }).format(v)}
              />
              <Tooltip formatter={(v) => [money(Number(v)), "Valor"]} contentStyle={tooltipStyle} cursor={{ fill: "rgba(0,41,107,0.05)" }} />
              <Bar dataKey="valor" radius={[5, 5, 0, 0]} fill={C.navy} />
            </BarChart>
          </ResponsiveContainer>
        </Card>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-5">
        <Card title="Posiciones actuales del fondo">
          <div style={{ overflowX: "auto" }}>
            <table style={{ width: "100%", borderCollapse: "collapse", fontSize: 13 }}>
              <thead>
                <tr style={{ color: C.muted, textAlign: "left", fontSize: 11, textTransform: "uppercase", letterSpacing: 0.5 }}>
                  <th style={th}>Activo</th>
                  <th style={th}>Tipo</th>
                  <th style={{ ...th, textAlign: "right" }}>Valor</th>
                  <th style={{ ...th, textAlign: "right" }}>%</th>
                </tr>
              </thead>
              <tbody>
                {[...data.fondo.positions]
                  .sort((a, b) => b.valorMercado - a.valorMercado)
                  .map((p) => (
                    <tr key={p.ticker} style={{ borderTop: `1px solid ${C.line}` }}>
                      <td style={td}>
                        <strong style={{ color: C.ink }}>{p.ticker}</strong>{" "}
                        <span style={{ color: C.muted }}>· {p.nombre}</span>
                      </td>
                      <td style={{ ...td, color: C.muted }}>{p.tipoInstrumento}</td>
                      <td className="tnum" style={{ ...td, textAlign: "right", color: C.ink }}>
                        {money(p.valorMercado)}
                      </td>
                      <td className="tnum" style={{ ...td, textAlign: "right", color: C.muted }}>
                        {data.fondo.valorTotalFondo > 0 ? ((p.valorMercado / data.fondo.valorTotalFondo) * 100).toFixed(1) : "0.0"}%
                      </td>
                    </tr>
                  ))}
              </tbody>
            </table>
          </div>
        </Card>

        <Card title="Tus movimientos">
          <div style={{ overflowX: "auto" }}>
            <table style={{ width: "100%", borderCollapse: "collapse", fontSize: 13 }}>
              <thead>
                <tr style={{ color: C.muted, textAlign: "left", fontSize: 11, textTransform: "uppercase", letterSpacing: 0.5 }}>
                  <th style={th}>Fecha</th>
                  <th style={th}>Tipo</th>
                  <th style={{ ...th, textAlign: "right" }}>Monto</th>
                  <th style={{ ...th, textAlign: "right" }}>Cuotapartes</th>
                </tr>
              </thead>
              <tbody>
                {data.movimientos.map((mv, i) => (
                  <tr key={i} style={{ borderTop: `1px solid ${C.line}` }}>
                    <td style={td}>{fechaCorta(mv.fecha)}</td>
                    <td style={td}>
                      <span
                        style={{
                          fontSize: 11.5,
                          fontWeight: 600,
                          padding: "2px 9px",
                          borderRadius: 99,
                          background: mv.tipo === "aporte" ? "#ecfdf5" : "#fef2f2",
                          color: mv.tipo === "aporte" ? C.pos : C.neg,
                          textTransform: "capitalize",
                        }}
                      >
                        {mv.tipo}
                      </span>
                    </td>
                    <td className="tnum" style={{ ...td, textAlign: "right", color: C.ink }}>
                      {money(mv.monto)}
                    </td>
                    <td className="tnum" style={{ ...td, textAlign: "right", color: C.muted }}>
                      {numero(mv.cuotapartes)}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </Card>
      </div>

      <div className="text-center" style={{ color: C.muted, fontSize: 11.5, marginTop: 28, lineHeight: 1.8 }}>
        La rentabilidad mostrada es resultado simple (valor actual − aportes netos). No constituye asesoramiento financiero.
      </div>
    </main>
  );
}
