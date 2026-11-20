import { useCallback, useEffect, useMemo, useState } from "react";
import { BarChart3, Bell, Dog, Download, FileText, Heart, IdCard, RefreshCw, Search, Settings as SettingsIcon, ShieldCheck, UserRound, Users } from "lucide-react";
import { toast } from "sonner";
import { AppShell } from "@/components/veticare/app-shell";
import { PageHeader } from "@/components/admin/page-header";
import { MetricStrip } from "@/components/admin/metric-strip";
import { FilterSelect } from "@/components/admin/filter-select";
import { StatusPill } from "@/components/admin/status-pill";
import { Pagination } from "@/components/admin/pagination";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { cn } from "@/lib/utils";
import { downloadCsv } from "@/lib/sample-download";
import { logModules, type ActivityLogEntry, type LogModule, type LogStatus } from "@/data/admin-config";
import { supabase } from "@/integrations/supabase/client";
import { PHILIPPINE_TIME_ZONE } from "@/lib/philippine-date";

const PAGE_SIZE = 6;

const moduleIcons: Record<LogModule, typeof ShieldCheck> = {
  Authentication: ShieldCheck,
  "Pet Registrations": FileText,
  Owners: Users,
  "Impounded Dogs": Dog,
  Adoptions: Heart,
  "Pet ID": IdCard,
  Reports: BarChart3,
  Settings: SettingsIcon,
  Notifications: Bell,
};

const statusChip: Record<LogStatus, string> = {
  success: "bg-success/10 text-success",
  warning: "bg-warning/12 text-warning",
  failed: "bg-destructive/10 text-destructive",
};

const moduleForEntity: Record<string, LogModule> = {
  pets: "Pet Registrations",
  impounds: "Impounded Dogs",
  adoption_applications: "Adoptions",
  generated_reports: "Reports",
};

