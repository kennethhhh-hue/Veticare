import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { CalendarDays } from "lucide-react";
import { toast } from "sonner";
import { AppShell } from "@/components/veticare/app-shell";
import { StatCard } from "@/components/dashboard/stat-card";
import { ActivityChart } from "@/components/dashboard/activity-chart";
import { VerificationQueue } from "@/components/dashboard/verification-queue";
import { SummaryCards } from "@/components/dashboard/summary-cards";
import { admin, kpis, type Kpi, type RangeKey } from "@/data/veticare";
import { PHILIPPINE_TIME_ZONE } from "@/lib/philippine-date";
import { supabase } from "@/integrations/supabase/client";

interface DashboardSnapshot {
  metrics: Record<string, { value: number; caption: string; delta: number }>;
  series: Record<string, number[]>;
}

const Dashboard = () => {
  const [range, setRange] = useState<RangeKey>("30d");
  const navigate = useNavigate();
  const [now, setNow] = useState(() => new Date());
  const [liveKpis, setLiveKpis] = useState<Kpi[]>(() => kpis.map((kpi) => ({
    ...kpi,
    value: 0,
    caption: "Loading live data…",
    delta: 0,
    series: Array.from({ length: 12 }, () => 0),
  })));
  const [dashboardLoading, setDashboardLoading] = useState(true);

  useEffect(() => {
    const timer = window.setInterval(() => setNow(new Date()), 60_000);
    return () => window.clearInterval(timer);
  }, []);

  useEffect(() => {
    let active = true;
    const loadDashboardData = async () => {
      setDashboardLoading(true);
      const { data, error } = await supabase.rpc("get_admin_dashboard_data");
      if (!active) return;
      if (error) {
        setLiveKpis(kpis.map((kpi) => ({ ...kpi, value: 0, caption: "Data unavailable", delta: 0, series: Array.from({ length: 12 }, () => 0) })));
        toast.error("Unable to load dashboard data", { description: error.message });
        setDashboardLoading(false);
        return;
      }

      const snapshot = data as unknown as DashboardSnapshot;
      setLiveKpis(kpis.map((kpi) => ({
        ...kpi,
        value: snapshot.metrics[kpi.id]?.value ?? 0,
        caption: snapshot.metrics[kpi.id]?.caption ?? "No data",
        delta: snapshot.metrics[kpi.id]?.delta ?? 0,
        series: snapshot.series[kpi.id] ?? Array.from({ length: 12 }, () => 0),
      })));
      setDashboardLoading(false);
    };

    void loadDashboardData();
    const refresh = () => void loadDashboardData();
    window.addEventListener("focus", refresh);
    return () => {
      active = false;
      window.removeEventListener("focus", refresh);
    };
  }, []);

  const philippineDate = now.toLocaleDateString("en-PH", {
    weekday: "long",
    year: "numeric",
    month: "long",
    day: "numeric",
    timeZone: PHILIPPINE_TIME_ZONE,
  });
  const philippineTime = now.toLocaleTimeString("en-PH", {
    hour: "numeric",
    minute: "2-digit",
    timeZone: PHILIPPINE_TIME_ZONE,
  });
  const philippineHour = Number(new Intl.DateTimeFormat("en-PH", {
    hour: "numeric",
    hourCycle: "h23",
    timeZone: PHILIPPINE_TIME_ZONE,
  }).format(now));
  const greeting = philippineHour < 12 ? "Good morning" : philippineHour < 18 ? "Good afternoon" : "Good evening";

  return (
    <AppShell>
      <section className="fade-up flex flex-col gap-4 lg:flex-row lg:items-end lg:justify-between">
        <div>
          <div className="flex flex-wrap items-center gap-x-2 gap-y-1 text-[10.5px] font-bold uppercase tracking-[0.16em] text-primary">
            <CalendarDays className="size-3.5" />
            <span>{philippineDate}</span>
            <span className="text-primary/30">•</span>
            <time dateTime={now.toISOString()} className="text-foreground/75">{philippineTime} PHT</time>
            <span className="text-primary/30">•</span>
            <span className="text-muted-foreground">City Veterinary Office</span>
          </div>
          <h1 className="mt-2 text-[30px] font-extrabold leading-[1.05] tracking-[-0.035em] text-foreground sm:text-[38px]">
            {greeting}, {admin.name}.
          </h1>
        </div>
      </section>

      <section
        aria-label="Key metrics"
        className="mt-5 grid grid-cols-2 gap-3 sm:gap-4 xl:grid-cols-4"
      >
        {liveKpis.map((kpi, index) => (
          <StatCard
            key={kpi.id}
            kpi={kpi}
            index={index}
            loading={dashboardLoading}
            onClick={() => {
              const destinations: Record<string, string> = {
                pets: "/registrations",
                pending: "/registrations",
                owners: "/owners",
                adoptions: "/adoptions",
              };
              navigate(destinations[kpi.id] ?? "/registrations");
            }}
          />
        ))}
      </section>

      <div className="mt-4 grid grid-cols-1 gap-4 sm:mt-5 sm:gap-5">
        <ActivityChart range={range} onRangeChange={setRange} />
        <VerificationQueue id="verification-queue" />
      </div>

      <div className="mt-4 sm:mt-5">
        <SummaryCards
          onOpen={(section) =>
            navigate(section === "Adoptions" ? "/adoptions" : "/impounded-dogs")
          }
        />
      </div>

      <p className="mt-6 text-center text-[10.5px] text-muted-foreground/70">
        Veticare Admin • Philippine Standard Time (UTC+8)
      </p>
    </AppShell>
  );
};

export default Dashboard;
