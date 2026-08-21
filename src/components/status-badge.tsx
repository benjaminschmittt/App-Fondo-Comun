import { Badge } from "@/components/ui/badge";
import { cn } from "@/lib/utils";

const TONE_CLASS = {
  pos: "bg-pos-soft text-pos",
  neg: "bg-neg-soft text-neg",
  warn: "bg-warn-soft text-warn",
  // Outline en vez de fondo tintado: bg-muted + text-muted-foreground da
  // ~4.27:1 de contraste, por debajo del 4.5:1 que pide WCAG AA para texto
  // normal. Sin fondo propio (bg-transparent, apoyado en la card blanca de
  // atrás) el mismo texto sube a ~4.8:1.
  muted: "border-border bg-transparent text-muted-foreground",
} as const;

export function StatusBadge({
  tone,
  children,
  className,
}: {
  tone: keyof typeof TONE_CLASS;
  children: React.ReactNode;
  className?: string;
}) {
  return (
    <Badge
      variant="outline"
      className={cn(
        "border-transparent font-semibold capitalize",
        TONE_CLASS[tone],
        className
      )}
    >
      {children}
    </Badge>
  );
}
