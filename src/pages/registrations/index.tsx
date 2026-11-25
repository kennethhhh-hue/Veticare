import { useCallback, useEffect, useMemo, useState } from "react";
import { useQueryClient } from "@tanstack/react-query";
import {
  Check,
  Pencil,
  PawPrint,
  Phone,
  QrCode,
  RefreshCw,
  Search,
  SlidersHorizontal,
  Venus,
  Mars,
  X,
} from "lucide-react";
import { toast } from "sonner";
import { QRCodeSVG } from "qrcode.react";
import { AppShell } from "@/components/veticare/app-shell";
import { PageHeader } from "@/components/admin/page-header";
import { MetricStrip } from "@/components/admin/metric-strip";
import { FilterSelect } from "@/components/admin/filter-select";
import { StatusPill } from "@/components/admin/status-pill";
import { Pagination } from "@/components/admin/pagination";
import { PetVaccinationRecords } from "@/components/admin/pet-vaccination-records";
import { Button } from "@/components/ui/button";
import { Checkbox } from "@/components/ui/checkbox";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import {
  Tooltip,
  TooltipContent,
  TooltipTrigger,
} from "@/components/ui/tooltip";
import { cn } from "@/lib/utils";
import { PetPhoto } from "@/components/owner-app/pet-photo";
import { type PetRegistration, type RegistrationStatus } from "@/data/admin-records";
import { sidebarCountKeys } from "@/data/veticare";
import { supabase } from "@/integrations/supabase/client";
import { AddPetDialog, type OwnerAccountOption } from "./add-pet-dialog";

const PAGE_SIZE = 5;

const genderClass = (gender: PetRegistration["gender"]) =>
  gender === "Male" ? "text-info" : "text-destructive/80";

