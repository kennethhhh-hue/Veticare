import { useCallback, useEffect, useMemo, useState } from "react";
import {
  CalendarRange,
  Download,
  FileBarChart,
  FileCheck2,
  FileSpreadsheet,
  RefreshCw,
  TriangleAlert,
  Search,
  Sparkles,
} from "lucide-react";
import { toast } from "sonner";
import { AppShell } from "@/components/veticare/app-shell";
import { PageHeader } from "@/components/admin/page-header";
import { MetricStrip } from "@/components/admin/metric-strip";
import { FilterSelect } from "@/components/admin/filter-select";
import { StatusPill } from "@/components/admin/status-pill";
import { Pagination } from "@/components/admin/pagination";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Tooltip,
  TooltipContent,
  TooltipTrigger,
} from "@/components/ui/tooltip";
import { cn } from "@/lib/utils";
import { downloadCsv } from "@/lib/sample-download";
import {
  reportCategories,
  reportFormats,
  reportPeriods,
  type ReportFormat,
} from "@/data/admin-config";
import { supabase } from "@/integrations/supabase/client";
import type { Json } from "@/integrations/supabase/types";
import { addCalendarDays, getPhilippineDateKey } from "@/lib/philippine-date";

const PAGE_SIZE = 5;

const formatTone: Record<ReportFormat, string> = {
  PDF: "bg-destructive/10 text-destructive",
  CSV: "bg-info/12 text-info",
  XLSX: "bg-success/10 text-success",
};

interface GeneratedReport {
  id: string;
  report_id: string;
  name: string;
  category: string;
  period: string;
  format: ReportFormat;
  generated_at: string;
  row_count: number;
  status: "ready" | "failed";
  author_name: string;
  report_data: Json;
}

type CsvValue = string | number | boolean | null;
type CsvRow = Record<string, CsvValue>;

const toCsvRows = (value: Json): CsvRow[] => {
  if (!Array.isArray(value)) return [];
  return value.map((row) => {
    if (!row || typeof row !== "object" || Array.isArray(row)) return { value: String(row ?? "") };
    return Object.fromEntries(Object.entries(row).map(([key, item]) => [
      key,
      item === null || typeof item === "string" || typeof item === "number" || typeof item === "boolean"
        ? item
        : JSON.stringify(item),
    ])) as CsvRow;
  });
};

