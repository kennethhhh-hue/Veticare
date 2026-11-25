import { Area, AreaChart } from "recharts";
import { cn } from "@/lib/utils";
import type { Kpi, Tone } from "@/data/veticare";

const strokeMap: Record<Tone, string> = {
  primary: "hsl(var(--chart-1))",
  warning: "hsl(var(--chart-3))",
  info: "hsl(var(--chart-4))",
  danger: "hsl(var(--chart-2))",
  neutral: "hsl(var(--muted-foreground))",
};

interface StatCardProps {
  kpi: Kpi;
  index?: number;
  onClick?: () => void;
  loading?: boolean;
}

export function StatCard({ kpi, index = 0, onClick, loading = false }: StatCardProps) {
  const improving = kpi.id === "pending" ? kpi.delta < 0 : kpi.delta > 0;
  const gradientId = `spark-${kpi.id}`;

  return (
    <button
      type="button"
      onClick={onClick}
      aria-label={`Open ${kpi.label}`}
      className="fade-up surface-card relative w-full overflow-hidden rounded-2xl border border-border bg-card p-4 text-left transition-all duration-300 hover:-translate-y-0.5 hover:border-primary/25 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary sm:p-5"
      style={{ animationDelay: `${index * 70}ms` }}
    >
      <div className="flex min-h-8 items-start justify-between gap-2">
        <p className="text-[11.5px] font-semibold uppercase leading-snug tracking-[0.1em] text-muted-foreground">
          {kpi.label}
        </p>
        {!loading && kpi.delta !== 0 ? <span
          className={cn(
            "num shrink-0 rounded-full px-2 py-1 text-[11px] font-bold",
            improving
              ? "bg-success/10 text-success"
              : "bg-destructive/10 text-destructive",
          )}
        >
          {kpi.delta > 0 ? "+" : "−"}{Math.abs(kpi.delta)}%
        </span> : null}
      </div>

      <div className="mt-1 flex items-end justify-between gap-2">
        <p className="num text-[30px] font-extrabold leading-none text-foreground sm:text-[34px]">
          {loading ? "—" : kpi.value}
        </p>
        <div className="h-9 w-[74px] shrink-0 opacity-90">
          <AreaChart
            width={74}
            height={36}
            data={kpi.series.map((value, i) => ({ i, value }))}
            margin={{ top: 2, bottom: 2, left: 0, right: 0 }}
          >
              <defs>
                <linearGradient id={gradientId} x1="0" y1="0" x2="0" y2="1">
                  <stop offset="0%" stopColor={strokeMap[kpi.tone]} stopOpacity={0.28} />
                  <stop offset="100%" stopColor={strokeMap[kpi.tone]} stopOpacity={0} />
                </linearGradient>
              </defs>
              <Area
                type="monotone"
                dataKey="value"
                stroke={strokeMap[kpi.tone]}
                strokeWidth={2}
                fill={`url(#${gradientId})`}
                isAnimationActive={false}
              />
          </AreaChart>
        </div>
      </div>
      <p className="mt-2 text-[11.5px] leading-snug text-muted-foreground">{loading ? "Loading live data…" : kpi.caption}</p>
    </button>
  );
}