const Registrations = () => {
  const queryClient = useQueryClient();
  const [rows, setRows] = useState<PetRegistration[]>([]);
  const [ownerOptions, setOwnerOptions] = useState<OwnerAccountOption[]>([]);
  const [loading, setLoading] = useState(true);
  const [loadError, setLoadError] = useState<string | null>(null);
  const [addPetOpen, setAddPetOpen] = useState(false);
  const [query, setQuery] = useState("");
  const [species, setSpecies] = useState("all");
  const [status, setStatus] = useState("all");
  const [qrFilter, setQrFilter] = useState("all");
  const [draftsOnly, setDraftsOnly] = useState(false);
  const [showFilters, setShowFilters] = useState(false);
  const [page, setPage] = useState(1);
  const [issueTarget, setIssueTarget] = useState<PetRegistration | null>(null);
  const [detailTarget, setDetailTarget] = useState<PetRegistration | null>(null);
  const [editingDetails, setEditingDetails] = useState(false);
  const [savingDetails, setSavingDetails] = useState(false);
  const [detailDraft, setDetailDraft] = useState({ name: "", species: "Dog" as "Dog" | "Cat", breed: "", gender: "Male" as "Male" | "Female", age: "", weight: "", color: "" });
  const [issuePetId, setIssuePetId] = useState("");
  const [savingApproval, setSavingApproval] = useState(false);

  const loadRegistry = useCallback(async () => {
    setLoading(true);
    setLoadError(null);
    const [{ data: petRows, error: petsError }, { data: profiles, error: profilesError }] = await Promise.all([
      supabase.from("pets").select("*").order("created_at", { ascending: false }),
      supabase.from("profiles").select("id, email, full_name, phone, barangay, account_deleted_at").eq("role", "owner").order("full_name"),
    ]);
    if (petsError || profilesError) {
      const message = petsError?.message ?? profilesError?.message ?? "Unable to load registrations.";
      setLoadError(message);
      toast.error(message);
      setLoading(false);
      return;
    }
    const ownerById = new Map((profiles ?? []).map((profile) => [profile.id, profile]));
    setOwnerOptions((profiles ?? []).filter((profile) => !profile.account_deleted_at).map((profile) => ({
      id: profile.id,
      email: profile.email,
      name: profile.full_name || profile.email || "Pet owner",
      phone: profile.phone || "—",
      barangay: profile.barangay || "",
    })));
    setRows((petRows ?? []).map((pet) => {
      const owner = ownerById.get(pet.owner_id);
      return {
        id: pet.id,
        ownerId: pet.owner_id,
        ownerPetKey: pet.id,
        name: pet.name,
        species: pet.species as "Dog" | "Cat",
        breed: pet.breed,
        gender: pet.sex as "Male" | "Female",
        age: pet.age,
        weight: pet.weight,
        color: pet.color,
        photoUrl: pet.photo_url,
        owner: owner?.full_name || owner?.email || "Pet owner",
        phone: owner?.phone || "—",
        petId: pet.pet_id,
        qrCode: pet.qr_code,
        registered: new Date(pet.created_at).toLocaleDateString(undefined, { month: "short", day: "numeric", year: "numeric" }),
        registeredAt: pet.created_at.slice(0, 10),
        status: pet.status as RegistrationStatus,
      };
    }));
    setLoading(false);
  }, []);

  useEffect(() => {
    void loadRegistry();
    window.addEventListener("focus", loadRegistry);
    return () => window.removeEventListener("focus", loadRegistry);
  }, [loadRegistry]);

  const pendingCount = rows.filter((row) => row.status === "pending").length;
  const draftCount = rows.filter((row) => row.isDraft).length;

  const filtered = useMemo(() => {
    const search = query.trim().toLowerCase();
    return rows.filter((row) => {
      const matchesQuery =
        search.length === 0 ||
        `${row.name} ${row.breed} ${row.owner} ${row.id}`.toLowerCase().includes(search);
      const matchesSpecies = species === "all" || row.species === species;
      const matchesStatus = status === "all" || row.status === status;
      const matchesQr =
        qrFilter === "all" || (qrFilter === "assigned" ? Boolean(row.qrCode) : !row.qrCode);
      const matchesDraft = !draftsOnly || Boolean(row.isDraft);
      return (
        matchesQuery &&
        matchesSpecies &&
        matchesStatus &&
        matchesQr &&
        matchesDraft
      );
    });
  }, [rows, query, species, status, qrFilter, draftsOnly]);

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
    setSpecies("all");
    setStatus("all");
    setQrFilter("all");
    setDraftsOnly(false);
    setPage(1);
    void loadRegistry();
    void queryClient.invalidateQueries({ queryKey: sidebarCountKeys.registrations });
    toast.success("Registration list refreshed.");
  };

  const beginApproval = (row: PetRegistration) => {
    const suffix = row.id.replace(/\D/g, "").slice(-4).padStart(4, "0");
    const petId = row.petId || `VC-${new Date().getFullYear()}-${suffix}`;
    setIssueTarget(row);
    setIssuePetId(petId);
  };

  const openRegistrationDetails = (row: PetRegistration) => {
    setDetailTarget(row);
    setEditingDetails(false);
    setDetailDraft({
      name: row.name,
      species: row.species,
      breed: row.breed,
      gender: row.gender,
      age: row.age ?? "",
      weight: row.weight ?? "",
      color: row.color ?? "",
    });
  };

  const saveRegistrationDetails = async () => {
    if (!detailTarget) return;
    if (!detailDraft.name.trim() || !detailDraft.breed.trim()) {
      toast.error("Pet name and breed are required.");
      return;
    }
    setSavingDetails(true);
    const { error } = await supabase.from("pets").update({
      name: detailDraft.name.trim(),
      species: detailDraft.species,
      breed: detailDraft.breed.trim(),
      sex: detailDraft.gender,
      age: detailDraft.age.trim() || "Not provided",
      weight: detailDraft.weight.trim(),
      color: detailDraft.color.trim(),
    }).eq("id", detailTarget.id);
    setSavingDetails(false);
    if (error) {
      toast.error(error.message);
      return;
    }
    const updated = {
      ...detailTarget,
      name: detailDraft.name.trim(),
      species: detailDraft.species,
      breed: detailDraft.breed.trim(),
      gender: detailDraft.gender,
      age: detailDraft.age.trim() || "Not provided",
      weight: detailDraft.weight.trim(),
      color: detailDraft.color.trim(),
    };
    setDetailTarget(updated);
    setRows((current) => current.map((row) => row.id === updated.id ? updated : row));
    setEditingDetails(false);
    toast.success("Pet profile updated.");
  };

  const issueQrAndApprove = async () => {
    const petId = issuePetId.trim();
    if (!issueTarget || !petId || savingApproval) return;

    setSavingApproval(true);
    const { data, error } = await supabase.from("pets").update({
      status: "approved",
      pet_id: petId,
      qr_code: petId,
    }).eq("id", issueTarget.id).eq("status", "pending").select("id").maybeSingle();
    setSavingApproval(false);

    if (error) {
      const duplicateIdentifier = error.code === "23505" && /pet_id|qr_code/.test(error.message);
      toast.error(duplicateIdentifier ? "This Pet ID or QR code is already assigned. Enter a unique Pet ID and try again." : error.message);
      return;
    }
    if (!data) {
      toast.error("This registration is no longer pending. Refresh the list to see its current status.");
      return;
    }

    toast.success(`${issueTarget.name} approved and QR code issued.`, {
      description: `Pet ID ${petId} is available in the owner app.`,
    });
    setIssueTarget(null);
    setDetailTarget((current) => current?.id === issueTarget.id
      ? { ...current, status: "approved", petId, qrCode: petId }
      : current);
    void queryClient.invalidateQueries({ queryKey: sidebarCountKeys.registrations });
    await loadRegistry();
  };

  const decide = async (row: PetRegistration, next: RegistrationStatus) => {
    const { error } = await supabase.from("pets").update({ status: next }).eq("id", row.id);
    if (error) {
      toast.error(error.message);
      return;
    }
    setRows((prev) => prev.map((item) => (item.id === row.id ? { ...item, status: next } : item)));
    void queryClient.invalidateQueries({ queryKey: sidebarCountKeys.registrations });
    if (next === "rejected") {
      toast.error(`${row.name} rejected`, {
        description: "The owner will be notified to complete the requirements.",
      });
    }
  };

  const metrics = [
    {
      label: "Total pets",
      value: rows.length,
      hint: "All time",
      icon: PawPrint,
      tone: "primary" as const,
    },
    {
      label: "Male pets",
      value: rows.filter((row) => row.gender === "Male").length,
      hint: "Registry split",
      icon: Mars,
      tone: "info" as const,
    },
    {
      label: "Female pets",
      value: rows.filter((row) => row.gender === "Female").length,
      hint: "Registry split",
      icon: Venus,
      tone: "warning" as const,
    },
    {
      label: "QR codes issued",
      value: rows.filter((row) => row.qrCode).length,
      hint: `${rows.filter((row) => !row.qrCode).length} not assigned`,
      icon: QrCode,
      tone: "neutral" as const,
    },
  ];

  return (
    <AppShell>
      <PageHeader
        eyebrow="Operations"
        title="Pet Registration"
        description="Review owner submissions and issue Pet IDs with QR codes."
        actions={
          <>
            <Button
              variant="outline"
              onClick={() => {
                setDraftsOnly((value) => !value);
                setStatus("all");
                setPage(1);
              }}
              className={cn(
                "h-9 rounded-xl border-border bg-card text-[12px] font-bold",
                draftsOnly && "border-primary/30 bg-primary-soft text-primary",
              )}
            >
              Drafts
              <span className="num rounded-full bg-secondary px-1.5 text-[10px] font-bold text-muted-foreground">
                {draftCount}
              </span>
            </Button>
            <Button
              onClick={() => setAddPetOpen(true)}
              className="h-9 rounded-xl px-3.5 text-[12px] font-bold shadow-glow"
            >
              <PawPrint className="size-4" />
              Add New Pet
            </Button>
          </>
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
              placeholder="Search pets or owners…"
              aria-label="Search registrations"
              className="h-9 rounded-xl border-border bg-background pl-9 text-[12px] focus-visible:ring-2 focus-visible:ring-primary/20 focus-visible:ring-offset-0"
            />
          </div>

          <div className="grid grid-cols-2 items-center gap-2 sm:flex sm:flex-wrap sm:gap-2.5">
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
            <FilterSelect
              label="Status"
              value={status}
              onChange={resetPage(setStatus)}
              options={[
                { value: "all", label: "All" },
                { value: "pending", label: "Pending" },
                { value: "approved", label: "Approved" },
                { value: "rejected", label: "Rejected" },
              ]}
            />
            <FilterSelect
              className="col-span-2 sm:col-auto"
              label="QR code"
              value={qrFilter}
              onChange={resetPage(setQrFilter)}
              options={[
                { value: "all", label: "All" },
                { value: "assigned", label: "Assigned" },
                { value: "unassigned", label: "Not assigned" },
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
              <Tooltip>
                <TooltipTrigger asChild>
                  <Button
                    variant="ghost"
                    onClick={refresh}
                    className="h-9 rounded-xl px-2.5 text-[11.5px] font-semibold text-muted-foreground hover:text-foreground"
                  >
                    <RefreshCw className="size-3.5" />
                    Refresh
                  </Button>
                </TooltipTrigger>
                <TooltipContent>Clear filters and reload the list</TooltipContent>
              </Tooltip>
            </div>
          </div>
        </div>

        {showFilters ? (
          <div className="flex flex-wrap items-center gap-2 border-t border-border bg-secondary/30 px-3.5 py-2.5 sm:px-4">
            <span className="mr-1 text-[9.5px] font-bold uppercase tracking-[0.12em] text-muted-foreground">
              Quick filters
            </span>
            <label className="flex cursor-pointer items-center gap-1.5 rounded-lg border border-border bg-card px-2.5 py-1.5 text-[10.5px] font-semibold text-foreground/85">
              <Checkbox
                checked={draftsOnly}
                onCheckedChange={(value) => resetPage(setDraftsOnly)(value === true)}
                className="size-3.5 rounded-[4px] border-border data-[state=checked]:border-primary"
              />
              Drafts only
            </label>
            <span className="ml-auto text-[10px] text-muted-foreground">
              {filtered.length} of {rows.length} records
            </span>
          </div>
        ) : null}

        <div className="hidden border-y border-border bg-secondary/40 px-5 py-2 xl:grid xl:grid-cols-[minmax(0,1.6fr)_minmax(0,1.05fr)_minmax(0,1.05fr)_minmax(0,0.85fr)_104px_116px] xl:gap-4">
          {["Pet", "Owner", "Pet ID / QR", "Registered", "Status", "Action"].map((label) => (
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
              {loading ? "Loading registrations…" : loadError ? "Pet registrations unavailable" : rows.length === 0 ? "No pet registrations yet" : "No registrations match"}
            </p>
            <p className="max-w-[260px] text-[11.5px] text-muted-foreground">
              {loadError ?? (rows.length === 0
                ? "Add a pet registration or invite an owner to submit one."
                : "Try a different name, or clear the filters to see the full list.")}
            </p>
            {!loading && !loadError && rows.length === 0 ? (
              <Button size="sm" onClick={() => setAddPetOpen(true)} className="mt-1 h-8 rounded-lg text-[11px] font-semibold">
                <PawPrint className="size-3.5" />
                Add New Pet
              </Button>
            ) : !loading && !loadError ? (
              <Button variant="outline" size="sm" onClick={refresh} className="mt-1 h-8 rounded-lg text-[11px] font-semibold">
                Clear filters
              </Button>
            ) : null}
          </div>
        ) : (
          <ul className="divide-y divide-border border-b border-border">
            {visible.map((row) => (
              <li
                key={row.id}
                role="button"
                tabIndex={0}
                aria-label={`View registration record for ${row.name}`}
                onClick={() => openRegistrationDetails(row)}
                onKeyDown={(event) => {
                  if (event.target !== event.currentTarget) return;
                  if (event.key === "Enter" || event.key === " ") {
                    event.preventDefault();
                    openRegistrationDetails(row);
                  }
                }}
                className="grid cursor-pointer grid-cols-[minmax(0,1fr)_auto] items-center gap-x-3 gap-y-2.5 px-3.5 py-3.5 transition-colors hover:bg-secondary/40 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-inset focus-visible:ring-primary sm:px-4 xl:grid-cols-[minmax(0,1.6fr)_minmax(0,1.05fr)_minmax(0,1.05fr)_minmax(0,0.85fr)_104px_116px] xl:gap-4 xl:px-5"
              >
                <div className="flex min-w-0 items-center gap-2.5">
                  {row.photoUrl ? (
                    <PetPhoto src={row.photoUrl} alt={row.name} species={row.species} className="size-9 shrink-0 rounded-xl" />
                  ) : (
                    <span
                      className={cn(
                        "grid size-9 shrink-0 place-items-center rounded-xl text-[11px] font-bold",
                        row.species === "Dog"
                          ? "bg-primary-soft text-primary"
                          : "bg-warning/12 text-warning",
                      )}
                    >
                      {row.name
                        .split(" ")
                        .map((part) => part[0])
                        .slice(0, 2)
                        .join("")}
                    </span>
                  )}
                    <div className="min-w-0">
                    <div className="flex items-center gap-1.5">
                      <p className="truncate text-left text-[12.5px] font-bold text-foreground">
                        {row.name}
                      </p>
                      {row.isDraft ? (
                        <span className="shrink-0 rounded bg-secondary px-1 py-0.5 text-[8.5px] font-bold uppercase tracking-wide text-muted-foreground">
                          Draft
                        </span>
                      ) : null}
                    </div>
                    <p className="mt-0.5 truncate text-[10px] text-muted-foreground">
                      {row.breed} • {row.species} •{" "}
                      <span className={genderClass(row.gender)}>{row.gender}</span>
                    </p>
                  </div>
                </div>

                <div className="order-3 col-span-2 min-w-0 sm:col-span-1 xl:order-none">
                  <p className="text-[9px] font-bold uppercase tracking-[0.1em] text-muted-foreground xl:hidden">
                    Owner
                  </p>
                  <p className="truncate text-[11px] font-semibold text-foreground">{row.owner}</p>
                  <p className="num mt-0.5 flex items-center gap-1 truncate text-[9.5px] text-muted-foreground">
                    <Phone className="size-2.5 shrink-0 xl:hidden" />
                    {row.phone}
                  </p>
                </div>

                <div className="order-3 col-span-1 min-w-0 xl:order-none">
                  <p className="text-[9px] font-bold uppercase tracking-[0.1em] text-muted-foreground xl:hidden">
                    Pet ID / QR
                  </p>
                  <p className="num mt-0.5 truncate text-[9px] text-muted-foreground/75">Pet: {row.petId ?? row.id} • QR: {row.qrCode ?? "Not issued"}</p>
                </div>

                <div className="order-3 col-span-1 xl:order-none">
                  <p className="text-[9px] font-bold uppercase tracking-[0.1em] text-muted-foreground xl:hidden">
                    Registered
                  </p>
                  <p className="text-[10.5px] font-medium text-foreground/85">{row.registered}</p>
                </div>

                <div className="order-2 xl:order-none">
                  <StatusPill status={row.status} />
                </div>

                <div onClick={(event) => event.stopPropagation()} className="order-4 col-span-2 flex items-center justify-end gap-1.5 sm:col-span-1 xl:order-none xl:justify-start">
                  {row.status === "pending" ? (
                    <>
                      <Tooltip>
                        <TooltipTrigger asChild>
                          <Button
                            size="icon"
                            onClick={() => beginApproval(row)}
                            className="size-8 rounded-lg bg-primary text-primary-foreground"
                            aria-label={`Approve ${row.name}`}
                          >
                            <Check className="size-3.5" strokeWidth={2.6} />
                          </Button>
                        </TooltipTrigger>
                        <TooltipContent>Issue Pet ID and QR code, then approve</TooltipContent>
                      </Tooltip>
                      <Tooltip>
                        <TooltipTrigger asChild>
                          <Button
                            size="icon"
                            variant="outline"
                            onClick={() => decide(row, "rejected")}
                            className="size-8 rounded-lg border-border text-muted-foreground hover:border-destructive/30 hover:bg-destructive/10 hover:text-destructive"
                            aria-label={`Reject ${row.name}`}
                          >
                            <X className="size-3.5" strokeWidth={2.6} />
                          </Button>
                        </TooltipTrigger>
                        <TooltipContent>Reject registration</TooltipContent>
                      </Tooltip>
                    </>
                  ) : (
                    <span className="text-[10px] font-medium text-muted-foreground">
                      {row.status === "approved" ? "Identifiers issued" : "Awaiting owner"}
                    </span>
                  )}
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
        {pendingCount} registrations await approval
      </p>

      <AddPetDialog
        open={addPetOpen}
        owners={ownerOptions.map((owner) => ({
          id: owner.id,
          email: owner.email,
          name: owner.name,
          phone: owner.phone,
          barangay: owner.barangay,
        }))}
        onOpenChange={setAddPetOpen}
        onCreated={async (registration) => {
          if (!registration.ownerId) {
            toast.error("Select an owner account before creating this pet.");
            return false;
          }
          const { error } = await supabase.from("pets").insert({
            owner_id: registration.ownerId,
            name: registration.name,
            species: registration.species,
            breed: registration.breed,
            age: registration.age || "Not provided",
            sex: registration.gender,
            weight: registration.weight || "",
            color: registration.color || "",
            pet_id: registration.petId || null,
            status: "pending",
          });
          if (error) {
            toast.error(error.message);
            return false;
          }
          setPage(1);
          void queryClient.invalidateQueries({ queryKey: sidebarCountKeys.registrations });
          await loadRegistry();
          toast.success("Pet registration added.");
          return true;
        }}
      />

      <Dialog open={Boolean(issueTarget)} onOpenChange={(open) => { if (!open && !savingApproval) setIssueTarget(null); }}>
        <DialogContent className="rounded-xl border-border bg-card sm:max-w-[480px]">
          <DialogHeader>
            <DialogTitle>Issue QR code and approve</DialogTitle>
            <DialogDescription>
              {issueTarget ? `Review ${issueTarget.name} and issue the QR code when approving the registration.` : "Issue the QR code and approve the registration."}
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-3">
            <div className="space-y-1.5">
              <Label htmlFor="admin-pet-id">Pet ID</Label>
              <Input id="admin-pet-id" value={issuePetId} onChange={(event) => setIssuePetId(event.target.value)} maxLength={40} />
            </div>
            <div className="space-y-1.5">
              <p className="text-[11px] font-semibold text-foreground">QR code preview</p>
              {issuePetId.trim() ? <QRCodeSVG value={issuePetId.trim()} size={100} level="M" marginSize={2} className="rounded bg-white" title="Pet ID QR code preview" /> : null}
              <p className="text-[9px] text-muted-foreground">This QR code is added to the owner's digital Pet ID after approval.</p>
            </div>
            <div className="flex justify-end gap-2 pt-1">
              <Button type="button" variant="outline" disabled={savingApproval} onClick={() => setIssueTarget(null)}>Cancel</Button>
              <Button type="button" onClick={issueQrAndApprove} disabled={!issuePetId.trim() || savingApproval}>
                <Check className="size-4" />{savingApproval ? "Approving..." : "Issue QR & approve"}
              </Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>

      <Dialog open={Boolean(detailTarget)} onOpenChange={(open) => { if (!open) { setDetailTarget(null); setEditingDetails(false); } }}>
        <DialogContent className="max-h-[90vh] overflow-y-auto rounded-xl border-border bg-card sm:max-w-[520px]">
          <DialogHeader>
            <DialogTitle>Pet registration details</DialogTitle>
            <DialogDescription>{editingDetails ? "Update the pet profile details." : "Review the submitted pet and owner information."}</DialogDescription>
          </DialogHeader>
          {detailTarget ? (
            <div className="space-y-4">
              {editingDetails ? (
                <div className="grid grid-cols-2 gap-3">
                  <div className="col-span-2 space-y-1.5">
                    <Label htmlFor="detail-pet-name">Pet name</Label>
                    <Input id="detail-pet-name" value={detailDraft.name} maxLength={80} onChange={(event) => setDetailDraft((current) => ({ ...current, name: event.target.value }))} />
                  </div>
                  <div className="space-y-1.5">
                    <Label htmlFor="detail-pet-species">Species</Label>
                    <select id="detail-pet-species" value={detailDraft.species} onChange={(event) => setDetailDraft((current) => ({ ...current, species: event.target.value as "Dog" | "Cat" }))} className="h-10 w-full rounded-md border border-input bg-background px-3 text-sm">
                      <option value="Dog">Dog</option><option value="Cat">Cat</option>
                    </select>
                  </div>
                  <div className="space-y-1.5">
                    <Label htmlFor="detail-pet-sex">Sex</Label>
                    <select id="detail-pet-sex" value={detailDraft.gender} onChange={(event) => setDetailDraft((current) => ({ ...current, gender: event.target.value as "Male" | "Female" }))} className="h-10 w-full rounded-md border border-input bg-background px-3 text-sm">
                      <option value="Male">Male</option><option value="Female">Female</option>
                    </select>
                  </div>
                  <div className="col-span-2 space-y-1.5">
                    <Label htmlFor="detail-pet-breed">Breed</Label>
                    <Input id="detail-pet-breed" value={detailDraft.breed} maxLength={100} onChange={(event) => setDetailDraft((current) => ({ ...current, breed: event.target.value }))} />
                  </div>
                  <div className="space-y-1.5">
                    <Label htmlFor="detail-pet-age">Age</Label>
                    <Input id="detail-pet-age" value={detailDraft.age} maxLength={40} onChange={(event) => setDetailDraft((current) => ({ ...current, age: event.target.value }))} />
                  </div>
                  <div className="space-y-1.5">
                    <Label htmlFor="detail-pet-weight">Weight</Label>
                    <Input id="detail-pet-weight" value={detailDraft.weight} maxLength={30} onChange={(event) => setDetailDraft((current) => ({ ...current, weight: event.target.value }))} />
                  </div>
                  <div className="col-span-2 space-y-1.5">
                    <Label htmlFor="detail-pet-color">Color / markings</Label>
                    <Input id="detail-pet-color" value={detailDraft.color} maxLength={80} onChange={(event) => setDetailDraft((current) => ({ ...current, color: event.target.value }))} />
                  </div>
                </div>
              ) : (
                <>
                  <div className="flex items-center gap-3">
                    <PetPhoto src={detailTarget.photoUrl ?? undefined} alt={detailTarget.name} species={detailTarget.species} className="size-20 shrink-0 rounded-xl" />
                    <div className="min-w-0">
                      <p className="truncate text-lg font-bold text-foreground">{detailTarget.name}</p>
                      <p className="text-xs text-muted-foreground">{detailTarget.breed} · {detailTarget.species} · {detailTarget.gender}</p>
                      <div className="mt-2"><StatusPill status={detailTarget.status} /></div>
                    </div>
                  </div>
                  <dl className="grid grid-cols-2 gap-2">
                    {[
                      ["Age", detailTarget.age || "Not provided"],
                      ["Weight", detailTarget.weight || "Not provided"],
                      ["Color / markings", detailTarget.color || "Not provided"],
                      ["Owner", detailTarget.owner],
                      ["Contact", detailTarget.phone],
                      ["Submitted", detailTarget.registered],
                      ["Pet ID", detailTarget.petId || "Assigned on approval"],
                    ].map(([label, value]) => (
                      <div key={label} className="min-w-0 rounded-lg bg-secondary/60 p-2.5">
                        <dt className="text-[9px] font-bold uppercase text-muted-foreground">{label}</dt>
                        <dd className="mt-1 break-words text-[11px] font-semibold text-foreground">{value}</dd>
                      </div>
                    ))}
                  </dl>
                  <div className="flex items-center justify-between gap-3 rounded-xl border border-border bg-card p-3">
                    <div className="min-w-0">
                      <p className="text-[9px] font-bold uppercase text-muted-foreground">QR code</p>
                      <p className="mt-1 break-all text-[10px] font-semibold text-foreground">{detailTarget.qrCode || "Available after approval"}</p>
                    </div>
                    {detailTarget.qrCode ? <QRCodeSVG value={detailTarget.qrCode} size={88} level="M" marginSize={1} className="shrink-0 rounded bg-white p-1" title={`QR code for ${detailTarget.petId ?? detailTarget.name}`} /> : null}
                  </div>
                  <PetVaccinationRecords key={detailTarget.id} petId={detailTarget.id} />
                </>
              )}
              {editingDetails ? (
                <div className="flex gap-2">
                  <Button variant="outline" className="flex-1" onClick={() => setEditingDetails(false)}>Cancel</Button>
                  <Button className="flex-1" disabled={savingDetails} onClick={() => void saveRegistrationDetails()}>{savingDetails ? "Saving…" : "Save profile"}</Button>
                </div>
              ) : (
                <Button variant="outline" className="w-full" onClick={() => setEditingDetails(true)}>
                  <Pencil className="size-4" />Edit profile
                </Button>
              )}
              {detailTarget.status === "pending" ? (
                !editingDetails ? <Button className="w-full" onClick={() => { beginApproval(detailTarget); setDetailTarget(null); }}>
                  <Check className="size-4" />Issue QR code and approve
                </Button> : null
              ) : null}
            </div>
          ) : null}
        </DialogContent>
      </Dialog>
    </AppShell>
  );
};

export default Registrations;
