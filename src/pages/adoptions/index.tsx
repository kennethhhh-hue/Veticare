import { useCallback, useEffect, useMemo, useState, type FormEvent } from "react";
import { useQueryClient } from "@tanstack/react-query";
import {
  Check,
  Clock,
  Eye,
  Heart,
  HeartHandshake,
  Mail,
  MapPin,
  PawPrint,
  Phone,
  RefreshCw,
  Search,
  SlidersHorizontal,
  X,
} from "lucide-react";
import { toast } from "sonner";
import { AppShell } from "@/components/veticare/app-shell";
import { PageHeader } from "@/components/admin/page-header";
import { MetricStrip } from "@/components/admin/metric-strip";
import { FilterSelect } from "@/components/admin/filter-select";
import { StatusPill } from "@/components/admin/status-pill";
import { PetPhoto } from "@/components/owner-app/pet-photo";
import { Pagination } from "@/components/admin/pagination";
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
import {
  Tooltip,
  TooltipContent,
  TooltipTrigger,
} from "@/components/ui/tooltip";
import { cn } from "@/lib/utils";
import { getPhilippineDateKey } from "@/lib/philippine-date";
import {
  type AdoptionApplication,
  type AdoptionStatus,
  type HomeVisit,
} from "@/data/shelter-records";
import { supabase } from "@/integrations/supabase/client";
import { sidebarCountKeys } from "@/data/veticare";

interface ApplicantOption {
  id: string;
  name: string;
  email: string;
  phone: string;
  area: string;
}

interface AnimalOption {
  id: string;
  impoundId: string;
  name: string;
  breed: string;
  species: "Dog" | "Cat";
  age: string;
  sex: string;
  color: string;
  photoUrl?: string;
}

type RegistryApplication = AdoptionApplication & { animal: AnimalOption | null };

function AnimalPreview({ animal }: { animal: AnimalOption }) {
  return (
    <section className="space-y-2 rounded-xl border border-border bg-card p-3">
      <h3 className="text-[11px] font-bold uppercase tracking-wide text-muted-foreground">Animal preview</h3>
      <div className="flex items-start gap-3">
        <PetPhoto src={animal.photoUrl} alt={animal.name} species={animal.species} className="size-20 shrink-0 rounded-lg" />
        <div className="min-w-0">
          <p className="break-words text-sm font-bold">{animal.name}</p>
          <p className="text-xs text-muted-foreground">{[animal.species, animal.breed, animal.sex, animal.age, animal.color].filter(Boolean).join(" · ")}</p>
          <p className="mt-1 break-all text-[10px] font-semibold text-muted-foreground">{animal.impoundId}</p>
        </div>
      </div>
    </section>
  );
}

const PAGE_SIZE = 5;

const homeVisitLabels: Record<HomeVisit, string> = {
  pending: "Pending",
  scheduled: "Scheduled",
  passed: "Completed",
};

const initials = (name: string) =>
  name
    .split(" ")
    .map((part) => part[0])
    .slice(0, 2)
    .join("");

