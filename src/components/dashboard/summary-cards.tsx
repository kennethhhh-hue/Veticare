import { useEffect, useState } from "react";
import { ArrowUpRight } from "lucide-react";
import { Progress } from "@/components/ui/progress";
import { supabase } from "@/integrations/supabase/client";
import { addCalendarDays, getPhilippineDateKey } from "@/lib/philippine-date";

interface SummaryCardsProps {
  onOpen: (section: string) => void;
}

const DEFAULT_KENNEL_CAPACITY = 24;

export function SummaryCards({ onOpen }: SummaryCardsProps) {
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [shelter, setShelter] = useState({ occupied: 0, capacity: DEFAULT_KENNEL_CAPACITY, kennel: 0, foster: 0, reserved: 0, longest: [] as { id: string; name: string; breed: string; days: number }[] });
  const [adoptionData, setAdoptionData] = useState({ thisMonth: 0, thisWeek: 0, pendingApplications: 0, avgDaysInCare: "—" as string | number, weekly: Array.from({ length: 5 }, (_, index) => ({ label: `W${index + 1}`, value: 0 })) });

  useEffect(() => {
    let active = true;
    const loadSummary = async () => {
      setLoading(true);
      setError(null);
      const [impoundsResult, adoptionsResult, settingsResult] = await Promise.all([
        supabase.from("impounds").select("id, impound_id, name, breed, status, impound_status, impounded_at"),
        supabase.from("adoption_applications").select("id, status, decision_date, impound_record_id"),
        supabase.from("shelter_settings").select("kennel_capacity").eq("id", true).maybeSingle(),
      ]);
      if (!active) return;
      const settingsMissing = settingsResult.error?.code === "PGRST205" || settingsResult.error?.code === "42P01";
      const queryError = impoundsResult.error ?? adoptionsResult.error ?? (settingsMissing ? null : settingsResult.error);
      if (queryError) {
        setError(queryError.message);
        setLoading(false);
        return;
      }

      const impounds = impoundsResult.data ?? [];
      const applications = adoptionsResult.data ?? [];
      const today = getPhilippineDateKey();
      const monthStart = `${today.slice(0, 7)}-01`;
      const [year, month, day] = today.split("-").map(Number);
      const todayDate = new Date(Date.UTC(year, month - 1, day));
      const daysSinceMonday = (todayDate.getUTCDay() + 6) % 7;
      const weekStart = addCalendarDays(today, -daysSinceMonday);
      const activeImpounds = impounds.filter((impound) => impound.impound_status !== "released");
      const capacity = settingsResult.data?.kennel_capacity ?? DEFAULT_KENNEL_CAPACITY;
      const daysInCareById = new Map(impounds.map((impound) => [impound.id, impound.impounded_at]));
      const completed = applications.filter((application) => application.status === "completed" && application.decision_date);
      const totalCareDays = completed.reduce((sum, application) => {
        const impoundedAt = daysInCareById.get(application.impound_record_id);
        if (!impoundedAt || !application.decision_date) return sum;
        const start = new Date(`${impoundedAt}T00:00:00Z`).getTime();
        const end = new Date(`${application.decision_date}T00:00:00Z`).getTime();
        return sum + Math.max(0, Math.floor((end - start) / 86_400_000));
      }, 0);
      const weekly = Array.from({ length: 5 }, (_, index) => ({ label: `W${index + 1}`, value: 0 }));
      for (const application of completed) {
        if (!application.decision_date || application.decision_date < monthStart || application.decision_date > today) continue;
        const weekIndex = Math.min(4, Math.floor((Number(application.decision_date.slice(-2)) - 1) / 7));
        weekly[weekIndex].value += 1;
      }

      setShelter({
        occupied: activeImpounds.filter((impound) => impound.status === "kennel" || impound.status === "reserved").length,
        capacity,
        kennel: activeImpounds.filter((impound) => impound.status === "kennel").length,
        foster: activeImpounds.filter((impound) => impound.status === "foster").length,
        reserved: activeImpounds.filter((impound) => impound.status === "reserved").length,
        longest: activeImpounds.map((impound) => ({
          id: impound.id,
          name: impound.name,
          breed: impound.breed,
          days: Math.max(0, Math.floor((todayDate.getTime() - new Date(`${impound.impounded_at}T00:00:00Z`).getTime()) / 86_400_000)),
        })).sort((a, b) => b.days - a.days).slice(0, 3),
      });
      setAdoptionData({
        thisMonth: completed.filter((application) => application.decision_date! >= monthStart && application.decision_date! <= today).length,
        thisWeek: completed.filter((application) => application.decision_date! >= weekStart && application.decision_date! <= today).length,
        pendingApplications: applications.filter((application) => application.status === "pending").length,
        avgDaysInCare: completed.length ? Math.round(totalCareDays / completed.length) : "—",
        weekly,
      });
      setLoading(false);
    };

    void loadSummary();
    window.addEventListener("focus", loadSummary);
    return () => {
      active = false;
      window.removeEventListener("focus", loadSummary);
    };
  }, []);

  const occupancy = shelter.capacity ? Math.min(100, Math.round((shelter.occupied / shelter.capacity) * 100)) : 0;
  const maxWeekly = Math.max(1, ...adoptionData.weekly.map((week) => week.value));

  return (
    <div className="grid gap-5 md:grid-cols-2">
      <section className="surface-card fade-up rounded-2xl border border-border bg-card p-4 sm:p-5">
        <div className="flex items-start justify-between gap-3">
          <div>
            <p className="text-[10px] font-bold uppercase tracking-[0.16em] text-muted-foreground">
              Impounded animals
            </p>
            <h2 className="mt-0.5 text-[15px] font-extrabold tracking-[-0.02em] text-foreground">
              Shelter occupancy
            </h2>
          </div>
          <button
            type="button"
            onClick={() => onOpen("Impounded Dogs")}
            className="grid size-8 place-items-center rounded-lg border border-border text-muted-foreground transition-colors hover:border-primary/30 hover:text-primary"
            aria-label="Open impounded dogs"
          >
            <ArrowUpRight className="size-4" />
          </button>
        </div>

        <div className="mt-4 grid gap-4 sm:grid-cols-[1.1fr_1fr]">
          <div>
            <div className="flex items-end gap-1.5">
              <p className="num text-[30px] font-extrabold leading-none text-foreground">
                {loading ? "—" : shelter.occupied}
              </p>
              <p className="pb-0.5 text-[11.5px] font-medium text-muted-foreground">
                of {shelter.capacity} kennels
              </p>
            </div>
            <Progress
              value={loading ? 0 : occupancy}
              className="mt-2.5 h-1.5 bg-secondary"
              indicatorClassName="bg-warning"
            />
            <p className="mt-1.5 text-[10.5px] text-muted-foreground">
              {loading ? "Loading shelter capacity…" : `${occupancy}% occupied • ${Math.max(0, shelter.capacity - shelter.occupied)} slots free`}
            </p>
          </div>

          <div className="grid grid-cols-3 gap-1.5 sm:grid-cols-1 sm:gap-1">
            {[
              { label: "In kennel", value: shelter.kennel },
              { label: "Foster", value: shelter.foster },
              { label: "Reserved", value: shelter.reserved },
            ].map((row) => (
              <div
                key={row.label}
                className="flex items-center justify-between rounded-lg bg-secondary/60 px-2 py-1.5"
              >
                <span className="text-[10.5px] text-muted-foreground">{row.label}</span>
                <span className="num text-[11.5px] font-bold text-foreground">{loading ? "—" : row.value}</span>
              </div>
            ))}
          </div>
        </div>

        <div className="mt-3.5 border-t border-border pt-3">
          <p className="text-[10px] font-bold uppercase tracking-[0.12em] text-muted-foreground">
            Longest stays
          </p>
          <ul className="mt-1.5 space-y-1">
            {shelter.longest.map((dog) => (
              <li key={dog.id} className="flex items-center gap-2">
                <span className="text-[11.5px] font-semibold text-foreground">{dog.name}</span>
                <span className="text-[10.5px] text-muted-foreground">{dog.breed}</span>
                <span className="num ml-auto rounded-md bg-warning/10 px-1.5 py-0.5 text-[10px] font-bold text-warning">
                  {dog.days} days
                </span>
              </li>
            ))}
          </ul>
          {!loading && !shelter.longest.length ? <p className="mt-1.5 text-[10px] text-muted-foreground">No active impound stays.</p> : null}
        </div>
      </section>

      <section className="surface-card fade-up rounded-2xl border border-border bg-card p-4 sm:p-5">
        <div className="flex items-start justify-between gap-3">
          <div>
            <p className="text-[10px] font-bold uppercase tracking-[0.16em] text-muted-foreground">
              Adoptions
            </p>
            <h2 className="mt-0.5 text-[15px] font-extrabold tracking-[-0.02em] text-foreground">
              Adoption velocity
            </h2>
          </div>
          <button
            type="button"
            onClick={() => onOpen("Adoptions")}
            className="grid size-8 place-items-center rounded-lg border border-border text-muted-foreground transition-colors hover:border-primary/30 hover:text-primary"
            aria-label="Open adoptions"
          >
            <ArrowUpRight className="size-4" />
          </button>
        </div>

        <div className="mt-4 grid gap-4 sm:grid-cols-[1.1fr_1fr]">
          <div>
            <div className="flex items-end gap-1.5">
              <p className="num text-[30px] font-extrabold leading-none text-foreground">
                {loading ? "—" : adoptionData.thisMonth}
              </p>
              <p className="pb-0.5 text-[11.5px] font-medium text-muted-foreground">
                this month
              </p>
            </div>
            <div className="mt-3 flex items-end gap-2">
              {adoptionData.weekly.map((week) => (
                <div key={week.label} className="group flex flex-1 flex-col items-center gap-1">
                  <div className="flex h-[42px] w-full items-end">
                    <div
                      className="w-full rounded-t-md bg-gradient-to-t from-primary to-primary/30 transition-all group-hover:from-primary/90 group-hover:to-primary/45"
                      style={{ height: `${Math.max(8, (week.value / maxWeekly) * 42)}px` }}
                      title={`${week.label}: ${week.value} adoptions`}
                    />
                  </div>
                  <span className="text-[9px] font-semibold text-muted-foreground">
                    {week.label}
                  </span>
                </div>
              ))}
            </div>
          </div>

          <div className="space-y-1.5">
            {[
              { label: "This week", value: adoptionData.thisWeek },
              { label: "In review", value: adoptionData.pendingApplications },
              { label: "Avg. days in care", value: adoptionData.avgDaysInCare },
            ].map((row) => (
              <div
                key={row.label}
                className="flex items-center gap-2 rounded-lg bg-secondary/60 px-2 py-1.5"
              >
                <span className="text-[10.5px] text-muted-foreground">{row.label}</span>
                <span className="num ml-auto text-[11.5px] font-bold text-foreground">
                  {loading ? "—" : row.value}
                </span>
              </div>
            ))}
          </div>
        </div>
      </section>
      {error ? <p className="md:col-span-2 rounded-lg border border-warning/25 bg-warning/10 p-2.5 text-[10px] text-foreground">Unable to load shelter/adoption metrics: {error}</p> : null}
    </div>
  );
}
