import { SectionCard } from "@/components/section-card";

// Estilos compartidos para Recharts — sobrios, tomados de los tokens del
// sistema de diseño en vez de strings de color sueltos por grafico.
export const chartTooltipStyle: React.CSSProperties = {
  borderRadius: 8,
  border: "1px solid var(--border)",
  fontSize: 13,
  boxShadow: "0 8px 24px rgba(15,23,42,0.12)",
  background: "var(--card)",
};

export const chartAxisTick = { fontSize: 11, fill: "var(--gray-600)" };

export const chartGridProps = {
  stroke: "var(--border)",
  strokeDasharray: "3 3",
  vertical: false,
} as const;

export function ChartCard({
  title,
  action,
  children,
  className,
}: {
  title?: string;
  action?: React.ReactNode;
  children: React.ReactNode;
  className?: string;
}) {
  return (
    <SectionCard title={title} action={action} className={className}>
      {children}
    </SectionCard>
  );
}
