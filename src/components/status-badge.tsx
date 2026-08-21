import { Badge } from "@/components/ui/badge";
import { cn } from "@/lib/utils";

const TONE_CLASS = {
  pos: "bg-pos-soft text-pos",
  neg: "bg-neg-soft text-neg",
  warn: "bg-warn-soft text-warn",
  muted: "bg-muted text-muted-foreground",
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
