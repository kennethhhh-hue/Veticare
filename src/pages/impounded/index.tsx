import { useCallback, useEffect, useMemo, useState, type FormEvent } from "react";
import { useQueryClient } from "@tanstack/react-query";
import {
  Clock,
  HeartHandshake,
  PawPrint,
  Plus,
  RefreshCw,
  Search,
  SlidersHorizontal,
  Syringe,
} from "lucide-react";
import { toast } from "sonner";
import { AppShell } from "@/components/veticare/app-shell";
import { PageHeader } from "@/components/admin/page-header";
import { MetricStrip } from "@/components/admin/metric-strip";
import { FilterSelect } from "@/components/admin/filter-select";
import { Pagination } from "@/components/admin/pagination";
import { PersonnelImpoundReports } from "@/components/admin/personnel-impound-reports";
import {
  AlertDialog,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import { Button } from "@/components/ui/button";
import { Checkbox } from "@/components/ui/checkbox";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { cn } from "@/lib/utils";
import {
  type ImpoundedDog,
  type ImpoundStatus,
} from "@/data/shelter-records";
import { supabase } from "@/integrations/supabase/client";
import { sidebarCountKeys } from "@/data/veticare";

const PAGE_SIZE = 5;

const adoptionLabel = {
  not_available: "Not available",
  available: "For Adoption",
  pending: "Pending",
  adopted: "Adopted",
};

const getAdoptionLabel = (dog: ImpoundedDog) =>
  dog.adoptionStatus === "available" && dog.impoundStatus !== "impounded"
    ? adoptionLabel.not_available
    : adoptionLabel[dog.adoptionStatus];

const initials = (name: string) =>
  name
    .split(" ")
    .map((part) => part[0])
    .slice(0, 2)
    .join("");

const mapImpoundRow = (row: {
  id: string;
  impound_id: string;
  pet_id: string;
  animal_type: string;
  name: string;
  breed: string;
  sex: string;
  age: string;
  color: string;
  area: string;
  kennel: string;
  impounded_at: string;
  impound_status: string;
  adoption_status: string;
  status: string;
  vaccinated: boolean;
  notes: string;
}): ImpoundedDog => {
  const displayDate = new Date(`${row.impounded_at}T12:00:00`).toLocaleDateString(undefined, {
    month: "short",
    day: "2-digit",
    year: "numeric",
  });
  const days = Math.max(0, Math.floor((Date.now() - new Date(`${row.impounded_at}T00:00:00`).getTime()) / 86_400_000));
  return {
    id: row.id,
    impoundId: row.impound_id,
    petId: row.pet_id,
    animalType: row.animal_type as "Dog" | "Cat",
    name: row.name,
    breed: row.breed,
    sex: row.sex as "Male" | "Female",
    age: row.age,
    color: row.color,
    area: row.area,
    kennel: row.kennel,
    impounded: displayDate,
    impoundedAt: row.impounded_at,
    dateImpounded: displayDate,
    locationFound: row.area,
    impoundStatus: row.impound_status as ImpoundedDog["impoundStatus"],
    adoptionStatus: row.adoption_status as ImpoundedDog["adoptionStatus"],
    status: row.status as ImpoundStatus,
    days,
    vaccinated: row.vaccinated,
    notes: row.notes,
  };
};

const ImpoundedDogs = () => {
  const queryClient = useQueryClient();
  const [rows, setRows] = useState<ImpoundedDog[]>([]);
  const [loading, setLoading] = useState(true);
  const [loadError, setLoadError] = useState<string | null>(null);
  const [query, setQuery] = useState("");
  const [status, setStatus] = useState("all");
  const [sex, setSex] = useState("all");
  const [longStay, setLongStay] = useState(false);
  const [unvaccinated, setUnvaccinated] = useState(false);
  const [showFilters, setShowFilters] = useState(false);
  const [page, setPage] = useState(1);
  const [selected, setSelected] = useState<ImpoundedDog | null>(null);
  const [intakeOpen, setIntakeOpen] = useState(false);
  const [savingIntake, setSavingIntake] = useState(false);
  const [adoptionUpdateId, setAdoptionUpdateId] = useState<string | null>(null);
  const [adoptedTarget, setAdoptedTarget] = useState<ImpoundedDog | null>(null);
  const [intake, setIntake] = useState({ name: "", type: "Dog" as "Dog" | "Cat", breed: "", sex: "Male" as "Male" | "Female", age: "", color: "", date: new Date().toISOString().slice(0, 10), location: "" });

  const loadImpounds = useCallback(async () => {
    setLoading(true);
    setLoadError(null);
    const { data, error } = await supabase.from("impounds").select("*").order("created_at", { ascending: false });
    if (error) {
      setLoadError(error.message);
      setLoading(false);
      return;
    }
    setRows((data ?? []).map(mapImpoundRow));
    setLoading(false);
  }, []);

  useEffect(() => {
    void loadImpounds();
    window.addEventListener("focus", loadImpounds);
    return () => window.removeEventListener("focus", loadImpounds);
  }, [loadImpounds]);

  const filtered = useMemo(() => {
    const search = query.trim().toLowerCase();
    return [...rows]
      .sort((a, b) => b.days - a.days)
      .filter((dog) => {
        const matchesQuery =
          search.length === 0 ||
          `${dog.name} ${dog.breed} ${dog.area} ${dog.id} ${dog.kennel}`
            .toLowerCase()
            .includes(search);
        const matchesStatus = status === "all" || dog.impoundStatus === status;
        const matchesSex = sex === "all" || dog.sex === sex;
        const matchesStay = !longStay || dog.days >= 30;
        const matchesVaccine = !unvaccinated || !dog.vaccinated;
        return matchesQuery && matchesStatus && matchesSex && matchesStay && matchesVaccine;
      });
  }, [rows, query, status, sex, longStay, unvaccinated]);

  const pageCount = Math.max(1, Math.ceil(filtered.length / PAGE_SIZE));
  const safePage = Math.min(page, pageCount);
  const start = (safePage - 1) * PAGE_SIZE;
  const visible = filtered.slice(start, start + PAGE_SIZE);

  const resetPage = <T,>(setter: (value: T) => void) => (value: T) => {
    setter(value);
    setPage(1);
  };

  const refresh = () => {
    setQuery("");
    setStatus("all");
    setSex("all");
    setLongStay(false);
    setUnvaccinated(false);
    setPage(1);
    void loadImpounds();
    void queryClient.invalidateQueries({ queryKey: sidebarCountKeys.impounded });
    toast.success("Impound list refreshed from Supabase.");
  };

  const refreshIntakes = () => {
    void loadImpounds();
    void queryClient.invalidateQueries({ queryKey: sidebarCountKeys.impounded });
  };

  const updateAdoptionStatus = async (dog: ImpoundedDog, next: "available" | "adopted") => {
    setAdoptionUpdateId(dog.id);
    const { data, error } = await supabase.from("impounds")
      .update({ adoption_status: next, ...(next === "adopted" ? { impound_status: "released" } : {}) })
      .eq("id", dog.id)
      .eq("impound_status", "impounded")
      .eq("adoption_status", dog.adoptionStatus)
      .select("*")
      .maybeSingle();
    setAdoptionUpdateId(null);
    if (error) {
      toast.error(error.message);
      return;
    }
    if (!data) {
      toast.error("The record changed. Review its current adoption status before trying again.");
      setAdoptedTarget(null);
      refreshIntakes();
      return;
    }
    const record = mapImpoundRow(data);
    setRows((current) => current.map((item) => item.id === record.id ? record : item));
    setSelected((current) => current?.id === record.id ? record : current);
    setAdoptedTarget(null);
    void queryClient.invalidateQueries({ queryKey: sidebarCountKeys.impounded });
    toast.success(next === "adopted" ? `${dog.name} was marked adopted.` : `${dog.name} is now listed for adoption.`);
  };

  const logImpound = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    setSavingIntake(true);
    const impoundId = `IMP-${Date.now().toString().slice(-8)}`;
    const petId = `PET-${Date.now().toString().slice(-8)}`;
    const { data, error } = await supabase.from("impounds").insert({
      impound_id: impoundId,
      pet_id: petId,
      animal_type: intake.type,
      name: intake.name.trim(),
      breed: intake.breed.trim(),
      sex: intake.sex,
      age: intake.age.trim(),
      color: intake.color.trim(),
      area: intake.location.trim(),
      impounded_at: intake.date,
      adoption_status: "not_available",
      notes: "",
    }).select("*").single();
    setSavingIntake(false);
    if (error) {
      toast.error(error.message);
      return;
    }
    const record = mapImpoundRow(data);
    void queryClient.invalidateQueries({ queryKey: sidebarCountKeys.impounded });
    setRows((current) => [record, ...current]);
    setPage(1);
    setIntake({ name: "", type: "Dog", breed: "", sex: "Male", age: "", color: "", date: new Date().toISOString().slice(0, 10), location: "" });
    setIntakeOpen(false);
    toast.success(`${record.name} added to the impound register.`);
  };

  const toggleVaccinated = async (dog: ImpoundedDog) => {
    const vaccinated = !dog.vaccinated;
    const { error } = await supabase.from("impounds").update({ vaccinated }).eq("id", dog.id);
    if (error) {
      toast.error(error.message);
      return;
    }
    setRows((current) => current.map((item) => item.id === dog.id ? { ...item, vaccinated } : item));
    setSelected((current) => current?.id === dog.id ? { ...current, vaccinated } : current);
    toast.success(`${dog.name}: vaccination marked ${vaccinated ? "up to date" : "not vaccinated"}.`);
  };

  const metrics = [
    {
      label: "Dogs in care",
      value: rows.length,
      hint: "Across all shelters",
      icon: PawPrint,
      tone: "primary" as const,
    },
    {
      label: "For Adoption",
      value: rows.filter((dog) => dog.impoundStatus === "impounded" && dog.adoptionStatus === "available").length,
      icon: HeartHandshake,
      tone: "warning" as const,
    },
    {
      label: "Longest stay",
      value: `${Math.max(0, ...rows.map((dog) => dog.days))}d`,
      hint: "Needs a home",
      icon: Clock,
      tone: "neutral" as const,
    },
  ];

  return (
    <AppShell>
      <PageHeader
        eyebrow="Shelter"
        title="Impounded Animals"
        description="Track impound IDs, animal details, found locations, and impound and adoption status."
        actions={
          <Button
            onClick={() => setIntakeOpen(true)}
            className="h-9 rounded-xl px-3.5 text-[12px] font-bold shadow-glow"
          >
            <Plus className="size-4" />
            Log Impound
          </Button>
        }
      />

      <MetricStrip metrics={metrics} />

      <PersonnelImpoundReports onReviewed={refreshIntakes} />

      <section className="surface-card fade-up mt-4 overflow-hidden rounded-2xl border border-border bg-card sm:mt-5">
        <div className="flex flex-col gap-2.5 p-3.5 sm:p-4 lg:flex-row lg:flex-wrap lg:items-center">
          <div className="relative min-w-[240px] flex-1">
            <Search className="pointer-events-none absolute left-3 top-1/2 size-4 -translate-y-1/2 text-muted-foreground/70" />
            <Input
              value={query}
              onChange={(event) => resetPage(setQuery)(event.target.value)}
              placeholder="Search impound ID, pet, breed, or location…"
              aria-label="Search impounded animals"
              className="h-9 rounded-xl border-border bg-background pl-9 text-[12px] focus-visible:ring-2 focus-visible:ring-primary/20 focus-visible:ring-offset-0"
            />
          </div>

          <div className="grid grid-cols-2 items-center gap-2 sm:flex sm:flex-wrap sm:gap-2.5">
            <FilterSelect
              label="Status"
              value={status}
              onChange={resetPage(setStatus)}
              options={[
                { value: "all", label: "All" },
                { value: "impounded", label: "Impounded" },
                { value: "claimed", label: "Claimed" },
                { value: "released", label: "Released" },
              ]}
            />
            <FilterSelect
              label="Sex"
              value={sex}
              onChange={resetPage(setSex)}
              options={[
                { value: "all", label: "All" },
                { value: "Male", label: "Male" },
                { value: "Female", label: "Female" },
              ]}
            />
            <div className="col-span-2 flex items-center gap-1.5 sm:col-auto sm:ml-auto">
              <Button
                variant="outline"
                onClick={() => setShowFilters((value) => !value)}
                className={cn(
                  "h-9 rounded-xl border-border bg-card px-2.5 text-[11.5px] font-semibold",
                  showFilters && "border-primary/30 bg-primary-soft text-primary",
                )}
              >
                <SlidersHorizontal className="size-3.5" />
                Filters
              </Button>
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

        {showFilters ? (
          <div className="flex flex-wrap items-center gap-2 border-t border-border bg-secondary/30 px-3.5 py-2.5 sm:px-4">
            <span className="mr-1 text-[9.5px] font-bold uppercase tracking-[0.12em] text-muted-foreground">
              Quick filters
            </span>
            {[
              {
                id: "long",
                label: "30+ days in care",
                checked: longStay,
                onChange: (value: boolean) => {
                  setLongStay(value);
                  setPage(1);
                },
              },
              {
                id: "vaccine",
                label: "Unvaccinated",
                checked: unvaccinated,
                onChange: (value: boolean) => {
                  setUnvaccinated(value);
                  setPage(1);
                },
              },
            ].map((item) => (
              <label
                key={item.id}
                className="flex cursor-pointer items-center gap-1.5 rounded-lg border border-border bg-card px-2.5 py-1.5 text-[10.5px] font-semibold text-foreground/85"
              >
                <Checkbox
                  checked={item.checked}
                  onCheckedChange={(value) => item.onChange(value === true)}
                  className="size-3.5 rounded-[4px] border-border data-[state=checked]:border-primary"
                />
                {item.label}
              </label>
            ))}
            <span className="ml-auto text-[10px] text-muted-foreground">
              {filtered.length} of {rows.length} dogs
            </span>
          </div>
        ) : null}

        <div className="hidden border-y border-border bg-secondary/40 px-5 py-2 xl:grid xl:grid-cols-[minmax(0,1.5fr)_88px_80px_minmax(0,0.9fr)_100px_100px_140px] xl:gap-4">
            {["Animal / IDs", "Type / sex", "Color", "Location found", "Date impounded", "Impound status", "Adoption"].map((label) => (
            <p
              key={label}
              className="text-[9px] font-bold uppercase tracking-[0.12em] text-muted-foreground"
            >
              {label}
            </p>
          ))}
        </div>

        {visible.length === 0 ? (
          <div className="flex flex-col items-center gap-2 px-5 py-14 text-center">
            <span className="grid size-11 place-items-center rounded-2xl bg-primary-soft text-primary">
              <PawPrint className="size-5" />
            </span>
            <p className="text-[13px] font-bold text-foreground">
              {loading ? "Loading impound records…" : loadError ? "Impound records unavailable" : rows.length === 0 ? "No impound records yet" : "No records match"}
            </p>
            <p className="max-w-[260px] text-[11.5px] text-muted-foreground">
              {loadError ?? (rows.length === 0 ? "Log an intake to add the first animal to the live shelter register." : "Try another search or clear the filters to see every record.")}
            </p>
            {!loading && !loadError && rows.length === 0 ? <Button
              size="sm"
              onClick={() => setIntakeOpen(true)}
              className="mt-1 h-8 rounded-lg text-[11px] font-semibold"
            >
              <Plus className="size-3.5" />
              Log Impound
            </Button> : !loading && !loadError ? <Button
              variant="outline"
              size="sm"
              onClick={refresh}
              className="mt-1 h-8 rounded-lg text-[11px] font-semibold"
            >
              Clear filters
            </Button> : null}
          </div>
        ) : (
          <ul className="divide-y divide-border border-b border-border">
            {visible.map((dog) => (
              <li
                key={dog.id}
                role="button"
                tabIndex={0}
                aria-label={`View shelter record for ${dog.name}`}
                onClick={() => setSelected(dog)}
                onKeyDown={(event) => {
                  if (event.target !== event.currentTarget) return;
                  if (event.key === "Enter" || event.key === " ") {
                    event.preventDefault();
                    setSelected(dog);
                  }
                }}
                className="grid cursor-pointer grid-cols-[minmax(0,1fr)_auto] items-center gap-x-3 gap-y-2.5 px-3.5 py-3.5 transition-colors hover:bg-secondary/40 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-inset focus-visible:ring-primary sm:px-4 xl:grid-cols-[minmax(0,1.5fr)_88px_80px_minmax(0,0.9fr)_100px_100px_140px] xl:gap-4 xl:px-5"
              >
                <div className="order-1 flex min-w-0 items-center gap-2.5 xl:order-none">
                  <span className="grid size-9 shrink-0 place-items-center rounded-xl bg-warning/12 text-[11px] font-bold text-warning">
                    {initials(dog.name)}
                  </span>
                  <div className="min-w-0">
                    <div className="flex items-center gap-1.5">
                      <p className="truncate text-[12.5px] font-bold text-foreground">{dog.name}</p>
                      {dog.days >= 30 ? (
                        <span className="shrink-0 rounded bg-warning/12 px-1 py-0.5 text-[8px] font-bold uppercase tracking-wide text-warning">
                          30+ days
                        </span>
                      ) : null}
                    </div>
                    <p className="mt-0.5 truncate text-[10px] text-muted-foreground">
                      {dog.breed} • {dog.sex} • {dog.age}
                    </p>
                    <p className="num mt-0.5 truncate text-[9px] text-muted-foreground/70">
                      {dog.impoundId} • {dog.petId}
                    </p>
                  </div>
                </div>

                <div className="order-3 xl:order-none">
                  <p className="text-[9px] font-bold uppercase tracking-[0.1em] text-muted-foreground xl:hidden">Type / sex</p>
                  <span className="text-[10.5px] text-foreground/85">{dog.animalType} • {dog.sex}</span>
                </div>

                <div className="order-3 xl:order-none">
                  <p className="text-[9px] font-bold uppercase tracking-[0.1em] text-muted-foreground xl:hidden">Color</p>
                  <p className="truncate text-[10.5px] text-foreground/85">{dog.color}</p>
                </div>

                <div className="order-3 xl:order-none">
                  <p className="text-[9px] font-bold uppercase tracking-[0.1em] text-muted-foreground xl:hidden">
                    Date impounded
                  </p>
                  <span
                    className={cn(
                      "num rounded-md px-1.5 py-0.5 text-[10px] font-bold",
                      dog.days >= 30
                        ? "bg-warning/12 text-warning"
                        : "bg-secondary text-muted-foreground",
                    )}
                  >
                    {dog.dateImpounded}
                  </span>
                </div>

                <div className="order-3 min-w-0 xl:order-none">
                  <p className="text-[9px] font-bold uppercase tracking-[0.1em] text-muted-foreground xl:hidden">
                    Location found
                  </p>
                  <p className="truncate text-[10.5px] text-foreground/85">{dog.locationFound}</p>
                </div>

                <div className="order-2 xl:order-none">
                  <span className="rounded-full bg-secondary px-2 py-1 text-[9px] font-bold capitalize text-foreground">{dog.impoundStatus}</span>
                </div>

                <div className="order-4 col-span-2 flex flex-wrap items-center justify-end gap-1 xl:order-none xl:col-span-1 xl:justify-start">
                  {dog.impoundStatus === "impounded" && dog.adoptionStatus === "not_available" ? (
                    <Button
                      size="sm"
                      onClick={(event) => {
                        event.stopPropagation();
                        void updateAdoptionStatus(dog, "available");
                      }}
                      disabled={adoptionUpdateId !== null}
                      aria-label={`List ${dog.name} for adoption`}
                      className="h-7 rounded-lg px-2.5 text-[10px] font-bold"
                    >
                      {adoptionUpdateId === dog.id ? "Saving…" : "For Adoption"}
                    </Button>
                  ) : (
                    <span className={cn(
                      "rounded-full px-2 py-1 text-[9px] font-bold",
                      dog.adoptionStatus === "available" && dog.impoundStatus === "impounded"
                        ? "bg-primary-soft text-primary"
                        : "bg-secondary text-muted-foreground",
                    )}>
                      {getAdoptionLabel(dog)}
                    </span>
                  )}
                  {dog.impoundStatus === "impounded" && (dog.adoptionStatus === "not_available" || dog.adoptionStatus === "available") ? (
                    <Button
                      size="sm"
                      variant="outline"
                      onClick={(event) => {
                        event.stopPropagation();
                        setAdoptedTarget(dog);
                      }}
                      disabled={adoptionUpdateId !== null}
                      aria-label={`Mark ${dog.name} as adopted`}
                      className="h-7 rounded-lg px-2.5 text-[10px] font-bold"
                    >
                      Adopted
                    </Button>
                  ) : null}
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
          Supabase registry
        </span>
        {rows.filter((dog) => dog.days >= 30).length} dogs have been in care for 30+ days
      </p>

      <Dialog open={Boolean(selected)} onOpenChange={(open) => (!open ? setSelected(null) : null)}>
        <DialogContent className="max-h-[88vh] w-[calc(100%-2rem)] max-w-[480px] overflow-y-auto rounded-2xl border-border p-5 sm:rounded-2xl">
          {selected ? (
            <>
              <DialogHeader className="pr-6 text-left">
                <div className="flex items-center gap-3">
                  <span className="grid size-11 shrink-0 place-items-center rounded-xl bg-warning/12 text-[12px] font-bold text-warning">
                    {initials(selected.name)}
                  </span>
                  <div className="min-w-0">
                    <DialogTitle className="truncate text-[16px] font-extrabold tracking-[-0.02em]">
                      {selected.name}
                    </DialogTitle>
                    <DialogDescription className="num truncate text-[11px]">
                      {selected.id} • {selected.breed} • {selected.sex}
                    </DialogDescription>
                  </div>
                </div>
              </DialogHeader>

              <div className="space-y-3">
                <div className="flex items-center gap-2">
                  <span className="num rounded-full bg-secondary px-2 py-1 text-[10px] font-semibold text-secondary-foreground">
                    {selected.days} days in care
                  </span>
                </div>

                <div className="divide-y divide-border rounded-2xl border border-border bg-card">
                  {[
                    { label: "Impound ID", value: selected.impoundId },
                    { label: "Pet ID", value: selected.petId },
                    { label: "Animal type", value: selected.animalType },
                    { label: "Breed / sex", value: `${selected.breed} • ${selected.sex}` },
                    { label: "Color", value: selected.color },
                    { label: "Date impounded", value: selected.dateImpounded },
                    { label: "Location found", value: selected.locationFound },
                    { label: "Impound status", value: selected.impoundStatus },
                    { label: "Adoption status", value: getAdoptionLabel(selected) },
                    {
                      label: "Vaccination",
                      value: selected.vaccinated ? "Up to date" : "Not vaccinated",
                    },
                  ].map((item) => (
                    <div key={item.label} className="flex items-center justify-between gap-3 px-3.5 py-2.5">
                      <p className="text-[9px] font-bold uppercase tracking-[0.1em] text-muted-foreground">
                        {item.label}
                      </p>
                      <p className="num text-right text-[11px] font-semibold text-foreground">
                        {item.value}
                      </p>
                    </div>
                  ))}
                </div>

                <div className="rounded-xl border border-border bg-secondary/40 p-3">
                  <p className="text-[9px] font-bold uppercase tracking-[0.1em] text-muted-foreground">
                    Field notes
                  </p>
                  <p className="mt-1 text-[10.5px] leading-relaxed text-foreground/85">
                    {selected.notes}
                  </p>
                </div>

                <div className="flex flex-col gap-2">
                  <Button
                    variant="outline"
                    onClick={() => void toggleVaccinated(selected)}
                    className="h-10 w-full rounded-xl border-border text-[12px] font-semibold"
                  >
                    <Syringe className="size-4" />
                    {selected.vaccinated ? "Mark as not vaccinated" : "Mark as vaccinated"}
                  </Button>
                  <Button
                    variant="outline"
                    onClick={() => setSelected(null)}
                    className="h-10 w-full rounded-xl border-border text-[12px] font-semibold"
                  >
                    Close record
                  </Button>
                </div>
              </div>
            </>
          ) : null}
        </DialogContent>
      </Dialog>

      <AlertDialog open={adoptedTarget !== null} onOpenChange={(open) => { if (!open && adoptionUpdateId === null) setAdoptedTarget(null); }}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Mark {adoptedTarget?.name} as adopted?</AlertDialogTitle>
            <AlertDialogDescription>This records the animal as released and removes it from the adoption listings.</AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel disabled={adoptionUpdateId !== null}>Cancel</AlertDialogCancel>
            <Button disabled={adoptionUpdateId !== null || !adoptedTarget} onClick={() => { if (adoptedTarget) void updateAdoptionStatus(adoptedTarget, "adopted"); }}>
              {adoptionUpdateId === null ? "Mark as adopted" : "Saving…"}
            </Button>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      <Dialog open={intakeOpen} onOpenChange={setIntakeOpen}>
        <DialogContent className="max-h-[90vh] overflow-y-auto rounded-xl border-border bg-card sm:max-w-[560px]">
          <DialogHeader>
            <DialogTitle>Log impounded animal</DialogTitle>
            <DialogDescription>Create an intake record in the Supabase shelter register.</DialogDescription>
          </DialogHeader>
          <form onSubmit={logImpound} className="grid grid-cols-2 gap-3">
            <div className="col-span-2 space-y-1.5"><Label htmlFor="intake-name">Animal name</Label><Input id="intake-name" required value={intake.name} onChange={(event) => setIntake((current) => ({ ...current, name: event.target.value }))} /></div>
            <div className="space-y-1.5"><Label htmlFor="intake-type">Animal type</Label><select id="intake-type" value={intake.type} onChange={(event) => setIntake((current) => ({ ...current, type: event.target.value as "Dog" | "Cat" }))} className="h-9 w-full rounded-md border border-input bg-background px-3 text-sm"><option>Dog</option><option>Cat</option></select></div>
            <div className="space-y-1.5"><Label htmlFor="intake-sex">Sex</Label><select id="intake-sex" value={intake.sex} onChange={(event) => setIntake((current) => ({ ...current, sex: event.target.value as "Male" | "Female" }))} className="h-9 w-full rounded-md border border-input bg-background px-3 text-sm"><option>Male</option><option>Female</option></select></div>
            <div className="space-y-1.5"><Label htmlFor="intake-breed">Breed</Label><Input id="intake-breed" required value={intake.breed} onChange={(event) => setIntake((current) => ({ ...current, breed: event.target.value }))} /></div>
            <div className="space-y-1.5"><Label htmlFor="intake-age">Age</Label><Input id="intake-age" required value={intake.age} onChange={(event) => setIntake((current) => ({ ...current, age: event.target.value }))} placeholder="e.g. 2 yrs" /></div>
            <div className="space-y-1.5"><Label htmlFor="intake-color">Color</Label><Input id="intake-color" required value={intake.color} onChange={(event) => setIntake((current) => ({ ...current, color: event.target.value }))} /></div>
            <div className="space-y-1.5"><Label htmlFor="intake-date">Date impounded</Label><Input id="intake-date" type="date" required value={intake.date} onChange={(event) => setIntake((current) => ({ ...current, date: event.target.value }))} /></div>
            <div className="col-span-2 space-y-1.5"><Label htmlFor="intake-location">Location found</Label><Input id="intake-location" required value={intake.location} onChange={(event) => setIntake((current) => ({ ...current, location: event.target.value }))} placeholder="Barangay or street" /></div>
            <div className="col-span-2 flex justify-end gap-2 pt-2"><Button type="button" variant="outline" onClick={() => setIntakeOpen(false)}>Cancel</Button><Button type="submit" disabled={savingIntake}><Plus className="size-4" />{savingIntake ? "Saving…" : "Save intake"}</Button></div>
          </form>
        </DialogContent>
      </Dialog>
    </AppShell>
  );
};

export default ImpoundedDogs;
