// Formatters compartidos + paleta de gráficos. Los valores de
// CHART_COLORS tienen que quedar identicos a --chart-1..5 de
// src/app/globals.css (fuente de verdad del sistema de diseño) —
// Recharts/SVG necesitan un string de color en JS, no aceptan clases
// de Tailwind. El resto de la app usa las utilidades de Tailwind
// (bg-navy, text-gold, etc., ver comentario en globals.css sobre esos
// nombres historicos) en vez de un objeto de color en JS.
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

export const bytes = (n: number) => {
  if (n < 1024) return `${n} B`;
  const unidades = ["KB", "MB", "GB"];
  let v = n / 1024;
  let i = 0;
  while (v >= 1024 && i < unidades.length - 1) {
    v /= 1024;
    i++;
  }
  return `${v.toFixed(1)} ${unidades[i]}`;
};

export const fechaLarga = (d: Date) =>
  d.toLocaleDateString("es-AR", { day: "2-digit", month: "2-digit", year: "numeric", timeZone: "UTC" });
