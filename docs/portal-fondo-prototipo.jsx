import React, { useState, useMemo } from "react";
import {
  ResponsiveContainer, LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip,
  PieChart, Pie, Cell, BarChart, Bar,
} from "recharts";
import { LogOut, TrendingUp, TrendingDown, Wallet, Layers, PiggyBank, Lock, User } from "lucide-react";

/* ============================================================
   PORTAL DE CLIENTES — FONDO DE INVERSIÓN PRIVADO
   Prototipo funcional (datos de ejemplo en memoria).
   La autenticación y los datos son simulados; en producción
   esto lo sirve el backend + base de datos (ver doc técnico).
   ============================================================ */

const C = {
  navy: "#00296b",
  navyDeep: "#001b47",
  navyDeeper: "#00112e",
  gold: "#c9a24a",
  goldSoft: "#e3c878",
  ink: "#0f172a",
  muted: "#64748b",
  line: "#e6e9ef",
  surface: "#f4f6f9",
  pos: "#15803d",
  neg: "#b91c1c",
};
const CHART_COLORS = ["#00296b", "#c9a24a", "#3b6ea5", "#8aa0b8", "#1f4e8c", "#d9b878"];

/* ---------- Datos del fondo (nivel fondo, iguales para todos) ---------- */

const NAV = [
  { date: "2025-07", nav: 100.0 },
  { date: "2025-08", nav: 102.3 },
  { date: "2025-09", nav: 101.1 },
  { date: "2025-10", nav: 105.6 },
  { date: "2025-11", nav: 108.2 },
  { date: "2025-12", nav: 110.5 },
  { date: "2026-01", nav: 109.0 },
  { date: "2026-02", nav: 113.4 },
  { date: "2026-03", nav: 117.8 },
  { date: "2026-04", nav: 119.2 },
  { date: "2026-05", nav: 124.6 },
  { date: "2026-06", nav: 128.9 },
];

const POSITIONS = [
  { ticker: "AAPL", nombre: "Apple Inc.", tipo: "Acción", sector: "Tecnología", valor: 320000 },
  { ticker: "MSFT", nombre: "Microsoft", tipo: "Acción", sector: "Tecnología", valor: 280000 },
  { ticker: "NVDA", nombre: "Nvidia", tipo: "Acción", sector: "Tecnología", valor: 200000 },
  { ticker: "SPY", nombre: "ETF S&P 500", tipo: "ETF", sector: "Diversificado", valor: 250000 },
  { ticker: "AL30", nombre: "Bono Soberano AL30", tipo: "Bono", sector: "Renta Fija", valor: 180000 },
  { ticker: "GGAL", nombre: "Grupo Galicia", tipo: "Acción", sector: "Financiero", valor: 120000 },
  { ticker: "TSLA-P", nombre: "Put Tesla (cobertura)", tipo: "Opción", sector: "Derivados", valor: 50000 },
];

const FONDO = {
  fechaCorte: "30/06/2026",
  valorTotal: POSITIONS.reduce((s, p) => s + p.valor, 0),
  cuotapartesTotales: 100000,
};

/* ---------- Clientes (datos privados de cada uno) ---------- */
/* Solo se guardan movimientos. Las cuotapartes y el valor se DERIVAN. */

const CLIENTES = {
  "CLI-0001": {
    nombre: "Juan Pérez",
    movimientos: [
      { date: "2025-07", tipo: "aporte", monto: 100000 },
      { date: "2026-01", tipo: "aporte", monto: 50000 },
    ],
  },
  "CLI-0002": {
    nombre: "María González",
    movimientos: [
      { date: "2025-09", tipo: "aporte", monto: 200000 },
      { date: "2026-03", tipo: "retiro", monto: 30000 },
    ],
  },
  "CLI-0003": {
    nombre: "Carlos Díaz",
    movimientos: [{ date: "2025-11", tipo: "aporte", monto: 80000 }],
  },
};

const USERS = [
  { usuario: "juan", clave: "demo123", clienteId: "CLI-0001" },
  { usuario: "maria", clave: "demo123", clienteId: "CLI-0002" },
  { usuario: "carlos", clave: "demo123", clienteId: "CLI-0003" },
];

/* ---------- Helpers de cálculo y formato ---------- */

const navAt = (date) => NAV.find((p) => p.date === date)?.nav ?? null;

const sharesAt = (mov, date) =>
  mov
    .filter((m) => m.date <= date)
    .reduce((s, m) => {
      const cp = m.monto / navAt(m.date);
      return s + (m.tipo === "aporte" ? cp : -cp);
    }, 0);