const Adoptions = () => {
  const queryClient = useQueryClient();
  const [rows, setRows] = useState<RegistryApplication[]>([]);
  const [applicants, setApplicants] = useState<ApplicantOption[]>([]);
  const [availableAnimals, setAvailableAnimals] = useState<AnimalOption[]>([]);
  const [loading, setLoading] = useState(true);
  const [loadError, setLoadError] = useState<string | null>(null);
  const [savingApplication, setSavingApplication] = useState(false);
  const [query, setQuery] = useState("");
  const [status, setStatus] = useState("all");
  const [species, setSpecies] = useState("all");
  const [visitPending, setVisitPending] = useState(false);
  const [readyToDecide, setReadyToDecide] = useState(false);
  const [showFilters, setShowFilters] = useState(false);
  const [page, setPage] = useState(1);
  const [selected, setSelected] = useState<RegistryApplication | null>(null);
  const [newApplicationOpen, setNewApplicationOpen] = useState(false);
  const [applicantId, setApplicantId] = useState("");
  const [animalId, setAnimalId] = useState("");
  const [applicantNote, setApplicantNote] = useState("");

  const loadAdoptions = useCallback(async () => {
    setLoading(true);
    setLoadError(null);
    const [applicationsResult, profilesResult, impoundsResult, petPhotosResult] = await Promise.all([
      supabase.from("adoption_applications").select("*").order("created_at", { ascending: false }),
      supabase.from("profiles").select("id, full_name, email, phone, barangay, account_deleted_at").eq("role", "owner").order("full_name"),
      supabase.from("impounds").select("id, impound_id, pet_id, name, breed, animal_type, age, sex, color, photo_url, adoption_status, impound_status"),
      supabase.from("pets").select("pet_id, photo_url").not("pet_id", "is", null).not("photo_url", "is", null),
    ]);
    const error = applicationsResult.error ?? profilesResult.error ?? impoundsResult.error;
    if (error) {
      setLoadError(error.message);
      setLoading(false);
      return;
    }

    const profileById = new Map((profilesResult.data ?? []).map((profile) => [profile.id, profile]));
    const impoundById = new Map((impoundsResult.data ?? []).map((animal) => [animal.id, animal]));
    const photoByPetId = new Map((petPhotosResult.data ?? []).map((pet) => [pet.pet_id, pet.photo_url]));
    const toAnimalOption = (animal: NonNullable<typeof impoundsResult.data>[number]): AnimalOption => ({
      id: animal.id,
      impoundId: animal.impound_id,
      name: animal.name,
      breed: animal.breed,
      species: animal.animal_type as "Dog" | "Cat",
      age: animal.age,
      sex: animal.sex,
      color: animal.color,
      photoUrl: animal.photo_url || photoByPetId.get(animal.pet_id) || undefined,
    });
    setApplicants((profilesResult.data ?? []).filter((profile) => !profile.account_deleted_at).map((profile) => ({
      id: profile.id,
      name: profile.full_name || profile.email || "Pet owner",
      email: profile.email || "",
      phone: profile.phone || "—",
      area: profile.barangay || "—",
    })));
    setAvailableAnimals((impoundsResult.data ?? [])
      .filter((animal) => animal.adoption_status === "available" && animal.impound_status === "impounded")
      .map(toAnimalOption));
    setRows((applicationsResult.data ?? []).map((application) => {
      const applicant = profileById.get(application.applicant_id);
      const animal = impoundById.get(application.impound_record_id);
      const displayDate = new Date(`${application.application_date}T12:00:00`).toLocaleDateString(undefined, { month: "short", day: "numeric", year: "numeric" });
      return {
        id: application.id,
        animal: animal ? toAnimalOption(animal) : null,
        applicationId: application.application_id,
        ownerId: application.applicant_id,
        impoundId: animal?.impound_id ?? "Unknown impound",
        applicationDate: displayDate,
        applicationStatus: application.status as AdoptionStatus,
        decisionDate: application.decision_date,
        applicant: applicant?.full_name || applicant?.email || "Pet owner",
        email: applicant?.email || "",
        phone: applicant?.phone || "—",
        pet: animal?.name || "Unknown animal",
        petBreed: animal?.breed || "—",
        species: (animal?.animal_type ?? "Dog") as "Dog" | "Cat",
        applied: displayDate,
        appliedAt: application.application_date,
        area: applicant?.barangay || "—",
        homeVisit: application.home_visit_status as HomeVisit,
        status: application.status as AdoptionStatus,
        note: application.note,
      };
    }));
    setLoading(false);
  }, []);

  const selectedAnimal = availableAnimals.find((animal) => animal.id === animalId);

  useEffect(() => {
    void loadAdoptions();
    window.addEventListener("focus", loadAdoptions);
    return () => window.removeEventListener("focus", loadAdoptions);
  }, [loadAdoptions]);

  const filtered = useMemo(() => {
    const search = query.trim().toLowerCase();
    return [...rows]
      .sort((a, b) => (a.appliedAt < b.appliedAt ? 1 : -1))
      .filter((application) => {
        const matchesQuery =
          search.length === 0 ||
          `${application.applicant} ${application.pet} ${application.email} ${application.id} ${application.area}`
            .toLowerCase()
            .includes(search);
        const matchesStatus = status === "all" || application.status === status;
        const matchesSpecies = species === "all" || application.species === species;
        const matchesVisit = !visitPending || application.homeVisit !== "passed";
        const matchesReady =
          !readyToDecide || (application.status === "pending" && application.homeVisit === "passed");
        return matchesQuery && matchesStatus && matchesSpecies && matchesVisit && matchesReady;
      });
  }, [rows, query, status, species, visitPending, readyToDecide]);

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
    setSpecies("all");
    setVisitPending(false);
    setReadyToDecide(false);
    setPage(1);
    void loadAdoptions();
    toast.success("Adoption queue refreshed.");
  };

  const decide = async (application: AdoptionApplication, next: AdoptionStatus) => {
    const decisionDate = next === "pending" ? null : getPhilippineDateKey();
    const completesHomeVisit = next === "approved" || next === "completed";
    const update = {
      status: next,
      decision_date: decisionDate,
      ...(completesHomeVisit ? { home_visit_status: "passed" } : {}),
    };
    const { error } = await supabase.from("adoption_applications")
      .update(update)
      .eq("id", application.id)
      .select("id")
      .single();
    if (error) {
      toast.error(error.message);
      return;
    }
    const changes: Partial<AdoptionApplication> = {
      status: next,
      applicationStatus: next,
      decisionDate,
      ...(completesHomeVisit ? { homeVisit: "passed" } : {}),
    };
    setRows((prev) => prev.map((item) => item.id === application.id ? { ...item, ...changes } : item));
    setSelected((current) =>
      current?.id === application.id ? { ...current, ...changes } : current,
    );
    void queryClient.invalidateQueries({ queryKey: sidebarCountKeys.impounded });

    if (next === "approved") {
      toast.success(`Application ${application.id} approved`, {
        description: `${application.applicant} can be scheduled for pickup of ${application.pet}.`,
      });
    } else if (next === "rejected") {
      toast.error(`Application ${application.id} rejected`, {
        description: `${application.applicant} will receive an in-app notification.`,
      });
    } else if (next === "completed") {
      toast.success(`Adoption ${application.id} marked complete.`, { description: `${application.pet} is recorded as released.` });
    }
  };

  const updateHomeVisit = async (application: AdoptionApplication, next: HomeVisit) => {
    const { error } = await supabase.from("adoption_applications").update({ home_visit_status: next }).eq("id", application.id);
    if (error) {
      toast.error(error.message);
      return;
    }
    setRows((current) => current.map((item) => item.id === application.id ? { ...item, homeVisit: next } : item));
    setSelected((current) => current?.id === application.id ? { ...current, homeVisit: next } : current);
    toast.success(`Home visit marked ${next}.`);
  };

  const createApplication = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    const applicant = applicants.find((owner) => owner.id === applicantId);
    const animal = availableAnimals.find((pet) => pet.id === animalId);
    if (!applicant || !animal) return;
    const now = new Date();
    const date = getPhilippineDateKey(now);
    setSavingApplication(true);
    const { error } = await supabase.from("adoption_applications").insert({
      application_id: `AD-${Date.now().toString().slice(-8)}`,
      applicant_id: applicant.id,
      impound_record_id: animal.id,
      application_date: date,
      home_visit_status: "pending",
      note: applicantNote.trim(),
    });
    setSavingApplication(false);
    if (error) {
      toast.error(error.message);
      return;
    }
    await loadAdoptions();
    setNewApplicationOpen(false);
    setApplicantId("");
    setAnimalId("");
    setApplicantNote("");
    setPage(1);
    toast.success("Adoption application added to the live queue.");
  };

  const metrics = [
    {
      label: "Applications",
      value: rows.length,
      hint: "Last 30 days",
      icon: Heart,
      tone: "primary" as const,
    },
    {
      label: "In review",
      value: rows.filter((row) => row.status === "pending").length,
      hint: "Awaiting decision",
      icon: Clock,
      tone: "warning" as const,
    },
    {
      label: "Approved",
      value: rows.filter((row) => row.status === "approved").length,
      hint: "Pickup scheduled",
      icon: HeartHandshake,
      tone: "info" as const,
    },
    {
      label: "Avg. days in care",
      value: 19,
      hint: "Before adoption",
      icon: PawPrint,
      tone: "neutral" as const,
    },
  ];

  return (
    <AppShell>
      <PageHeader
        eyebrow="Shelter"
        title="Adoption Applications"
        description="Review application IDs, owner and impound links, application dates, decisions, and current status."
        actions={
          <Button
            onClick={() => setNewApplicationOpen(true)}
            className="h-9 rounded-xl px-3.5 text-[12px] font-bold shadow-glow"
          >
            <HeartHandshake className="size-4" />
            New Application
          </Button>
        }
      />

      <MetricStrip metrics={metrics} />

      <section className="surface-card fade-up mt-4 overflow-hidden rounded-2xl border border-border bg-card sm:mt-5">
        <div className="flex flex-col gap-2.5 p-3.5 sm:p-4 lg:flex-row lg:flex-wrap lg:items-center">
          <div className="relative min-w-[240px] flex-1">
            <Search className="pointer-events-none absolute left-3 top-1/2 size-4 -translate-y-1/2 text-muted-foreground/70" />
            <Input
              value={query}
              onChange={(event) => resetPage(setQuery)(event.target.value)}
              placeholder="Search applicant, pet, or reference…"
              aria-label="Search adoption applications"
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
                { value: "pending", label: "Pending" },
                { value: "approved", label: "Approved" },
                { value: "completed", label: "Completed" },
                { value: "rejected", label: "Rejected" },
              ]}
            />
            <FilterSelect
              label="Species"
              value={species}
              onChange={resetPage(setSpecies)}
              options={[
                { value: "all", label: "All" },
                { value: "Dog", label: "Dogs" },
                { value: "Cat", label: "Cats" },
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
                id: "visit",
                label: "Home visit not cleared",
                checked: visitPending,
                onChange: (value: boolean) => {
                  setVisitPending(value);
                  setPage(1);
                },
              },
              {
                id: "ready",
                label: "Ready to decide",
                checked: readyToDecide,
                onChange: (value: boolean) => {
                  setReadyToDecide(value);
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
              {filtered.length} of {rows.length} applications
            </span>
          </div>
        ) : null}

        <div className="hidden border-y border-border bg-secondary/40 px-5 py-2 xl:grid xl:grid-cols-[minmax(0,1.4fr)_minmax(0,1.1fr)_105px_105px_96px_112px] xl:gap-4">
          {["Owner / application ID", "Animal / impound ID", "Application date", "Decision date", "Application status", "Action"].map((label) => (
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
              <Heart className="size-5" />
            </span>
            <p className="text-[13px] font-bold text-foreground">
              {loading ? "Loading adoption applications…" : loadError ? "Adoption queue unavailable" : rows.length === 0 ? "No adoption applications yet" : "No applications match"}
            </p>
            <p className="max-w-[260px] text-[11.5px] text-muted-foreground">
              {loadError ?? (rows.length === 0 ? "Create an application using a registered owner and an available impounded animal." : "Try another applicant or clear the filters to see the whole queue.")}
            </p>
            {!loading && !loadError && rows.length === 0 ? <Button
              size="sm"
              onClick={() => setNewApplicationOpen(true)}
              className="mt-1 h-8 rounded-lg text-[11px] font-semibold"
            >
              <HeartHandshake className="size-3.5" />
              New Application
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
            {visible.map((application) => (
              <li
                key={application.id}
                role="button"
                tabIndex={0}
                aria-label={`View adoption application from ${application.applicant}`}
                onClick={() => setSelected(application)}
                onKeyDown={(event) => {
                  if (event.target !== event.currentTarget) return;
                  if (event.key === "Enter" || event.key === " ") {
                    event.preventDefault();
                    setSelected(application);
                  }
                }}
                className="grid cursor-pointer grid-cols-[minmax(0,1fr)_auto] items-center gap-x-3 gap-y-2.5 px-3.5 py-3.5 transition-colors hover:bg-secondary/40 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-inset focus-visible:ring-primary sm:px-4 xl:grid-cols-[minmax(0,1.4fr)_minmax(0,1.1fr)_105px_105px_96px_112px] xl:gap-4 xl:px-5"
              >
                <div className="order-1 flex min-w-0 items-center gap-2.5 xl:order-none">
                  <span className="grid size-9 shrink-0 place-items-center rounded-xl bg-primary-soft text-[11px] font-bold text-primary">
                    {initials(application.applicant)}
                  </span>
                  <div className="min-w-0">
                    <p className="truncate text-[12.5px] font-bold text-foreground">
                      {application.applicant}
                    </p>
                    <p className="truncate text-[10px] text-muted-foreground">
                      {application.email}
                    </p>
                    <p className="num mt-0.5 text-[9px] text-muted-foreground/70">
                      {application.applicationId} • {application.ownerId}
                    </p>
                  </div>
                </div>

                <div className="order-3 col-span-2 min-w-0 xl:order-none xl:col-span-1">
                  <p className="text-[9px] font-bold uppercase tracking-[0.1em] text-muted-foreground xl:hidden">
                    Pet
                  </p>
                  <p className="flex items-center gap-1.5 truncate text-[11px] font-semibold text-foreground">
                    <PawPrint className="size-3 shrink-0 text-muted-foreground" />
                    {application.pet}
                  </p>
                  <p className="truncate text-[9.5px] text-muted-foreground">
                    {application.petBreed} • {application.impoundId}
                  </p>
                </div>

                <div className="order-3 xl:order-none">
                  <p className="text-[9px] font-bold uppercase tracking-[0.1em] text-muted-foreground xl:hidden">
                    Application date
                  </p>
                  <p className="text-[10.5px] text-foreground/85">{application.applicationDate}</p>
                </div>

                <div className="order-3 xl:order-none">
                  <p className="text-[9px] font-bold uppercase tracking-[0.1em] text-muted-foreground xl:hidden">
                    Decision date
                  </p>
                  <p className="text-[10.5px] text-foreground/85">{application.decisionDate ?? "—"}</p>
                </div>

                <div className="order-2 xl:order-none">
                  <StatusPill status={application.applicationStatus} />
                </div>

                <div onClick={(event) => event.stopPropagation()} className="order-4 col-span-2 flex items-center justify-end gap-1 xl:order-none xl:col-span-1 xl:justify-start">
                  {application.status === "pending" ? (
                    <>
                      <Tooltip>
                        <TooltipTrigger asChild>
                          <Button
                            size="icon"
                            onClick={() => decide(application, "approved")}
                            className="size-7 rounded-lg bg-primary text-primary-foreground"
                            aria-label={`Approve application from ${application.applicant}`}
                          >
                            <Check className="size-3.5" strokeWidth={2.6} />
                          </Button>
                        </TooltipTrigger>
                        <TooltipContent>Approve adoption</TooltipContent>
                      </Tooltip>
                      <Tooltip>
                        <TooltipTrigger asChild>
                          <Button
                            size="icon"
                            variant="outline"
                            onClick={() => decide(application, "rejected")}
                            className="size-7 rounded-lg border-border text-muted-foreground hover:border-destructive/30 hover:bg-destructive/10 hover:text-destructive"
                            aria-label={`Reject application from ${application.applicant}`}
                          >
                            <X className="size-3.5" strokeWidth={2.6} />
                          </Button>
                        </TooltipTrigger>
                        <TooltipContent>Reject application</TooltipContent>
                      </Tooltip>
                    </>
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
        {rows.filter((row) => row.status === "pending" && row.homeVisit === "passed").length}{" "}
        {rows.filter((row) => row.status === "pending" && row.homeVisit === "passed").length === 1
          ? "application is"
          : "applications are"}{" "}
        ready for a decision
      </p>

      <Dialog open={Boolean(selected)} onOpenChange={(open) => (!open ? setSelected(null) : null)}>
        <DialogContent className="max-h-[88vh] w-[calc(100%-2rem)] max-w-[480px] overflow-y-auto rounded-2xl border-border p-5 sm:rounded-2xl">
          {selected ? (
            <>
              <DialogHeader className="pr-6 text-left">
                <div className="flex items-center gap-3">
                  <span className="grid size-11 shrink-0 place-items-center rounded-xl bg-primary-soft text-[12px] font-bold text-primary">
                    {initials(selected.applicant)}
                  </span>
                  <div className="min-w-0">
                    <DialogTitle className="truncate text-[16px] font-extrabold tracking-[-0.02em]">
                      {selected.applicant}
                    </DialogTitle>
                    <DialogDescription className="num truncate text-[11px]">
                      {selected.applicationId} • Applied {selected.applicationDate}
                    </DialogDescription>
                  </div>
                </div>
              </DialogHeader>

              <div className="space-y-3">
                <div className="flex flex-wrap items-center gap-2">
                  <StatusPill status={selected.status} />
                  <StatusPill status={selected.homeVisit === "passed" ? "completed" : selected.homeVisit} />
                </div>

                {selected.animal ? <AnimalPreview animal={selected.animal} /> : null}

                <div className="divide-y divide-border rounded-2xl border border-border bg-card">
                  <h3 className="px-3.5 py-2 text-[11px] font-bold uppercase tracking-wide text-muted-foreground">Owner and application details</h3>
                  {[
                    { label: "Owner ID", value: selected.ownerId, icon: Eye },
                    { label: "Application date", value: selected.applicationDate, icon: Clock },
                    { label: "Decision date", value: selected.decisionDate ?? "Not decided", icon: Clock },
                    { label: "Application status", value: selected.applicationStatus, icon: Heart },
                    { label: "Home visit", value: homeVisitLabels[selected.homeVisit], icon: MapPin },
                    { label: "Mobile", value: selected.phone, icon: Phone },
                    { label: "Email", value: selected.email, icon: Mail },
                    { label: "Barangay", value: selected.area, icon: MapPin },
                  ].map((item) => {
                    const Icon = item.icon;
                    return (
                      <div key={item.label} className="flex items-center gap-2.5 px-3.5 py-3">
                        <span className="grid size-7 place-items-center rounded-lg bg-secondary text-muted-foreground">
                          <Icon className="size-3.5" />
                        </span>
                        <div className="min-w-0">
                          <p className="text-[9px] font-bold uppercase tracking-[0.1em] text-muted-foreground">
                            {item.label}
                          </p>
                          <p className="num truncate text-[11px] font-semibold text-foreground">
                            {item.value}
                          </p>
                        </div>
                      </div>
                    );
                  })}
                </div>

                <div className="rounded-xl border border-border bg-secondary/40 p-3">
                  <p className="text-[9px] font-bold uppercase tracking-[0.1em] text-muted-foreground">
                    Applicant note
                  </p>
                  <p className="mt-1 text-[10.5px] leading-relaxed text-foreground/85">
                    {selected.note}
                  </p>
                </div>

                {selected.status === "pending" && selected.homeVisit !== "passed" ? (
                  <Button variant="outline" onClick={() => updateHomeVisit(selected, "passed")} className="w-full">
                    <MapPin className="size-4" />Mark home visit passed
                  </Button>
                ) : null}

                {selected.status === "pending" ? (
                  <div className="flex flex-col gap-2">
                    <Button
                      onClick={() => decide(selected, "approved")}
                      className="h-10 w-full rounded-xl text-[12px] font-bold shadow-glow"
                    >
                      <Check className="size-4" />
                      Approve this adoption
                    </Button>
                    <Button
                      variant="outline"
                      onClick={() => decide(selected, "rejected")}
                      className="h-10 w-full rounded-xl border-border text-[12px] font-semibold text-destructive hover:bg-destructive/10 hover:text-destructive"
                    >
                      <X className="size-4" />
                      Reject application
                    </Button>
                  </div>
                ) : selected.status === "approved" ? (
                  <div className="flex flex-col gap-2">
                    <Button onClick={() => decide(selected, "completed")} className="h-10 w-full rounded-xl text-[12px] font-bold shadow-glow">
                      <Check className="size-4" />Mark adoption completed
                    </Button>
                    <Button variant="outline" onClick={() => setSelected(null)} className="h-10 w-full rounded-xl border-border text-[12px] font-semibold">
                      Close record
                    </Button>
                  </div>
                ) : (
                  <Button
                    variant="outline"
                    onClick={() => setSelected(null)}
                    className="h-10 w-full rounded-xl border-border text-[12px] font-semibold"
                  >
                    Close record
                  </Button>
                )}
              </div>
            </>
          ) : null}
        </DialogContent>
      </Dialog>

      <Dialog open={newApplicationOpen} onOpenChange={setNewApplicationOpen}>
        <DialogContent className="max-h-[90vh] overflow-y-auto rounded-xl border-border bg-card sm:max-w-[520px]">
          <DialogHeader>
            <DialogTitle>New adoption application</DialogTitle>
            <DialogDescription>Create an application for an owner and an available animal from the shelter register.</DialogDescription>
          </DialogHeader>
            {applicants.length === 0 || availableAnimals.length === 0 ? (
              <p className="rounded-lg border border-warning/25 bg-warning/10 p-3 text-[10px] leading-relaxed text-foreground">
                {applicants.length === 0 && availableAnimals.length === 0
                  ? "No owner accounts or available impound records were found. Add an owner and ensure an animal is marked available in the Impounded Animals page first."
                  : applicants.length === 0
                    ? "No owner accounts were found. Register an owner account before creating an adoption application."
                    : "No available impound animals were found. An animal must be in the shelter register and marked available before an application can be created."}
              </p>
            ) : null}
          <form onSubmit={createApplication} className="space-y-3">
            <div className="space-y-1.5">
              <Label htmlFor="adoption-owner">Owner</Label>
              <select id="adoption-owner" required value={applicantId} onChange={(event) => setApplicantId(event.target.value)} className="h-10 w-full rounded-md border border-input bg-background px-3 text-sm">
                <option value="">Select owner</option>
                {applicants.map((owner) => <option key={owner.id} value={owner.id}>{owner.name} {owner.email ? `• ${owner.email}` : ""}</option>)}
              </select>
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="adoption-animal">Animal</Label>
              <select id="adoption-animal" required value={animalId} onChange={(event) => setAnimalId(event.target.value)} className="h-10 w-full rounded-md border border-input bg-background px-3 text-sm">
                <option value="">Select available animal</option>
                {availableAnimals.map((animal) => <option key={animal.id} value={animal.id}>{animal.name} • {animal.breed} • {animal.impoundId}</option>)}
              </select>
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="adoption-note">Application note</Label>
              <Input id="adoption-note" value={applicantNote} onChange={(event) => setApplicantNote(event.target.value)} placeholder="Home, experience, or follow-up notes" />
            </div>
            {selectedAnimal ? <AnimalPreview animal={selectedAnimal} /> : null}
            <div className="flex justify-end gap-2 pt-2">
              <Button type="button" variant="outline" onClick={() => setNewApplicationOpen(false)}>Cancel</Button>
              <Button type="submit" disabled={savingApplication || applicants.length === 0 || availableAnimals.length === 0}><HeartHandshake className="size-4" />{savingApplication ? "Saving…" : "Create application"}</Button>
            </div>
          </form>
        </DialogContent>
      </Dialog>
    </AppShell>
  );
};

export default Adoptions;
