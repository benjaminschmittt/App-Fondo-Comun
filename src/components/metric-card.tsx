import { cn } from "@/lib/utils";

const SUB_TONE_CLASS = {
  pos: "text-pos",
  neg: "text-neg",
  muted: "text-muted-foreground",
} as const;

export function MetricCard({
  icon,
  label,
  value,
  sub,
  subTone = "muted",
  variant = "default",
  className,
}: {
  icon?: React.ReactNode;
  label: string;
  value: string;
  sub?: string;
  subTone?: keyof typeof SUB_TONE_CLASS;
  variant?: "default" | "hero";
  className?: string;
}) {
  const hero = variant === "hero";

  return (
    <div
      className={cn(
        "rounded-2xl bg-card p-7 ring-1 ring-black/5 shadow-[var(--shadow-card)]",
        hero && "bg-primary text-primary-foreground shadow-[var(--shadow-hero)] ring-0",
        className
      )}
    >
      <div
        className={cn(
          "label-eyebrow flex items-center gap-2",
          hero ? "text-primary-foreground/65" : "text-muted-foreground"
        )}
      >
        {icon}
        {label}
      </div>
      <div className="tnum mt-2.5 text-[26px] leading-none font-semibold">
        {value}
      </div>
      {sub && (
        <div
          className={cn(
            "tnum mt-1.5 text-[13px]",
            hero ? "text-gold-soft" : SUB_TONE_CLASS[subTone]
          )}
        >
          {sub}
        </div>
      )}
    </div>
  );
}
