import { useEffect, useState } from "react";
import {
  Area,
  AreaChart,
  CartesianGrid,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from "recharts";
import { TrendingUp } from "lucide-react";
import { cn } from "@/lib/utils";
import { addCalendarDays, getPhilippineDateKey, getPhilippineDayStartIso, PHILIPPINE_TIME_ZONE } from "@/lib/philippine-date";
import { type ActivityPoint, type RangeKey } from "@/data/veticare";
import { supabase } from "@/integrations/supabase/client";

interface TooltipPayload {
  name?: string;
  dataKey?: string | number;
  value?: number | string;
  color?: string;
}

interface ChartTooltipProps {
  active?: boolean;
  label?: string | number;
  payload?: TooltipPayload[];
}

function ChartTooltip({ active, label, payload }: ChartTooltipProps) {
  if (!active || !payload?.length) return null;

  return (
    <div className="rounded-xl border border-border bg-popover/95 px-3 py-2 shadow-raised backdrop-blur">
      <p className="text-[10.5px] font-bold uppercase tracking-[0.12em] text-muted-foreground">
        {label}
      </p>
      <div className="mt-1.5 space-y-1">
        {payload.map((entry) => (
          <div key={String(entry.dataKey)} className="flex items-center gap-2">
            <span
              className="size-2 rounded-full"
              style={{ backgroundColor: entry.color }}
            />
            <span className="text-[11.5px] capitalize text-muted-foreground">
              {entry.name}
            </span>
            <span className="num ml-auto text-[12px] font-bold text-foreground">
              {entry.value}
            </span>
          </div>
        ))}
      </div>
    </div>
  );
}

const ranges: RangeKey[] = ["7d", "30d", "90d"];

interface ActivityChartProps {
  range: RangeKey;
  onRangeChange: (range: RangeKey) => void;
}

export function ActivityChart({ range, onRangeChange }: ActivityChartProps) {
  const [data, setData] = useState<ActivityPoint[]>([]);
  const [loading, setLoading] = useState(true);
  const [loadError, setLoadError] = useState<string | null>(null);

  useEffect(() => {
    let active = true;
    const loadTrends = async () => {
      setLoading(true);
      setLoadError(null);
      const days = Number.parseInt(range, 10);
      const endDate = getPhilippineDateKey();
      const startDate = addCalendarDays(endDate, -days + 1);
      const endExclusiveDate = addCalendarDays(endDate, 1);
      const startIso = getPhilippineDayStartIso(startDate);
      const endExclusiveIso = getPhilippineDayStartIso(endExclusiveDate);

      const [petsResult, adoptionsResult] = await Promise.all([
        supabase.from("pets").select("created_at").gte("created_at", startIso).lt("created_at", endExclusiveIso),
        supabase.from("adoption_applications").select("decision_date").eq("status", "completed").gte("decision_date", startDate).lte("decision_date", endDate),
      ]);

      if (!active) return;
      const error = petsResult.error ?? adoptionsResult.error;
      if (error) {
        setLoadError(error.message);
        setData([]);
        setLoading(false);
        return;
      }

      const counts = new Map<string, { registrations: number; adoptions: number }>();
      for (let offset = 0; offset < days; offset += 1) {
        counts.set(addCalendarDays(startDate, offset), { registrations: 0, adoptions: 0 });
      }
      for (const pet of petsResult.data ?? []) {
        const dateKey = getPhilippineDateKey(new Date(pet.created_at));
        const bucket = counts.get(dateKey);
        if (bucket) bucket.registrations += 1;
      }
      for (const adoption of adoptionsResult.data ?? []) {
        if (!adoption.decision_date) continue;
        const bucket = counts.get(adoption.decision_date);
        if (bucket) bucket.adoptions += 1;
      }

      setData([...counts.entries()].map(([dateKey, totals]) => {
        const date = new Date(`${dateKey}T12:00:00Z`);
        const label = date.toLocaleDateString("en-PH", { month: "short", day: "numeric", timeZone: PHILIPPINE_TIME_ZONE });
        return { label, ...totals };
      }));
      setLoading(false);
    };

    void loadTrends();
    return () => { active = false; };
  }, [range]);

  const registrations = data.reduce((sum, d) => sum + d.registrations, 0);
  const adoptions = data.reduce((sum, d) => sum + d.adoptions, 0);

  return (
    <section className="surface-card fade-up rounded-2xl border border-border bg-card p-4 sm:p-5">
      <header className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
        <div>
          <p className="flex items-center gap-1.5 text-[10.5px] font-bold uppercase tracking-[0.16em] text-primary">
            <TrendingUp className="size-3.5" />
            Activity
          </p>
          <h2 className="mt-1 text-[17px] font-extrabold tracking-[-0.02em] text-foreground">
            Registration &amp; adoption trends
          </h2>
          <p className="mt-0.5 text-[12px] text-muted-foreground">
            Last {range} • registrations submitted and adoptions completed
          </p>
        </div>

        <div className="flex w-full items-center gap-1 rounded-xl bg-secondary p-1 sm:w-auto">
          {ranges.map((key) => (
            <button
              key={key}
              type="button"
              onClick={() => onRangeChange(key)}
              className={cn(
                "flex-1 rounded-lg px-2.5 py-1.5 text-[11.5px] font-semibold transition-all sm:flex-none",
                range === key
                  ? "bg-card text-foreground shadow-sm"
                  : "text-muted-foreground hover:text-foreground",
              )}
            >
              {key.toUpperCase()}
            </button>
          ))}
        </div>
      </header>

      <div className="mt-4 flex flex-wrap items-center gap-x-5 gap-y-2">
        <div className="flex items-center gap-2">
          <span className="size-2 rounded-full bg-chart-1" />
          <span className="text-[11.5px] text-muted-foreground">Registrations</span>
          <span className="num text-[13px] font-bold text-foreground">{registrations}</span>
        </div>
        <div className="flex items-center gap-2">
          <span className="size-2 rounded-full bg-chart-2" />
          <span className="text-[11.5px] text-muted-foreground">Completed adoptions</span>
          <span className="num text-[13px] font-bold text-foreground">{adoptions}</span>
        </div>
      </div>

      {loadError ? (
        <p className="mt-3 rounded-lg border border-warning/25 bg-warning/10 p-2.5 text-[10px] text-foreground" role="status">
          Unable to load trend data: {loadError}
        </p>
      ) : null}

      <div className="mt-2 h-[236px] w-full sm:h-[262px]" aria-busy={loading}>
        <ResponsiveContainer width="100%" height="100%">
          <AreaChart data={data} margin={{ top: 12, right: 4, bottom: 0, left: -18 }}>
            <defs>
              <linearGradient id="fill-registrations" x1="0" y1="0" x2="0" y2="1">
                <stop offset="0%" stopColor="hsl(var(--chart-1))" stopOpacity={0.26} />
                <stop offset="100%" stopColor="hsl(var(--chart-1))" stopOpacity={0.01} />
              </linearGradient>
              <linearGradient id="fill-adoptions" x1="0" y1="0" x2="0" y2="1">
                <stop offset="0%" stopColor="hsl(var(--chart-2))" stopOpacity={0.3} />
                <stop offset="100%" stopColor="hsl(var(--chart-2))" stopOpacity={0.02} />
              </linearGradient>
            </defs>
            <CartesianGrid
              vertical={false}
              stroke="hsl(var(--border))"
              strokeDasharray="4 6"
            />
            <XAxis
              dataKey="label"
              axisLine={false}
              tickLine={false}
              tick={{ fill: "hsl(var(--muted-foreground))", fontSize: 10.5 }}
              dy={8}
              interval="preserveStartEnd"
              minTickGap={18}
            />
            <YAxis
              axisLine={false}
              tickLine={false}
              width={44}
              tick={{ fill: "hsl(var(--muted-foreground))", fontSize: 10.5 }}
              allowDecimals={false}
            />
            <Tooltip content={<ChartTooltip />} cursor={{ stroke: "hsl(var(--border))" }} />
            <Area
              type="monotone"
              dataKey="registrations"
              name="Registrations"
              stroke="hsl(var(--chart-1))"
              strokeWidth={2.4}
              fill="url(#fill-registrations)"
              activeDot={{ r: 4, strokeWidth: 2, stroke: "hsl(var(--card))" }}
            />
            <Area
              type="monotone"
              dataKey="adoptions"
              name="Completed adoptions"
              stroke="hsl(var(--chart-2))"
              strokeWidth={2.4}
              fill="url(#fill-adoptions)"
              activeDot={{ r: 4, strokeWidth: 2, stroke: "hsl(var(--card))" }}
            />
          </AreaChart>
        </ResponsiveContainer>
      </div>
      {loading ? <p className="text-[10px] text-muted-foreground" role="status">Loading live activity…</p> : null}
    </section>
  );
}