const Reports = () => {
  const [reports, setReports] = useState<GeneratedReport[]>([]);
  const [loading, setLoading] = useState(true);
  const [loadError, setLoadError] = useState<string | null>(null);
  const [generating, setGenerating] = useState(false);
  const [query, setQuery] = useState("");
  const [category, setCategory] = useState("all");
  const [status, setStatus] = useState("all");
  const [page, setPage] = useState(1);

  const [genCategory, setGenCategory] = useState<string>(reportCategories[0]);
  const [genPeriod, setGenPeriod] = useState<string>(reportPeriods[1]);
  const [genFormat, setGenFormat] = useState<ReportFormat>("CSV");

  const loadReports = useCallback(async () => {
    setLoading(true);
    setLoadError(null);
    const { data, error } = await supabase.from("generated_reports").select("*").order("generated_at", { ascending: false });
    if (error) {
      setLoadError(error.message);
      setReports([]);
      setLoading(false);
      return;
    }
    setReports((data ?? []) as GeneratedReport[]);
    setLoading(false);
  }, []);

  useEffect(() => {
    void loadReports();
    window.addEventListener("focus", loadReports);
    return () => window.removeEventListener("focus", loadReports);
  }, [loadReports]);

  const filtered = useMemo(() => {
    const search = query.trim().toLowerCase();
    return reports.filter((report) => {
      const matchesQuery =
        search.length === 0 ||
        `${report.name} ${report.report_id} ${report.author_name} ${report.category}`
          .toLowerCase()
          .includes(search);
      const matchesCategory = category === "all" || report.category === category;
      const matchesStatus = status === "all" || report.status === status;
      return matchesQuery && matchesCategory && matchesStatus;
    });
  }, [reports, query, category, status]);

  const pageCount = Math.max(1, Math.ceil(filtered.length / PAGE_SIZE));
  const safePage = Math.min(page, pageCount);
  const start = (safePage - 1) * PAGE_SIZE;
  const visible = filtered.slice(start, start + PAGE_SIZE);

  const refresh = () => {
    setQuery("");
    setCategory("all");
    setStatus("all");
    setPage(1);
    void loadReports();
    toast.success("Report library refreshed.");
  };

  const getPeriodBounds = () => {
    const today = getPhilippineDateKey();
    if (genPeriod === "Last 7 days") return { start: addCalendarDays(today, -6), end: today };
    if (genPeriod === "Last 30 days") return { start: addCalendarDays(today, -29), end: today };
    if (genPeriod === "This quarter") {
      const [year, month] = today.split("-").map(Number);
      const quarterStartMonth = Math.floor((month - 1) / 3) * 3 + 1;
      return { start: `${year}-${String(quarterStartMonth).padStart(2, "0")}-01`, end: today };
    }
    return { start: `${today.slice(0, 4)}-01-01`, end: today };
  };

  const generate = async () => {
    setGenerating(true);
    const { start: startDate, end: endDate } = getPeriodBounds();
    let rows: CsvRow[] = [];
    let fetchError: string | null = null;

    if (genCategory === "Pet Registrations") {
      const result = await supabase.from("pets").select("id, owner_id, name, species, breed, age, sex, weight, color, status, pet_id, qr_code, created_at, approved_at");
      rows = result.data ?? [];
      fetchError = result.error?.message ?? null;
    } else if (genCategory === "Owners") {
      const result = await supabase.from("profiles").select("id, email, full_name, phone, address, barangay, role, approval_status, created_at").eq("role", "owner");
      rows = result.data ?? [];
      fetchError = result.error?.message ?? null;
    } else if (genCategory === "Impounded Dogs") {
      const result = await supabase.from("impounds").select("id, impound_id, pet_id, animal_type, name, breed, sex, age, color, area, kennel, impounded_at, impound_status, adoption_status, vaccinated, notes, created_at");
      rows = result.data ?? [];
      fetchError = result.error?.message ?? null;
    } else if (genCategory === "Adoptions") {
      const result = await supabase.from("adoption_applications").select("id, application_id, applicant_id, impound_record_id, pet_name, pet_species, pet_breed, application_date, decision_date, home_visit_status, status, note, created_at");
      rows = result.data ?? [];
      fetchError = result.error?.message ?? null;
    } else if (genCategory === "Pet ID") {
      const result = await supabase.from("pets").select("id, owner_id, name, species, breed, pet_id, qr_code, pet_id_status, pet_id_issued_at, pet_id_valid_through, status, created_at").not("pet_id", "is", null);
      rows = result.data ?? [];
      fetchError = result.error?.message ?? null;
    } else {
      const result = await supabase.from("admin_activity").select("id, entity_type, entity_id, event_type, actor_name, action, target, destination, created_at");
      rows = result.data ?? [];
      fetchError = result.error?.message ?? null;
    }

    if (fetchError) {
      setGenerating(false);
      toast.error("Unable to generate report", { description: fetchError });
      return;
    }

    const dateField = genCategory === "Impounded Dogs" ? "impounded_at" : genCategory === "Adoptions" ? "application_date" : genCategory === "Pet ID" ? "pet_id_issued_at" : "created_at";
    const periodRows = rows.filter((row) => {
      const rawDate = row[dateField] ?? row.created_at;
      if (typeof rawDate !== "string") return false;
      const rowDate = rawDate.includes("T") ? getPhilippineDateKey(new Date(rawDate)) : rawDate.slice(0, 10);
      return rowDate >= startDate && rowDate <= endDate;
    });
    if (!periodRows.length) {
      setGenerating(false);
      toast.info("No live records were found for that category and period.");
      return;
    }

    const { data: authData, error: authError } = await supabase.auth.getUser();
    if (authError || !authData.user) {
      setGenerating(false);
      toast.error("Please sign in again before generating reports.");
      return;
    }
    const { data: authorProfile } = await supabase.from("profiles").select("full_name, email").eq("id", authData.user.id).maybeSingle();
    const reportId = `RP-${Date.now().toString().slice(-8)}`;
    const safeName = `${genCategory}-${genPeriod}`.toLowerCase().replace(/[^a-z0-9]+/g, "-");
    const { error: saveError } = await supabase.from("generated_reports").insert({
      report_id: reportId,
      name: `${genCategory} • ${genPeriod}`,
      category: genCategory,
      period: genPeriod,
      format: genFormat,
      row_count: periodRows.length,
      status: "ready",
      author_id: authData.user.id,
      author_name: authorProfile?.full_name || authorProfile?.email || authData.user.email || "Admin",
      report_data: periodRows,
    });
    if (saveError) {
      setGenerating(false);
      toast.error("Unable to save report to the library", { description: saveError.message });
      return;
    }
    const downloaded = downloadCsv(`${safeName}.csv`, periodRows);
    setGenerating(false);
    await loadReports();
    if (downloaded) toast.success("Live report generated and saved.", { description: `${periodRows.length} rows • ${reportId}` });
  };

  const downloadCenter = () => {
    const rows = reports.map((report) => ({ id: report.report_id, name: report.name, category: report.category, period: report.period, generated: report.generated_at, rows: report.row_count, format: report.format, status: report.status, author: report.author_name }));
    if (downloadCsv("veticare-report-library.csv", rows)) toast.success("Report library exported.");
    else toast.info("No generated reports to export.");
  };

  const downloadReport = (report: GeneratedReport) => {
    const reportRows = toCsvRows(report.report_data);
    if (downloadCsv(`${report.report_id.toLowerCase()}-${report.name.toLowerCase().replace(/[^a-z0-9]+/g, "-")}.csv`, reportRows)) {
      toast.success(`${report.name} downloaded.`);
    } else {
      toast.info("This saved report has no rows to download.");
    }
  };

  const metrics = [
    {
      label: "Total reports",
      value: reports.length,
      hint: "In the library",
      icon: FileBarChart,
      tone: "primary" as const,
    },
    {
      label: "Ready",
      value: reports.filter((report) => report.status === "ready").length,
      hint: "Available to download",
      icon: FileCheck2,
      tone: "info" as const,
    },
    {
      label: "Generated this month",
      value: reports.filter((report) => getPhilippineDateKey(new Date(report.generated_at)).slice(0, 7) === getPhilippineDateKey().slice(0, 7)).length,
      hint: "Saved CSV snapshots",
      icon: FileSpreadsheet,
      tone: "warning" as const,
    },
    {
      label: "Needs attention",
      value: reports.filter((report) => report.status === "failed").length,
      hint: "Failed generation",
      icon: TriangleAlert,
      tone: "warning" as const,
    },
  ];

  return (
    <AppShell>
      <PageHeader
        eyebrow="Insights"
        title="Reports"
        description="Generate CSV reports from live registry, shelter, adoption and audit data."
        actions={
          <Button
            variant="outline"
            onClick={downloadCenter}
            className="h-9 rounded-xl border-border bg-card text-[12px] font-bold"
          >
            <Download className="size-4" />
            Download center
          </Button>
        }
      />

      <MetricStrip metrics={metrics} />

      <section className="surface-card fade-up mt-4 rounded-2xl border border-border bg-card p-3.5 sm:mt-5 sm:p-5">
        <div className="flex flex-wrap items-start justify-between gap-3">
          <div>
            <p className="flex items-center gap-1.5 text-[10px] font-bold uppercase tracking-[0.16em] text-primary">
              <Sparkles className="size-3.5" />
              Report studio
            </p>
            <h2 className="mt-1 text-[16px] font-extrabold tracking-[-0.02em] text-foreground">
              Generate a new report
            </h2>
            <p className="mt-0.5 text-[11.5px] text-muted-foreground">
              Choose a data category and Philippine-time period to generate a downloadable CSV snapshot.
            </p>
          </div>
          <span className="rounded-full border border-border bg-secondary/50 px-2 py-1 text-[9.5px] font-semibold uppercase tracking-wide text-muted-foreground">
            CSV export
          </span>
        </div>

        <div className="mt-3.5 grid gap-2.5 sm:grid-cols-2 xl:grid-cols-[1.4fr_1fr_0.9fr_auto] xl:items-end">
          <div className="space-y-1">
            <p className="text-[9.5px] font-bold uppercase tracking-[0.12em] text-muted-foreground">
              Category
            </p>
            <Select value={genCategory} onValueChange={setGenCategory}>
              <SelectTrigger className="h-10 rounded-xl border-border bg-background text-[11.5px] font-semibold">
                <SelectValue />
              </SelectTrigger>
              <SelectContent className="rounded-xl border-border">
                {reportCategories.map((item) => (
                  <SelectItem key={item} value={item} className="text-[12px]">
                    {item}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          <div className="space-y-1">
            <p className="text-[9.5px] font-bold uppercase tracking-[0.12em] text-muted-foreground">
              Period
            </p>
            <Select value={genPeriod} onValueChange={setGenPeriod}>
              <SelectTrigger className="h-10 rounded-xl border-border bg-background text-[11.5px] font-semibold">
                <SelectValue />
              </SelectTrigger>
              <SelectContent className="rounded-xl border-border">
                {reportPeriods.map((item) => (
                  <SelectItem key={item} value={item} className="text-[12px]">
                    {item}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          <div className="space-y-1">
            <p className="text-[9.5px] font-bold uppercase tracking-[0.12em] text-muted-foreground">
              Format
            </p>
            <div className="flex h-10 items-center gap-1 rounded-xl border border-border bg-secondary/50 p-1">
              {reportFormats.map((format) => (
                <button
                  key={format}
                  type="button"
                  onClick={() => setGenFormat(format)}
                  className={cn(
                    "flex-1 rounded-lg py-1.5 text-[10.5px] font-bold transition-colors",
                    genFormat === format
                      ? "bg-card text-foreground shadow-sm"
                      : "text-muted-foreground hover:text-foreground",
                  )}
                >
                  {format}
                </button>
              ))}
            </div>
          </div>

          <Button
            onClick={generate}
            className="h-10 rounded-xl px-4 text-[12px] font-bold shadow-glow"
          >
            <FileBarChart className="size-4" />
            Generate
          </Button>
        </div>

        <p className="mt-2.5 flex items-center gap-1.5 text-[10px] text-muted-foreground/80">
          <CalendarRange className="size-3" />
            Generated reports appear in this library.
        </p>
      </section>

      <section className="surface-card fade-up mt-4 overflow-hidden rounded-2xl border border-border bg-card sm:mt-5">
        <div className="flex flex-col gap-2.5 p-3.5 sm:p-4 lg:flex-row lg:flex-wrap lg:items-center">
          <div className="relative min-w-[240px] flex-1">
            <Search className="pointer-events-none absolute left-3 top-1/2 size-4 -translate-y-1/2 text-muted-foreground/70" />
            <Input
              value={query}
              onChange={(event) => {
                setQuery(event.target.value);
                setPage(1);
              }}
              placeholder="Search reports or authors…"
              aria-label="Search reports"
              className="h-9 rounded-xl border-border bg-background pl-9 text-[12px] focus-visible:ring-2 focus-visible:ring-primary/20 focus-visible:ring-offset-0"
            />
          </div>

          <div className="grid grid-cols-2 items-center gap-2 sm:flex sm:flex-wrap sm:gap-2.5">
            <FilterSelect
              label="Category"
              value={category}
              onChange={(value) => {
                setCategory(value);
                setPage(1);
              }}
              options={[
                { value: "all", label: "All" },
                ...reportCategories.map((item) => ({ value: item, label: item })),
              ]}
            />
            <FilterSelect
              label="Status"
              value={status}
              onChange={(value) => {
                setStatus(value);
                setPage(1);
              }}
              options={[
                { value: "all", label: "All" },
                { value: "ready", label: "Ready" },
                { value: "failed", label: "Failed" },
              ]}
            />
            <div className="col-span-2 flex items-center justify-end gap-1.5 sm:ml-auto">
              <Button
                variant="ghost"
                onClick={refresh}
                className="h-9 rounded-xl px-2.5 text-[11.5px] font-semibold text-muted-foreground hover:text-foreground"
              >
                <RefreshCw className="size-3.5" />
                Refresh
              </Button>
            </div>
          </div>
        </div>

        <div className="hidden border-y border-border bg-secondary/40 px-5 py-2 xl:grid xl:grid-cols-[minmax(0,1.6fr)_minmax(0,1fr)_96px_96px_64px_88px_64px] xl:gap-4">
          {["Report", "Category", "Period", "Generated", "Rows", "Status", "File"].map((label) => (
            <p
              key={label}
              className="text-[9px] font-bold uppercase tracking-[0.12em] text-muted-foreground"
            >
              {label}
            </p>
          ))}
        </div>

        {loading ? <p className="px-5 py-10 text-center text-[11px] text-muted-foreground">Loading generated reports…</p> : loadError ? <p className="px-5 py-10 text-center text-[11px] text-destructive">Unable to load reports: {loadError}</p> : visible.length === 0 ? (
          <div className="flex flex-col items-center gap-2 px-5 py-14 text-center">
            <span className="grid size-11 place-items-center rounded-2xl bg-primary-soft text-primary">
              <FileSpreadsheet className="size-5" />
            </span>
            <p className="text-[13px] font-bold text-foreground">No generated reports</p>
            <p className="max-w-[260px] text-[11.5px] text-muted-foreground">
              Generate a report from live records and it will be saved here for download.
            </p>
          </div>
        ) : (
          <ul className="divide-y divide-border border-b border-border">
            {visible.map((report) => (
              <li
                key={report.id}
                className="grid grid-cols-[minmax(0,1fr)_auto] items-center gap-x-3 gap-y-2.5 px-3.5 py-3.5 transition-colors hover:bg-secondary/30 sm:px-4 xl:grid-cols-[minmax(0,1.6fr)_minmax(0,1fr)_96px_96px_64px_88px_64px] xl:gap-4 xl:px-5"
              >
                <div className="order-1 flex min-w-0 items-center gap-2.5 xl:order-none">
                  <span className="grid size-9 shrink-0 place-items-center rounded-xl bg-primary-soft text-primary">
                    <FileBarChart className="size-4" />
                  </span>
                  <div className="min-w-0">
                    <p className="truncate text-[12.5px] font-bold text-foreground">
                      {report.name}
                    </p>
                    <p className="num mt-0.5 flex items-center gap-1.5 text-[9.5px] text-muted-foreground">
                      {report.report_id}
                      <span className="text-border">|</span>
                      {report.author_name}
                    </p>
                    <span
                      className={cn(
                        "mt-1 inline-block rounded px-1 py-0.5 text-[8.5px] font-bold xl:hidden",
                        formatTone[report.format],
                      )}
                    >
                      {report.format}
                    </span>
                  </div>
                </div>

                <div className="order-3 col-span-2 min-w-0 xl:order-none xl:col-span-1">
                  <p className="text-[9px] font-bold uppercase tracking-[0.1em] text-muted-foreground xl:hidden">
                    Category
                  </p>
                  <p className="truncate text-[10.5px] text-foreground/85">{report.category}</p>
                </div>

                <div className="order-3 xl:order-none">
                  <p className="text-[9px] font-bold uppercase tracking-[0.1em] text-muted-foreground xl:hidden">
                    Period
                  </p>
                  <p className="text-[10.5px] text-foreground/85">{report.period}</p>
                </div>

                <div className="order-3 xl:order-none">
                  <p className="text-[9px] font-bold uppercase tracking-[0.1em] text-muted-foreground xl:hidden">
                    Generated
                  </p>
                  <p className="text-[10.5px] text-foreground/85">{new Date(report.generated_at).toLocaleDateString("en-PH", { month: "short", day: "numeric", year: "numeric", timeZone: "Asia/Manila" })}</p>
                </div>

                <div className="order-3 hidden xl:order-none xl:block">
                  <p className="num text-[10.5px] text-foreground/85">
                    {report.row_count.toLocaleString()}
                  </p>
                </div>

                <div className="order-2 xl:order-none">
                  <StatusPill status={report.status} />
                </div>

                <div className="order-4 col-span-2 flex items-center justify-end gap-1 xl:order-none xl:col-span-1 xl:justify-start">
                  <span
                    className={cn(
                      "hidden rounded px-1.5 py-0.5 text-[9px] font-bold xl:inline-block",
                      formatTone[report.format],
                    )}
                  >
                    {report.format}
                  </span>
                  <Tooltip>
                    <TooltipTrigger asChild>
                      <Button
                        size="icon"
                        variant="outline"
                        disabled={report.status !== "ready"}
                        onClick={() => downloadReport(report)}
                        className="size-7 rounded-lg border-border text-muted-foreground hover:border-primary/30 hover:text-primary disabled:opacity-40"
                        aria-label={`Download ${report.name}`}
                      >
                        <Download className="size-3.5" />
                      </Button>
                    </TooltipTrigger>
                    <TooltipContent>
                      {report.status === "ready" ? "Download report" : "Not available yet"}
                    </TooltipContent>
                  </Tooltip>
                </div>
              </li>
            ))}
          </ul>
        )}

        <Pagination
          page={safePage}
          pageCount={pageCount}
          from={filtered.length === 0 ? 0 : start + 1}
          to={Math.min(start + PAGE_SIZE, filtered.length)}
          total={filtered.length}
          onPageChange={setPage}
        />
      </section>

      <p className="mt-4 flex flex-wrap items-center gap-x-2 gap-y-1 text-[10.5px] text-muted-foreground/80">
        <span className="rounded-full border border-border bg-card px-2 py-0.5 font-semibold">
          Report library
        </span>
        CSV snapshots are saved here.
      </p>
    </AppShell>
  );
};

export default Reports;
