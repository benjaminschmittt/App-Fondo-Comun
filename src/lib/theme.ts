// Paleta y constantes visuales compartidas. Ver docs/portal-fondo-prototipo.jsx
// (prototipo aprobado) — esta es la misma paleta, centralizada para reuso.

export const C = {
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
} as const;

export const CHART_COLORS = [
  "#00296b",
  "#c9a24a",
  "#3b6ea5",
  "#8aa0b8",
  "#1f4e8c",
  "#d9b878",
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
