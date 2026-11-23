import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { CalendarDays } from "lucide-react";
import { toast } from "sonner";
import { AppShell } from "@/components/veticare/app-shell";
import { StatCard } from "@/components/dashboard/stat-card";
import { ActivityChart } from "@/components/dashboard/activity-chart";
import { VerificationQueue } from "@/components/dashboard/verification-queue";
import { PersonnelReviewQueue } from "@/components/dashboard/personnel-review-queue";
import { QuickActions } from "@/components/dashboard/quick-actions";
import { ActivityFeed } from "@/components/dashboard/activity-feed";
import { SummaryCards } from "@/components/dashboard/summary-cards";
import { admin, kpis, type FeedItem, type Kpi, type RangeKey } from "@/data/veticare";
import { PHILIPPINE_TIME_ZONE } from "@/lib/philippine-date";
import { supabase } from "@/integrations/supabase/client";

interface DashboardSnapshot {
  metrics: Record<string, { value: number; caption: string; delta: number }>;
  series: Record<string, number[]>;
  recent: Array<{
    id: string;
    actor: string;
    action: string;
    target: string;
    destination: string;
    type: string;
    created_at: string;
  }>;
}

const feedType = (eventType: string): FeedItem["type"] => {
  if (eventType.startsWith("adoption_")) return "adopt";
  if (eventType.endsWith("approved")) return "approve";
  if (eventType.endsWith("rejected")) return "reject";
  if (eventType === "impound_logged") return "impound";
  return "register";
};

const scrollTo = (id: string) => {
  document.getElementById(id)?.scrollIntoView({ behavior: "smooth", block: "start" });
};

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
  const [recentActivity, setRecentActivity] = useState<FeedItem[]>([]);
  const [dashboardLoading, setDashboardLoading] = useState(true);
  const [dashboardError, setDashboardError] = useState<string | null>(null);

  useEffect(() => {
    const timer = window.setInterval(() => setNow(new Date()), 60_000);
    return () => window.clearInterval(timer);
  }, []);

  useEffect(() => {
    let active = true;
    const loadDashboardData = async () => {
      setDashboardLoading(true);
      setDashboardError(null);
      const { data, error } = await supabase.rpc("get_admin_dashboard_data");
      if (!active) return;
      if (error) {
        setDashboardError(error.message);
        setLiveKpis(kpis.map((kpi) => ({ ...kpi, value: 0, caption: "Data unavailable", delta: 0, series: Array.from({ length: 12 }, () => 0) })));
        setRecentActivity([]);
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
      setRecentActivity(snapshot.recent.map((item) => ({
        id: item.id,
        actor: item.actor,
        action: item.action,
        target: item.target,
        time: new Date(item.created_at).toLocaleString("en-PH", { dateStyle: "medium", timeStyle: "short", timeZone: PHILIPPINE_TIME_ZONE }),
        type: feedType(item.type),
        destination: item.destination,
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

  const handleQuickAction = (id: string) => {
    if (id === "review") {
      scrollTo("verification-queue");
      return;
    }
    if (id === "add-pet") {
      navigate("/registrations");
      return;
    }
    if (id === "owners") {
      navigate("/owners");
      return;
    }
    if (id === "impound") {
      navigate("/impounded-dogs");
      return;
    }
    if (id === "pet-id") {
      navigate("/pet-id");
      return;
    }
    if (id === "adoptions") {
      navigate("/adoptions");
      return;
    }
    navigate("/pet-id");
  };

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

      <div className="mt-4 grid items-start gap-4 sm:mt-5 sm:gap-5 xl:grid-cols-[minmax(0,1.9fr)_minmax(0,1fr)]">
        <div className="space-y-4 sm:space-y-5">
          <ActivityChart range={range} onRangeChange={setRange} />
          <VerificationQueue id="verification-queue" />
          <PersonnelReviewQueue />
        </div>

        <div className="space-y-4 sm:space-y-5 xl:sticky xl:top-[88px]">
          <QuickActions onAction={handleQuickAction} />
          <ActivityFeed items={recentActivity} loading={dashboardLoading} error={dashboardError} />
        </div>
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