const MESES = ["Ene", "Feb", "Mar", "Abr", "May", "Jun", "Jul", "Ago", "Sep", "Oct", "Nov", "Dic"];
const label = (ym) => {
  const [y, m] = ym.split("-");
  return `${MESES[parseInt(m, 10) - 1]} ${y.slice(2)}`;
};
const money = (n, dec = 0) =>
  "$ " + new Intl.NumberFormat("es-AR", { minimumFractionDigits: dec, maximumFractionDigits: dec }).format(n);
const pct = (n) => (n >= 0 ? "+" : "") + new Intl.NumberFormat("es-AR", { minimumFractionDigits: 1, maximumFractionDigits: 1 }).format(n * 100) + "%";

function clientMetrics(clienteId) {
  const cli = CLIENTES[clienteId];
  const last = NAV[NAV.length - 1];

  const serie = NAV.map((p) => {
    const sh = sharesAt(cli.movimientos, p.date);
    return { date: p.date, label: label(p.date), valor: sh > 0 ? +(sh * p.nav).toFixed(2) : null, nav: p.nav };
  });

  const cuotapartes = sharesAt(cli.movimientos, last.date);
  const valorActual = cuotapartes * last.nav;
  const aportesNetos = cli.movimientos.reduce((s, m) => s + (m.tipo === "aporte" ? m.monto : -m.monto), 0);
  const resultado = valorActual - aportesNetos;
  const resultadoPct = resultado / aportesNetos;

  const movimientos = cli.movimientos.map((m) => ({ ...m, cuotapartes: m.monto / navAt(m.date) }));

  return { nombre: cli.nombre, cuotapartes, valorActual, aportesNetos, resultado, resultadoPct, serie, movimientos };
}

/* ============================================================
   LOGIN
   ============================================================ */

function Login({ onLogin }) {
  const [usuario, setUsuario] = useState("");
  const [clave, setClave] = useState("");
  const [error, setError] = useState("");

  const submit = () => {
    const found = USERS.find((u) => u.usuario === usuario.trim().toLowerCase() && u.clave === clave);
    if (found) {
      setError("");
      onLogin(found.clienteId);
    } else {
      setError("Usuario o contraseña incorrectos.");
    }
  };

  return (
    <div
      className="min-h-screen flex items-center justify-center p-5"
      style={{ background: `radial-gradient(1200px 600px at 50% -10%, ${C.navy} 0%, ${C.navyDeep} 45%, ${C.navyDeeper} 100%)` }}
    >
      <div className="w-full" style={{ maxWidth: 420 }}>
        {/* Emblema */}
        <div className="flex flex-col items-center mb-7 fade-up">
          <div
            className="flex items-center justify-center mb-4"
            style={{
              width: 78, height: 78, borderRadius: "50%",
              border: `1.5px solid ${C.gold}`,
              background: "rgba(255,255,255,0.04)",
            }}
          >
            <span style={{ fontFamily: "Fraunces, serif", fontSize: 30, fontWeight: 600, color: C.goldSoft }}>F</span>
          </div>
          <div className="text-center">
            <div style={{ fontFamily: "Fraunces, serif", fontSize: 26, fontWeight: 600, color: "#fff", letterSpacing: 0.3 }}>
              Fondo Privado
            </div>
            <div style={{ color: C.goldSoft, fontSize: 11, letterSpacing: 2.5, textTransform: "uppercase", marginTop: 4 }}>
              Portal de Clientes
            </div>
          </div>
        </div>

        {/* Card */}
        <div className="rounded-2xl p-7 fade-up" style={{ background: "#fff", boxShadow: "0 24px 60px rgba(0,17,46,0.45)", animationDelay: "80ms" }}>
          <div className="mb-5">
            <div style={{ color: C.gold, fontSize: 10.5, letterSpacing: 2, textTransform: "uppercase", fontWeight: 600 }}>
              Acceso exclusivo
            </div>
            <h1 style={{ fontFamily: "Fraunces, serif", fontSize: 22, color: C.ink, marginTop: 6 }}>Bienvenido</h1>
            <p style={{ color: C.muted, fontSize: 13.5, marginTop: 4 }}>Ingresá con tus credenciales para ver tu inversión.</p>
          </div>

          <Field icon={<User size={16} />} label="Usuario" value={usuario} onChange={setUsuario} onEnter={submit} placeholder="usuario" />
          <Field icon={<Lock size={16} />} label="Contraseña" value={clave} onChange={setClave} onEnter={submit} placeholder="••••••••" type="password" />

          {error && (
            <div className="rounded-lg px-3 py-2 mt-1 mb-2" style={{ background: "#fef2f2", color: C.neg, fontSize: 13 }}>
              {error}
            </div>
          )}

          <button
            onClick={submit}
            className="w-full rounded-lg mt-2 transition-all"
            style={{ background: C.navy, color: "#fff", padding: "12px 0", fontWeight: 600, fontSize: 14.5, letterSpacing: 0.3 }}
            onMouseDown={(e) => (e.currentTarget.style.background = C.navyDeep)}
            onMouseUp={(e) => (e.currentTarget.style.background = C.navy)}
          >
            Ingresar
          </button>

          {/* Credenciales de prueba (solo en el prototipo) */}
          <div className="rounded-lg mt-5 p-3" style={{ background: C.surface, border: `1px dashed ${C.line}` }}>
            <div style={{ fontSize: 11, fontWeight: 600, color: C.muted, marginBottom: 6, letterSpacing: 0.4 }}>
              ACCESOS DE PRUEBA
            </div>
            <div style={{ fontSize: 12.5, color: C.ink, lineHeight: 1.7 }}>
              <code>juan</code> · <code>maria</code> · <code>carlos</code> &nbsp;—&nbsp; clave <code>demo123</code>
            </div>
          </div>
        </div>

        <div className="text-center mt-6" style={{ color: "rgba(255,255,255,0.45)", fontSize: 11.5, lineHeight: 1.8 }}>
          Prototipo de demostración · Datos de ejemplo
        </div>
      </div>

      <style>{`
        @import url('https://fonts.googleapis.com/css2?family=Fraunces:opsz,wght@9..144,500;9..144,600;9..144,700&family=Inter:wght@400;500;600;700&display=swap');
        * { font-family: Inter, system-ui, -apple-system, sans-serif; }
        code { font-family: ui-monospace, Menlo, monospace; background: #fff; padding: 1px 6px; border-radius: 5px; border: 1px solid ${C.line}; font-size: 12px; color: ${C.navy}; }
        .tnum { font-variant-numeric: tabular-nums; }
        .fade-up { animation: fadeUp .5s ease both; }
        @keyframes fadeUp { from { opacity: 0; transform: translateY(10px); } to { opacity: 1; transform: none; } }
        @media (prefers-reduced-motion: reduce) { .fade-up { animation: none; } }
      `}</style>
    </div>
  );
}

