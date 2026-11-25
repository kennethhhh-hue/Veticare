import type { LucideIcon } from "lucide-react";
import { cn } from "@/lib/utils";

type Tone = "primary" | "warning" | "info" | "neutral";

export interface Metric {
  label: string;
  value: number | string;
  hint?: string;
  icon: LucideIcon;
  tone?: Tone;
}

const toneMap: Record<Tone, string> = {
  primary: "bg-primary-soft text-primary",
  warning: "bg-warning/12 text-warning",
  info: "bg-info/12 text-info",
  neutral: "bg-secondary text-muted-foreground",
};

export function MetricStrip({ metrics }: { metrics: Metric[] }) {
  return (
    <section className={cn(
      "surface-card fade-up mt-4 grid grid-cols-2 gap-px overflow-hidden rounded-2xl border border-border bg-border/70 sm:mt-5",
      metrics.length === 3 ? "sm:grid-cols-3" : "lg:grid-cols-4",
    )}>
      {metrics.map((metric) => {
        const Icon = metric.icon;
        return (
          <div key={metric.label} className="flex items-center gap-3 bg-card px-3.5 py-4 sm:px-4">
            <span
              className={cn(
                "grid size-9 shrink-0 place-items-center rounded-xl",
                toneMap[metric.tone ?? "primary"],
              )}
            >
              <Icon className="size-4" strokeWidth={2.1} />
            </span>
            <div className="min-w-0">
              <p className="text-[9px] font-bold uppercase leading-tight tracking-[0.1em] text-muted-foreground sm:text-[9.5px] sm:tracking-[0.12em]">
                {metric.label}
              </p>
              <p className="num mt-0.5 text-[22px] font-extrabold leading-none text-foreground">
                {metric.value}
              </p>
              {metric.hint ? (
                <p className="mt-0.5 truncate text-[9.5px] text-muted-foreground">{metric.hint}</p>
              ) : null}
            </div>
          </div>
        );
      })}
    </section>
  );
}