const ActivityLogs = () => {
  const [entries, setEntries] = useState<ActivityLogEntry[]>([]);
  const [loading, setLoading] = useState(true);
  const [loadError, setLoadError] = useState<string | null>(null);
  const [query, setQuery] = useState("");
  const [module, setModule] = useState("all");
  const [status, setStatus] = useState("all");
  const [page, setPage] = useState(1);

  const loadLogs = useCallback(async () => {
    setLoading(true);
    setLoadError(null);
    const { data, error } = await supabase
      .from("admin_activity")
      .select("id, actor_name, action, target, entity_type, event_type, created_at")
      .order("created_at", { ascending: false });

    if (error) {
      setLoadError(error.message);
      setEntries([]);
      setLoading(false);
      return;
    }

    setEntries((data ?? []).map((entry) => ({
      id: `LOG-${entry.id.slice(0, 8).toUpperCase()}`,
      timestamp: new Date(entry.created_at).toLocaleString("en-PH", {
        dateStyle: "medium",
        timeStyle: "short",
        timeZone: PHILIPPINE_TIME_ZONE,
      }),
      actor: entry.actor_name,
      event: entry.action,
      module: moduleForEntity[entry.entity_type] ?? "Settings",
      target: entry.target,
      ip: "Not recorded",
      status: entry.event_type.endsWith("rejected") ? "warning" : "success",
    })));
    setLoading(false);
  }, []);

  useEffect(() => {
    void loadLogs();
    window.addEventListener("focus", loadLogs);
    return () => window.removeEventListener("focus", loadLogs);
  }, [loadLogs]);

  const filtered = useMemo(() => {
    const search = query.trim().toLowerCase();
    return entries.filter((entry) => {
      const matchesQuery = search.length === 0 || `${entry.actor} ${entry.event} ${entry.target} ${entry.ip} ${entry.id}`.toLowerCase().includes(search);
      const matchesModule = module === "all" || entry.module === module;
      const matchesStatus = status === "all" || entry.status === status;
      return matchesQuery && matchesModule && matchesStatus;
    });
  }, [entries, query, module, status]);

  const pageCount = Math.max(1, Math.ceil(filtered.length / PAGE_SIZE));
  const safePage = Math.min(page, pageCount);
  const start = (safePage - 1) * PAGE_SIZE;
  const visible = filtered.slice(start, start + PAGE_SIZE);
  const recordChanges = entries.filter((entry) => ["Pet Registrations", "Owners", "Impounded Dogs", "Adoptions", "Pet ID"].includes(entry.module)).length;

  const refresh = () => {
    setQuery("");
    setModule("all");
    setStatus("all");
    setPage(1);
    void loadLogs();
  };

  const exportLogs = () => {
    const downloaded = downloadCsv("veticare-activity-logs.csv", filtered.map((entry) => ({
      id: entry.id,
      timestamp: entry.timestamp,
      actor: entry.actor,
      event: entry.event,
      target: entry.target,
      module: entry.module,
      ip: entry.ip,
      status: entry.status,
    })));
    if (downloaded) toast.success(`${filtered.length} audit entries exported.`);
    else toast.info("No audit entries match the current filters.");
  };

  const metrics = [
    { label: "Events logged", value: entries.length, hint: "All recorded events", icon: FileText, tone: "primary" as const },
    { label: "Pet registrations", value: entries.filter((entry) => entry.module === "Pet Registrations").length, hint: "Submitted and reviewed", icon: ShieldCheck, tone: "info" as const },
    { label: "Record changes", value: recordChanges, hint: "Registry updates", icon: UserRound, tone: "warning" as const },
    { label: "Adoption events", value: entries.filter((entry) => entry.module === "Adoptions").length, hint: "Applications and decisions", icon: Heart, tone: "neutral" as const },
  ];

  return (
    <AppShell>
      <PageHeader
        eyebrow="Administration"
        title="Activity Logs"
        description="Audit history of pet submissions, registration decisions, impounds, adoptions, and generated reports."
        actions={<Button variant="outline" onClick={exportLogs} className="h-9 rounded-xl border-border bg-card text-[12px] font-bold"><Download className="size-4" />Export log</Button>}
      />

      <MetricStrip metrics={metrics} />

      <section className="surface-card fade-up mt-4 overflow-hidden rounded-2xl border border-border bg-card sm:mt-5">
        <div className="flex flex-col gap-2.5 p-3.5 sm:p-4 lg:flex-row lg:flex-wrap lg:items-center">
          <div className="relative min-w-[240px] flex-1">
            <Search className="pointer-events-none absolute left-3 top-1/2 size-4 -translate-y-1/2 text-muted-foreground/70" />
            <Input value={query} onChange={(event) => { setQuery(event.target.value); setPage(1); }} placeholder="Search actor, event, or target…" aria-label="Search activity logs" className="h-9 rounded-xl border-border bg-background pl-9 text-[12px]" />
          </div>
          <div className="grid grid-cols-2 items-center gap-2 sm:flex sm:flex-wrap sm:gap-2.5">
            <FilterSelect label="Module" value={module} onChange={(value) => { setModule(value); setPage(1); }} options={[{ value: "all", label: "All" }, ...logModules.map((item) => ({ value: item, label: item }))]} />
            <FilterSelect label="Status" value={status} onChange={(value) => { setStatus(value); setPage(1); }} options={[{ value: "all", label: "All" }, { value: "success", label: "Success" }, { value: "warning", label: "Warning" }, { value: "failed", label: "Failed" }]} />
            <div className="col-span-2 flex items-center justify-end gap-1.5 sm:ml-auto">
              <Button variant="ghost" onClick={refresh} disabled={loading} className="h-9 rounded-xl px-2.5 text-[11.5px] font-semibold text-muted-foreground hover:text-foreground"><RefreshCw className="size-3.5" />Refresh</Button>
            </div>
          </div>
        </div>

        <div className="hidden border-y border-border bg-secondary/40 px-5 py-2 xl:grid xl:grid-cols-[118px_minmax(0,1fr)_minmax(0,1.5fr)_128px_104px_84px] xl:gap-4">
          {["Timestamp", "Actor", "Event", "Module", "IP address", "Status"].map((label) => <p key={label} className="text-[9px] font-bold uppercase tracking-[0.12em] text-muted-foreground">{label}</p>)}
        </div>

        {loading ? <p className="px-5 py-10 text-center text-[11px] text-muted-foreground">Loading audit events…</p> : loadError ? <p className="px-5 py-10 text-center text-[11px] text-destructive">Unable to load activity logs: {loadError}</p> : visible.length === 0 ? (
          <div className="flex flex-col items-center gap-2 px-5 py-14 text-center">
            <span className="grid size-11 place-items-center rounded-2xl bg-primary-soft text-primary"><FileText className="size-5" /></span>
            <p className="text-[13px] font-bold text-foreground">No events recorded</p>
            <p className="max-w-[260px] text-[11.5px] text-muted-foreground">Live activity will appear here as records are submitted or changed.</p>
          </div>
        ) : (
          <ul className="divide-y divide-border border-b border-border">
            {visible.map((entry) => {
              const Icon = moduleIcons[entry.module];
              return <li key={entry.id} className="grid grid-cols-[minmax(0,1fr)_auto] items-center gap-x-3 gap-y-2.5 px-3.5 py-3.5 transition-colors hover:bg-secondary/30 sm:px-4 xl:grid-cols-[118px_minmax(0,1fr)_minmax(0,1.5fr)_128px_104px_84px] xl:gap-4 xl:px-5">
                <div className="order-3 col-span-2 xl:order-none xl:col-span-1"><p className="text-[9px] font-bold uppercase tracking-[0.1em] text-muted-foreground xl:hidden">Timestamp</p><p className="num text-[10px] font-medium text-muted-foreground">{entry.timestamp}</p></div>
                <div className="order-1 flex min-w-0 items-center gap-2.5 xl:order-none"><span className={cn("grid size-8 shrink-0 place-items-center rounded-lg", statusChip[entry.status])}><Icon className="size-3.5" /></span><div className="min-w-0"><p className="truncate text-[11.5px] font-bold text-foreground">{entry.actor}</p><p className="num truncate text-[9px] text-muted-foreground/80 xl:hidden">{entry.ip}</p></div></div>
                <div className="order-3 col-span-2 min-w-0 xl:order-none xl:col-span-1"><p className="text-[11px] font-medium leading-snug text-foreground/90">{entry.event}</p><p className="mt-0.5 truncate text-[9.5px] text-muted-foreground">{entry.target} • {entry.id}</p></div>
                <div className="order-3 xl:order-none"><p className="text-[9px] font-bold uppercase tracking-[0.1em] text-muted-foreground xl:hidden">Module</p><span className="inline-block rounded-md bg-secondary px-1.5 py-1 text-[9.5px] font-semibold text-secondary-foreground">{entry.module}</span></div>
                <div className="order-3 hidden xl:order-none xl:block"><p className="num text-[10px] text-muted-foreground">{entry.ip}</p></div>
                <div className="order-2 xl:order-none"><StatusPill status={entry.status} /></div>
              </li>;
            })}
          </ul>
        )}

        <Pagination page={safePage} pageCount={pageCount} from={filtered.length === 0 ? 0 : start + 1} to={Math.min(start + PAGE_SIZE, filtered.length)} total={filtered.length} onPageChange={setPage} />
      </section>

      <p className="mt-4 flex flex-wrap items-center gap-x-2 gap-y-1 text-[10.5px] text-muted-foreground/80">
        <span className="rounded-full border border-border bg-card px-2 py-0.5 font-semibold">Supabase audit trail</span>
        IP addresses are not collected by the current audit schema.
      </p>
    </AppShell>
  );
};

export default ActivityLogs;