function Field({ icon, label, value, onChange, onEnter, placeholder, type = "text" }) {
  const [focus, setFocus] = useState(false);
  return (
    <div className="mb-4">
      <label style={{ fontSize: 12, fontWeight: 600, color: C.ink, display: "block", marginBottom: 6 }}>{label}</label>
      <div
        className="flex items-center rounded-lg px-3"
        style={{ border: `1.5px solid ${focus ? C.navy : C.line}`, background: "#fff", transition: "border-color .15s" }}
      >
        <span style={{ color: focus ? C.navy : C.muted }}>{icon}</span>
        <input
          type={type}
          value={value}
          placeholder={placeholder}
          onChange={(e) => onChange(e.target.value)}
          onKeyDown={(e) => e.key === "Enter" && onEnter()}
          onFocus={() => setFocus(true)}
          onBlur={() => setFocus(false)}
          className="w-full outline-none"
          style={{ padding: "11px 10px", fontSize: 14.5, color: C.ink, background: "transparent" }}
        />
      </div>
    </div>
  );
}

/* ============================================================
   DASHBOARD
   ============================================================ */

function Dashboard({ clienteId, onLogout }) {
  const m = useMemo(() => clientMetrics(clienteId), [clienteId]);
  const [breakdown, setBreakdown] = useState("tipo");
  const navVar = (NAV[NAV.length - 1].nav - NAV[NAV.length - 2].nav) / NAV[NAV.length - 2].nav;
  const navActual = NAV[NAV.length - 1].nav;

  const composicion = useMemo(() => {
    const key = breakdown === "tipo" ? "tipo" : "sector";
    const map = {};
    POSITIONS.forEach((p) => (map[p[key]] = (map[p[key]] || 0) + p.valor));
    return Object.entries(map).map(([name, value]) => ({ name, value })).sort((a, b) => b.value - a.value);
  }, [breakdown]);

  const bardata = useMemo(
    () => [...POSITIONS].sort((a, b) => b.valor - a.valor).map((p) => ({ name: p.ticker, valor: p.valor })),
    []
  );

  return (
    <div style={{ background: C.surface, minHeight: "100vh" }}>
      {/* Top bar */}
      <header
        className="sticky top-0 z-10 flex items-center justify-between px-5 md:px-8 py-3"
        style={{ background: C.navy, boxShadow: "0 2px 20px rgba(0,17,46,0.25)" }}
      >
        <div className="flex items-center" style={{ gap: 12 }}>
          <div className="flex items-center justify-center" style={{ width: 36, height: 36, borderRadius: "50%", border: `1.3px solid ${C.gold}` }}>
            <span style={{ fontFamily: "Fraunces, serif", fontWeight: 600, color: C.goldSoft, fontSize: 17 }}>F</span>
          </div>
          <div>
            <div style={{ fontFamily: "Fraunces, serif", color: "#fff", fontSize: 16, lineHeight: 1.1 }}>Fondo Privado</div>
            <div style={{ color: "rgba(255,255,255,0.55)", fontSize: 10.5, letterSpacing: 1.5, textTransform: "uppercase" }}>Portal de Clientes</div>
          </div>
        </div>
        <div className="flex items-center" style={{ gap: 16 }}>
          <div className="text-right" style={{ display: "none" }} />
          <div className="text-right">
            <div style={{ color: "#fff", fontSize: 13.5, fontWeight: 600 }}>{m.nombre}</div>
            <div style={{ color: "rgba(255,255,255,0.55)", fontSize: 11 }}>Datos al {FONDO.fechaCorte}</div>
          </div>
          <button
            onClick={onLogout}
            className="flex items-center rounded-lg transition-all"
            style={{ gap: 6, color: "#fff", border: "1px solid rgba(255,255,255,0.25)", padding: "7px 12px", fontSize: 13 }}
            onMouseEnter={(e) => (e.currentTarget.style.background = "rgba(255,255,255,0.08)")}
            onMouseLeave={(e) => (e.currentTarget.style.background = "transparent")}
          >
            <LogOut size={15} /> Salir
          </button>
        </div>
      </header>

      <main className="px-5 md:px-8 py-6 fade-up" style={{ maxWidth: 1160, margin: "0 auto" }}>
        {/* KPIs */}
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 mb-6">
          {/* Hero card */}
          <div className="rounded-2xl p-5 sm:col-span-2 lg:col-span-1" style={{ background: C.navy, color: "#fff", boxShadow: "0 16px 40px rgba(0,41,107,0.25)" }}>
            <div className="flex items-center" style={{ gap: 8, color: C.goldSoft, fontSize: 11, letterSpacing: 1.2, textTransform: "uppercase", fontWeight: 600 }}>
              <Wallet size={14} /> Valor de tu inversión
            </div>
            <div className="tnum" style={{ fontFamily: "Fraunces, serif", fontSize: 32, fontWeight: 600, marginTop: 10 }}>
              {money(m.valorActual)}
            </div>
            <div className="flex items-center tnum" style={{ gap: 6, marginTop: 6, fontSize: 13, color: m.resultado >= 0 ? C.goldSoft : "#fca5a5" }}>
              {m.resultado >= 0 ? <TrendingUp size={15} /> : <TrendingDown size={15} />}
              {money(m.resultado)} ({pct(m.resultadoPct)})
            </div>
          </div>

          <Kpi icon={<Layers size={14} />} title="Valor de la cuotaparte" value={money(navActual, 2)}
               sub={pct(navVar) + " vs. mes anterior"} subColor={navVar >= 0 ? C.pos : C.neg} />
          <Kpi icon={<PiggyBank size={14} />} title="Tus cuotapartes" value={new Intl.NumberFormat("es-AR", { maximumFractionDigits: 2 }).format(m.cuotapartes)}
               sub={`sobre ${new Intl.NumberFormat("es-AR").format(FONDO.cuotapartesTotales)} totales`} subColor={C.muted} />
          <Kpi icon={<TrendingUp size={14} />} title="Aportes netos" value={money(m.aportesNetos)}
               sub="capital invertido" subColor={C.muted} />
        </div>

        {/* Charts fila 1 */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-5 mb-5">
          <Card title="Evolución de tu inversión">
            <ResponsiveContainer width="100%" height={260}>
              <LineChart data={m.serie} margin={{ top: 8, right: 12, left: 4, bottom: 0 }}>
                <CartesianGrid strokeDasharray="3 3" stroke={C.line} vertical={false} />
                <XAxis dataKey="label" tick={{ fontSize: 11, fill: C.muted }} axisLine={false} tickLine={false} />
                <YAxis tick={{ fontSize: 11, fill: C.muted }} axisLine={false} tickLine={false} width={64}
                       tickFormatter={(v) => "$" + new Intl.NumberFormat("es-AR", { notation: "compact" }).format(v)} />
                <Tooltip formatter={(v) => [money(v), "Valor"]} contentStyle={tooltipStyle} />
                <Line type="monotone" dataKey="valor" stroke={C.navy} strokeWidth={2.5} dot={false} activeDot={{ r: 5 }} connectNulls />
              </LineChart>
            </ResponsiveContainer>
          </Card>

          <Card
            title="Composición del fondo"
            action={
              <div className="flex rounded-lg" style={{ border: `1px solid ${C.line}`, overflow: "hidden" }}>
                {["tipo", "sector"].map((b) => (
                  <button key={b} onClick={() => setBreakdown(b)}
                    style={{ padding: "5px 12px", fontSize: 12, fontWeight: 600, textTransform: "capitalize",
                      background: breakdown === b ? C.navy : "#fff", color: breakdown === b ? "#fff" : C.muted }}>
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
                    {composicion.map((_, i) => <Cell key={i} fill={CHART_COLORS[i % CHART_COLORS.length]} />)}
                  </Pie>
                  <Tooltip formatter={(v) => money(v)} contentStyle={tooltipStyle} />
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
                        {((c.value / tot) * 100).toFixed(0)}%
                      </span>
                    </div>
                  );
                })}
              </div>
            </div>
          </Card>
        </div>

        {/* Charts fila 2 */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-5 mb-5">
          <Card title="Evolución del valor de la cuotaparte">
            <ResponsiveContainer width="100%" height={240}>
              <LineChart data={NAV.map((p) => ({ ...p, label: label(p.date) }))} margin={{ top: 8, right: 12, left: 4, bottom: 0 }}>
                <CartesianGrid strokeDasharray="3 3" stroke={C.line} vertical={false} />
                <XAxis dataKey="label" tick={{ fontSize: 11, fill: C.muted }} axisLine={false} tickLine={false} />
                <YAxis tick={{ fontSize: 11, fill: C.muted }} axisLine={false} tickLine={false} width={44} domain={["dataMin - 4", "dataMax + 4"]} />
                <Tooltip formatter={(v) => [money(v, 2), "Cuotaparte"]} contentStyle={tooltipStyle} />
                <Line type="monotone" dataKey="nav" stroke={C.gold} strokeWidth={2.5} dot={false} activeDot={{ r: 5 }} />
              </LineChart>
            </ResponsiveContainer>
          </Card>

          <Card title="Principales posiciones del fondo">
            <ResponsiveContainer width="100%" height={240}>
              <BarChart data={bardata} margin={{ top: 8, right: 12, left: 4, bottom: 0 }}>
                <CartesianGrid strokeDasharray="3 3" stroke={C.line} vertical={false} />
                <XAxis dataKey="name" tick={{ fontSize: 11, fill: C.muted }} axisLine={false} tickLine={false} />
                <YAxis tick={{ fontSize: 11, fill: C.muted }} axisLine={false} tickLine={false} width={52}
                       tickFormatter={(v) => "$" + new Intl.NumberFormat("es-AR", { notation: "compact" }).format(v)} />
                <Tooltip formatter={(v) => [money(v), "Valor"]} contentStyle={tooltipStyle} cursor={{ fill: "rgba(0,41,107,0.05)" }} />
                <Bar dataKey="valor" radius={[5, 5, 0, 0]} fill={C.navy} />
              </BarChart>
            </ResponsiveContainer>
          </Card>
        </div>

        {/* Tablas */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-5">
          <Card title="Posiciones actuales del fondo">
            <div style={{ overflowX: "auto" }}>
              <table style={{ width: "100%", borderCollapse: "collapse", fontSize: 13 }}>
                <thead>
                  <tr style={{ color: C.muted, textAlign: "left", fontSize: 11, textTransform: "uppercase", letterSpacing: 0.5 }}>
                    <th style={th}>Activo</th><th style={th}>Tipo</th><th style={{ ...th, textAlign: "right" }}>Valor</th><th style={{ ...th, textAlign: "right" }}>%</th>
                  </tr>
                </thead>
                <tbody>
                  {[...POSITIONS].sort((a, b) => b.valor - a.valor).map((p) => (
                    <tr key={p.ticker} style={{ borderTop: `1px solid ${C.line}` }}>
                      <td style={td}><strong style={{ color: C.ink }}>{p.ticker}</strong> <span style={{ color: C.muted }}>· {p.nombre}</span></td>
                      <td style={{ ...td, color: C.muted }}>{p.tipo}</td>
                      <td className="tnum" style={{ ...td, textAlign: "right", color: C.ink }}>{money(p.valor)}</td>
                      <td className="tnum" style={{ ...td, textAlign: "right", color: C.muted }}>{((p.valor / FONDO.valorTotal) * 100).toFixed(1)}%</td>
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
                    <th style={th}>Fecha</th><th style={th}>Tipo</th><th style={{ ...th, textAlign: "right" }}>Monto</th><th style={{ ...th, textAlign: "right" }}>Cuotapartes</th>
                  </tr>
                </thead>
                <tbody>
                  {m.movimientos.map((mv, i) => (
                    <tr key={i} style={{ borderTop: `1px solid ${C.line}` }}>
                      <td style={td}>{label(mv.date)}</td>
                      <td style={td}>
                        <span style={{ fontSize: 11.5, fontWeight: 600, padding: "2px 9px", borderRadius: 99,
                          background: mv.tipo === "aporte" ? "#ecfdf5" : "#fef2f2", color: mv.tipo === "aporte" ? C.pos : C.neg, textTransform: "capitalize" }}>
                          {mv.tipo}
                        </span>
                      </td>
                      <td className="tnum" style={{ ...td, textAlign: "right", color: C.ink }}>{money(mv.monto)}</td>
                      <td className="tnum" style={{ ...td, textAlign: "right", color: C.muted }}>
                        {new Intl.NumberFormat("es-AR", { maximumFractionDigits: 2 }).format(mv.cuotapartes)}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </Card>
        </div>

        <div className="text-center" style={{ color: C.muted, fontSize: 11.5, marginTop: 28, lineHeight: 1.8 }}>
          Prototipo de demostración · Datos de ejemplo en memoria · La rentabilidad mostrada es resultado simple (valor actual − aportes netos)
        </div>
      </main>

      <style>{`
        @import url('https://fonts.googleapis.com/css2?family=Fraunces:opsz,wght@9..144,500;9..144,600;9..144,700&family=Inter:wght@400;500;600;700&display=swap');
        * { font-family: Inter, system-ui, -apple-system, sans-serif; }
        .tnum { font-variant-numeric: tabular-nums; }
        .fade-up { animation: fadeUp .45s ease both; }
        @keyframes fadeUp { from { opacity: 0; transform: translateY(8px); } to { opacity: 1; transform: none; } }
        @media (prefers-reduced-motion: reduce) { .fade-up { animation: none; } }
      `}</style>
    </div>
  );
}

const tooltipStyle = { borderRadius: 10, border: "1px solid #e6e9ef", fontSize: 13, boxShadow: "0 8px 24px rgba(0,17,46,0.12)" };
const th = { padding: "8px 6px", fontWeight: 600 };
const td = { padding: "10px 6px", verticalAlign: "middle" };

function Kpi({ icon, title, value, sub, subColor }) {
  return (
    <div className="rounded-2xl p-5" style={{ background: "#fff", border: `1px solid ${C.line}` }}>
      <div className="flex items-center" style={{ gap: 8, color: C.muted, fontSize: 11, letterSpacing: 0.8, textTransform: "uppercase", fontWeight: 600 }}>
        {icon} {title}
      </div>
      <div className="tnum" style={{ fontFamily: "Fraunces, serif", fontSize: 26, fontWeight: 600, color: C.ink, marginTop: 10 }}>{value}</div>
      <div className="tnum" style={{ fontSize: 12.5, color: subColor, marginTop: 5 }}>{sub}</div>
    </div>
  );
}

function Card({ title, action, children }) {
  return (
    <div className="rounded-2xl p-5" style={{ background: "#fff", border: `1px solid ${C.line}` }}>
      <div className="flex items-center justify-between mb-3">
        <h2 style={{ fontFamily: "Fraunces, serif", fontSize: 16, color: C.ink, fontWeight: 600 }}>{title}</h2>
        {action}
      </div>
      {children}
    </div>
  );
}

/* ============================================================
   APP
   ============================================================ */

export default function App() {
  const [clienteId, setClienteId] = useState(null);
  return clienteId
    ? <Dashboard clienteId={clienteId} onLogout={() => setClienteId(null)} />
    : <Login onLogin={setClienteId} />;
}
