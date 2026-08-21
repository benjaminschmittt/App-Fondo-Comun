// Paleta y formatters compartidos. Los VALORES tienen que quedar
// identicos a los custom properties de src/app/globals.css (fuente de
// verdad del sistema de diseño, ver plan del rediseño visual) — este
// objeto existe para los pocos lugares que necesitan un string de color
// en JS (Recharts/SVG no aceptan clases de Tailwind). Pantallas nuevas
// (rediseño V1+) usan las utilidades de Tailwind (bg-navy, text-gold,
// etc.) en vez de importar C directamente.
export const C = {
  navy: "#0f172a",
  navyDeep: "#1e293b",
  navyDeeper: "#060b14",
  gold: "#0f766e",
  goldSoft: "#5eead4",
  ink: "#111827",
  muted: "#6b7280",
  line: "#e5e7eb",
  surface: "#f7f8fa",
  pos: "#15803d",
  neg: "#b91c1c",
  warn: "#b45309",
} as const;

// Espeja --chart-1..5 de globals.css.
export const CHART_COLORS = [
  "#0f172a", // chart-1 / navy
  "#0f766e", // chart-2 / gold (petroleo)
  "#3b6ea5", // chart-3
  "#8aa0b8", // chart-4
  "#14b8a6", // chart-5
  "#5eead4",
];

export const money = (n: number, dec = 0) =>
  "$ " +
  new Intl.NumberFormat("es-AR", {
    minimumFractionDigits: dec,
    maximumFractionDigits: dec,
  }).format(n);

export const pct = (n: number) =>
  (n >= 0 ? "+" : "") +
  new Intl.NumberFormat("es-AR", {
    minimumFractionDigits: 1,
    maximumFractionDigits: 1,
  }).format(n * 100) +
  "%";

export const numero = (n: number, dec = 2) =>
  new Intl.NumberFormat("es-AR", { maximumFractionDigits: dec }).format(n);

const MESES = [
  "Ene", "Feb", "Mar", "Abr", "May", "Jun",
  "Jul", "Ago", "Sep", "Oct", "Nov", "Dic",
];

export const fechaCorta = (d: Date) =>
  `${MESES[d.getUTCMonth()]} ${String(d.getUTCFullYear()).slice(2)}`;

export const fechaLarga = (d: Date) =>
  d.toLocaleDateString("es-AR", { day: "2-digit", month: "2-digit", year: "numeric", timeZone: "UTC" });
