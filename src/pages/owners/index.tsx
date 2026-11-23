import { useCallback, useEffect, useMemo, useState } from "react";
import { useNavigate } from "react-router-dom";
import {
  CalendarDays,
  Check,
  Mail,
  MapPin,
  PawPrint,
  Pencil,
  Phone,
  Plus,
  RefreshCw,
  Search,
  SlidersHorizontal,
  UserCheck,
  Users,
  X,
} from "lucide-react";
import { toast } from "sonner";
import { AppShell } from "@/components/veticare/app-shell";
import { PageHeader } from "@/components/admin/page-header";
import { MetricStrip } from "@/components/admin/metric-strip";
import { FilterSelect } from "@/components/admin/filter-select";
import { StatusPill } from "@/components/admin/status-pill";
import { Pagination } from "@/components/admin/pagination";
import { PetPhoto } from "@/components/owner-app/pet-photo";
import { Button } from "@/components/ui/button";
import { Checkbox } from "@/components/ui/checkbox";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { BarangaySelect } from "@/components/owner-app/barangay-select";
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
import { type OwnerRecord } from "@/data/admin-records";
import { supabase } from "@/integrations/supabase/client";

const PAGE_SIZE = 5;

interface OwnerPetProfile {
  id: string;
  owner_id: string;
  name: string;
  species: string;
  breed: string;
  age: string;
  sex: string;
  photo_url: string | null;
  pet_id: string | null;
  rfid_tag: string | null;
  status: string;
}

const initials = (name: string) =>
  name
    .split(" ")
    .map((part) => part[0])
    .slice(0, 2)
    .join("");

const Owners = () => {
  const navigate = useNavigate();
  const [ownerRows, setOwnerRows] = useState<OwnerRecord[]>([]);
  const [petsByOwner, setPetsByOwner] = useState<Map<string, OwnerPetProfile[]>>(new Map());
  const [loading, setLoading] = useState(true);
  const [loadError, setLoadError] = useState<string | null>(null);
  const [query, setQuery] = useState("");
  const [barangay, setBarangay] = useState("all");
  const [status, setStatus] = useState("all");
  const [needsAttention, setNeedsAttention] = useState(false);
  const [multiPet, setMultiPet] = useState(false);
  const [showFilters, setShowFilters] = useState(false);
  const [page, setPage] = useState(1);
  const [selected, setSelected] = useState<OwnerRecord | null>(null);
  const [editing, setEditing] = useState(false);
  const [updatingOwnerId, setUpdatingOwnerId] = useState<string | null>(null);
  const [draft, setDraft] = useState({ name: "", phone: "", address: "", barangay: "", status: "pending" as "pending" | "approved" | "rejected" });

  const loadOwners = useCallback(async () => {
    setLoading(true);
    setLoadError(null);
    const [{ data: profiles, error: profilesError }, { data: petRows, error: petsError }] = await Promise.all([
      supabase
        .from("profiles")
        .select("id, email, full_name, phone, address, barangay, approval_status, created_at")
        .eq("role", "owner")
        .order("created_at", { ascending: false }),
      supabase.from("pets").select("id, owner_id, name, species, breed, age, sex, photo_url, pet_id, rfid_tag, status"),
    ]);

    if (profilesError) {
      const message = profilesError.message || "Unable to load owner profiles.";
      setLoadError(message);
      toast.error(message);
      setLoading(false);
      return;
    }

    if (petsError) toast.warning("Owner profiles loaded, but pet profiles are unavailable.");

    const petCounts = new Map<string, number>();
    const groupedPets = new Map<string, OwnerPetProfile[]>();
    for (const pet of petRows ?? []) {
      petCounts.set(pet.owner_id, (petCounts.get(pet.owner_id) ?? 0) + 1);
      const ownerPets = groupedPets.get(pet.owner_id) ?? [];
      ownerPets.push(pet as OwnerPetProfile);
      groupedPets.set(pet.owner_id, ownerPets);
    }
    setPetsByOwner(groupedPets);
    setOwnerRows((profiles ?? []).map((profile) => ({
      id: profile.id,
      name: profile.full_name || "Owner name not provided",
      phone: profile.phone || "—",
      email: profile.email || "—",
      address: profile.address || "—",
      barangay: profile.barangay || "—",
      pets: petCounts.get(profile.id) ?? 0,
      registered: new Date(profile.created_at).toLocaleDateString(undefined, { month: "short", year: "numeric" }),
      registeredAt: profile.created_at.slice(0, 10),
      status: profile.approval_status === "approved" ? "active" : profile.approval_status,
    })));
    setLoading(false);
  }, []);

  useEffect(() => {
    void loadOwners();
  }, [loadOwners]);

  const filtered = useMemo(() => {
    const search = query.trim().toLowerCase();
    return ownerRows.filter((owner) => {
      const matchesQuery =
        search.length === 0 ||
        `${owner.name} ${owner.phone} ${owner.email} ${owner.address} ${owner.id}`
          .toLowerCase()
          .includes(search);
      const matchesBarangay = barangay === "all" || owner.barangay === barangay;
      const matchesStatus = status === "all" || owner.status === status;
      const matchesAttention = !needsAttention || owner.status === "inactive" || owner.status === "pending" || owner.status === "rejected";
      const matchesPets = !multiPet || owner.pets > 1;
      return matchesQuery && matchesBarangay && matchesStatus && matchesAttention && matchesPets;
    });
  }, [ownerRows, query, barangay, status, needsAttention, multiPet]);

  const pageCount = Math.max(1, Math.ceil(filtered.length / PAGE_SIZE));
  const safePage = Math.min(page, pageCount);
  const start = (safePage - 1) * PAGE_SIZE;
  const visible = filtered.slice(start, start + PAGE_SIZE);

  const resetPage = <T,>(setter: (value: T) => void) => (value: T) => {
    setter(value);
    setPage(1);
  };

  const updateOwnerStatus = async (owner: OwnerRecord, next: "approved" | "rejected") => {
    if (updatingOwnerId) return;
    setUpdatingOwnerId(owner.id);
    const { data, error } = await supabase.from("profiles")
      .update({ approval_status: next })
      .eq("id", owner.id)
      .eq("role", "owner")
      .eq("approval_status", "pending")
      .select("id")
      .maybeSingle();
    setUpdatingOwnerId(null);
    if (error) {
      toast.error(error.message);
      return;
    }
    if (!data) {
      toast.error("Owner could not be updated. Refresh the list and check the approval status.");
      return;
    }
    const statusValue = next === "approved" ? "active" : "rejected";
    setOwnerRows((current) => current.map((item) => item.id === owner.id ? { ...item, status: statusValue } : item));
    setSelected((current) => current?.id === owner.id ? { ...current, status: statusValue } : current);
    toast.success(next === "approved" ? `${owner.name} approved.` : `${owner.name} rejected.`);
  };

  const saveOwnerDraft = async () => {
    if (!selected) return;
    if (!draft.barangay.trim()) {
      toast.error("Select a barangay in Batangas City.");
      return;
    }
    const { error } = await supabase.from("profiles")
      .update({
        full_name: draft.name.trim(),
        phone: draft.phone.trim(),
        address: draft.address.trim(),
        barangay: draft.barangay.trim(),
        approval_status: draft.status,
      })
      .eq("id", selected.id)
      .eq("role", "owner");
    if (error) {
      toast.error(error.message);
      return;
    }
    const updated = {
      ...selected,
      name: draft.name.trim(),
      phone: draft.phone.trim(),
      address: draft.address.trim(),
      barangay: draft.barangay.trim(),
      status: draft.status === "approved" ? "active" as const : draft.status,
    };
    setOwnerRows((current) => current.map((item) => item.id === selected.id ? updated : item));
    setSelected(updated);
    setEditing(false);
    toast.success("Owner profile updated.");
  };

  const refresh = () => {
    void loadOwners();
    setQuery("");
    setBarangay("all");
    setStatus("all");
    setNeedsAttention(false);
    setMultiPet(false);
    setPage(1);
    toast.success("Owner directory refreshed.");
  };

  const metrics = [
    {
      label: "Total owners",
      value: ownerRows.length,
      hint: "All households",
      icon: Users,
      tone: "primary" as const,
    },
    {
      label: "Active contacts",
      value: ownerRows.filter((owner) => owner.status === "active").length,
      hint: "Reachable now",
      icon: UserCheck,
      tone: "info" as const,
    },
    {
      label: "Registered pets",
      value: ownerRows.reduce((sum, owner) => sum + owner.pets, 0),
      hint: "Linked to owners",
      icon: PawPrint,
      tone: "warning" as const,
    },
    {
      label: "Barangays covered",
      value: new Set(ownerRows.map((owner) => owner.barangay).filter((value) => value !== "—")).size,
      hint: "City-wide",
      icon: MapPin,
      tone: "neutral" as const,
    },
  ];

  return (
    <AppShell>
      <PageHeader
        eyebrow="Operations"
        title="Owners"
        description="Manage pet owner records, keep contact details current and see every household linked to the registry."
        actions={
          <Button
            variant={status === "pending" ? "default" : "outline"}
            onClick={() => {
              setStatus((current) => current === "pending" ? "all" : "pending");
              setPage(1);
            }}
            className="h-9 rounded-xl px-3.5 text-[12px] font-bold"
          >
            <UserCheck className="size-4" />
            Review pending ({ownerRows.filter((owner) => owner.status === "pending").length})
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
              placeholder="Search owners or contacts…"
              aria-label="Search owners"
              className="h-9 rounded-xl border-border bg-background pl-9 text-[12px] focus-visible:ring-2 focus-visible:ring-primary/20 focus-visible:ring-offset-0"
            />
          </div>

          <div className="grid grid-cols-2 items-center gap-2 sm:flex sm:flex-wrap sm:gap-2.5">
            <FilterSelect
              label="Barangay"
              value={barangay}
              onChange={resetPage(setBarangay)}
              options={[
                { value: "all", label: "All" },
                ...Array.from(new Set(ownerRows.map((owner) => owner.barangay).filter((value) => value !== "—")))
                  .sort()
                  .map((item) => ({ value: item, label: item })),
              ]}
            />
            <FilterSelect
              label="Status"
              value={status}
              onChange={resetPage(setStatus)}
              options={[
                { value: "all", label: "All" },
                { value: "active", label: "Active" },
                { value: "inactive", label: "Inactive" },
                { value: "pending", label: "Pending review" },
                { value: "rejected", label: "Rejected" },
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
                <TooltipContent>Clear filters and reload the directory</TooltipContent>
              </Tooltip>
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
                id: "attention",
                label: "Needs follow-up",
                checked: needsAttention,
                onChange: (value: boolean) => {
                  setNeedsAttention(value);
                  setPage(1);
                },
              },
              {
                id: "multi",
                label: "Multiple pets",
                checked: multiPet,
                onChange: (value: boolean) => {
                  setMultiPet(value);
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
              {filtered.length} of {ownerRows.length} owners
            </span>
          </div>
        ) : null}

        <div className="hidden border-y border-border bg-secondary/40 px-5 py-2 xl:grid xl:grid-cols-[minmax(0,1.4fr)_minmax(0,0.95fr)_minmax(0,1.35fr)_48px_88px_84px_132px] xl:gap-4">
          {["Owner", "Contact", "Address", "Pets", "Registered", "Status", "Action"].map((label) => (
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
              <Users className="size-5" />
            </span>
            <p className="text-[13px] font-bold text-foreground">
              {loading ? "Loading owners…" : loadError ? "Owner profiles unavailable" : "No owners match"}
            </p>
            <p className="max-w-[260px] text-[11.5px] text-muted-foreground">
              {loadError ?? (loading ? "Loading verified owner accounts from Supabase." : "Try another barangay or clear the filters to see every household.")}
            </p>
            <Button
              variant="outline"
              size="sm"
              onClick={refresh}
              className="mt-1 h-8 rounded-lg text-[11px] font-semibold"
            >
              Clear filters
            </Button>
          </div>
        ) : (
          <ul className="divide-y divide-border border-b border-border">
            {visible.map((owner) => (
              <li
                key={owner.id}
                role="button"
                tabIndex={0}
                aria-label={`View owner record for ${owner.name}`}
                onClick={() => setSelected(owner)}
                onKeyDown={(event) => {
                  if (event.target !== event.currentTarget) return;
                  if (event.key === "Enter" || event.key === " ") {
                    event.preventDefault();
                    setSelected(owner);
                  }
                }}
                className="grid cursor-pointer grid-cols-[minmax(0,1fr)_auto] items-center gap-x-3 gap-y-2.5 px-3.5 py-3.5 transition-colors hover:bg-secondary/40 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-inset focus-visible:ring-primary sm:px-4 xl:grid-cols-[minmax(0,1.4fr)_minmax(0,0.95fr)_minmax(0,1.35fr)_48px_88px_84px_132px] xl:gap-4 xl:px-5"
              >
                <div className="order-1 flex min-w-0 items-center gap-2.5 xl:order-none">
                  <span className="grid size-9 shrink-0 place-items-center rounded-xl bg-primary-soft text-[11px] font-bold text-primary">
                    {initials(owner.name)}
                  </span>
                  <div className="min-w-0">
                    <p className="truncate text-[12.5px] font-bold text-foreground">
                      {owner.name}
                    </p>
                    <p className="truncate text-[10px] text-muted-foreground">{owner.email}</p>
                    <p className="num mt-0.5 text-[9px] text-muted-foreground/70 xl:hidden">
                      {owner.id} • {owner.barangay}
                    </p>
                  </div>
                </div>

                <div className="order-3 col-span-2 flex min-w-0 items-center gap-1.5 xl:order-none xl:col-span-1">
                  <Phone className="size-3 shrink-0 text-muted-foreground/70 xl:hidden" />
                  <p className="num truncate text-[10.5px] text-foreground/85">{owner.phone}</p>
                </div>

                <div className="order-3 col-span-2 flex min-w-0 items-center gap-1.5 xl:order-none xl:col-span-1">
                  <MapPin className="size-3 shrink-0 text-muted-foreground/70 xl:hidden" />
                  <p className="text-[10.5px] leading-snug text-foreground/85">{owner.address}</p>
                </div>

                <div className="order-3 xl:order-none">
                  <span className="flex items-center gap-1 text-[10.5px] text-foreground/85">
                    <PawPrint className="size-2.5 text-muted-foreground xl:hidden" />
                    {owner.pets} {owner.pets === 1 ? "pet" : "pets"}
                  </span>
                </div>

                <div className="order-3 xl:order-none">
                  <span className="flex items-center gap-1 text-[10.5px] text-foreground/85">
                    <CalendarDays className="size-2.5 text-muted-foreground xl:hidden" />
                    {owner.registered}
                  </span>
                </div>

                <div className="order-2 xl:order-none">
                  <StatusPill status={owner.status} />
                </div>

                <div onClick={(event) => event.stopPropagation()} className="order-4 col-span-2 flex items-center justify-end gap-1 xl:order-none xl:col-span-1 xl:justify-start">
                  {owner.status === "pending" ? (
                    <>
                      <Tooltip>
                        <TooltipTrigger asChild>
                          <Button
                            size="icon"
                            disabled={Boolean(updatingOwnerId)}
                            onClick={() => updateOwnerStatus(owner, "approved")}
                            className="size-7 rounded-lg bg-success text-success-foreground"
                            aria-label={`Approve ${owner.name}`}
                          >
                            <Check className="size-3.5" />
                          </Button>
                        </TooltipTrigger>
                        <TooltipContent>Approve owner</TooltipContent>
                      </Tooltip>
                      <Tooltip>
                        <TooltipTrigger asChild>
                          <Button
                            size="icon"
                            variant="outline"
                            disabled={Boolean(updatingOwnerId)}
                            onClick={() => updateOwnerStatus(owner, "rejected")}
                            className="size-7 rounded-lg border-border text-destructive"
                            aria-label={`Reject ${owner.name}`}
                          >
                            <X className="size-3.5" />
                          </Button>
                        </TooltipTrigger>
                        <TooltipContent>Reject owner</TooltipContent>
                      </Tooltip>
                    </>
                  ) : null}
                  {owner.status === "active" ? (
                    <Tooltip>
                      <TooltipTrigger asChild>
                        <Button
                          type="button"
                          size="icon"
                          variant="outline"
                          onClick={() => navigate("/registrations")}
                          className="size-7 rounded-lg border-border text-muted-foreground hover:border-primary/30 hover:text-primary"
                          aria-label={`Register a pet for ${owner.name}`}
                        >
                          <Plus className="size-3.5" />
                        </Button>
                      </TooltipTrigger>
                      <TooltipContent>Register a pet</TooltipContent>
                    </Tooltip>
                  ) : null}
                  <Tooltip>
                    <TooltipTrigger asChild>
                      <Button
                        size="icon"
                        variant="outline"
                        onClick={() => {
                          setSelected(owner);
                          setDraft({ name: owner.name, phone: owner.phone, address: owner.address, barangay: owner.barangay, status: owner.status === "active" ? "approved" : owner.status });
                          setEditing(true);
                        }}
                        className="size-7 rounded-lg border-border text-muted-foreground hover:border-primary/30 hover:text-primary"
                        aria-label={`Edit ${owner.name}`}
                      >
                        <Pencil className="size-3.5" />
                      </Button>
                    </TooltipTrigger>
                    <TooltipContent>Edit owner</TooltipContent>
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
          Preview dataset
        </span>
        {ownerRows.filter((owner) => owner.status === "inactive" || owner.status === "pending" || owner.status === "rejected").length} owners need review •
        changes reset when you refresh
      </p>

      <Dialog
        open={Boolean(selected)}
        onOpenChange={(open) => {
          if (!open) {
            setSelected(null);
            setEditing(false);
          }
        }}
      >
        <DialogContent className="max-h-[min(88dvh,720px)] w-[calc(100%-2rem)] max-w-[480px] grid-cols-[minmax(0,1fr)] overflow-x-hidden overflow-y-auto rounded-2xl border-border p-4 sm:rounded-2xl sm:p-5">
          {selected ? (
            <>
              <DialogHeader className="pr-6 text-left">
                <div className="flex items-center gap-3">
                  <span className="grid size-11 shrink-0 place-items-center rounded-xl bg-primary-soft text-[12px] font-bold text-primary">
                    {initials(selected.name)}
                  </span>
                  <div className="min-w-0 flex-1">
                    <DialogTitle className="break-words text-[16px] font-extrabold tracking-[-0.02em]">
                      {selected.name}
                    </DialogTitle>
                    <DialogDescription className="num break-all text-[11px]">
                      {selected.id} • Member since {selected.registered}
                    </DialogDescription>
                  </div>
                </div>
              </DialogHeader>

              <div className="space-y-3">
                <div className="flex flex-wrap items-center gap-2">
                  <StatusPill status={selected.status} />
                  <span className="rounded-full bg-secondary px-2 py-1 text-[10px] font-semibold text-secondary-foreground">
                    {selected.pets} {selected.pets === 1 ? "registered pet" : "registered pets"}
                  </span>
                </div>

                {!editing ? (
                  <section className="space-y-2">
                    <div className="flex items-center justify-between">
                      <h3 className="text-[10px] font-bold uppercase tracking-[0.12em] text-muted-foreground">Pet profiles</h3>
                      <span className="text-[10px] font-semibold text-muted-foreground">{petsByOwner.get(selected.id)?.length ?? 0}</span>
                    </div>
                    {(petsByOwner.get(selected.id)?.length ?? 0) > 0 ? (
                      <ul className="divide-y divide-border rounded-xl border border-border bg-card">
                        {petsByOwner.get(selected.id)?.map((pet) => (
                          <li key={pet.id} className="flex min-w-0 items-center gap-2.5 p-2.5">
                            <PetPhoto src={pet.photo_url ?? undefined} alt={pet.name} species={pet.species === "Cat" ? "Cat" : "Dog"} className="size-11 shrink-0 rounded-lg" />
                            <div className="min-w-0 flex-1">
                              <div className="flex flex-wrap items-center gap-1.5">
                                <p className="truncate text-[11.5px] font-bold text-foreground">{pet.name}</p>
                                <StatusPill status={pet.status === "approved" ? "approved" : pet.status === "rejected" ? "rejected" : "pending"} />
                              </div>
                              <p className="truncate text-[9.5px] text-muted-foreground">{pet.breed} · {pet.species} · {pet.sex} · {pet.age}</p>
                              <p className="num mt-0.5 truncate text-[9px] text-muted-foreground">
                                Pet ID: {pet.pet_id ?? "Pending"} · RFID: {pet.rfid_tag ?? "Not assigned"}
                              </p>
                            </div>
                          </li>
                        ))}
                      </ul>
                    ) : (
                      <p className="rounded-xl border border-dashed border-border px-3 py-4 text-center text-[10px] text-muted-foreground">No pet profiles linked to this owner yet.</p>
                    )}
                  </section>
                ) : null}

                {editing ? (
                  <div className="space-y-3 rounded-xl border border-border bg-card p-3.5">
                    <div className="space-y-1.5">
                      <Label htmlFor="edit-owner-name">Full name</Label>
                      <Input id="edit-owner-name" value={draft.name} onChange={(event) => setDraft((current) => ({ ...current, name: event.target.value }))} />
                    </div>
                    <div className="space-y-1.5">
                      <Label htmlFor="edit-owner-phone">Mobile</Label>
                      <Input id="edit-owner-phone" value={draft.phone} onChange={(event) => setDraft((current) => ({ ...current, phone: event.target.value }))} />
                    </div>
                    <div className="space-y-1.5">
                      <Label htmlFor="edit-owner-address">Address</Label>
                      <Input id="edit-owner-address" value={draft.address} onChange={(event) => setDraft((current) => ({ ...current, address: event.target.value }))} />
                    </div>
                    <div className="space-y-1.5">
                      <Label htmlFor="edit-owner-barangay">Barangay</Label>
                      <BarangaySelect id="edit-owner-barangay" value={draft.barangay} onValueChange={(value) => setDraft((current) => ({ ...current, barangay: value }))} required />
                    </div>
                    <div className="space-y-1.5">
                      <Label htmlFor="edit-owner-approval">Review status</Label>
                      <select id="edit-owner-approval" value={draft.status} onChange={(event) => setDraft((current) => ({ ...current, status: event.target.value as "pending" | "approved" | "rejected" }))} className="h-9 w-full rounded-md border border-input bg-background px-3 text-sm">
                        <option value="pending">Pending review</option>
                        <option value="approved">Approved</option>
                        <option value="rejected">Rejected</option>
                      </select>
                    </div>
                    <div className="flex justify-end gap-2">
                      <Button type="button" variant="outline" onClick={() => setEditing(false)}>Cancel</Button>
                      <Button type="button" onClick={saveOwnerDraft}>Save changes</Button>
                    </div>
                  </div>
                ) : (
                  <div className="divide-y divide-border rounded-2xl border border-border bg-card">
                    {[
                      { label: "Mobile", value: selected.phone, icon: Phone },
                      { label: "Email", value: selected.email, icon: Mail },
                      { label: "Address", value: selected.address, icon: MapPin },
                      { label: "Barangay", value: selected.barangay, icon: MapPin },
                    ].map((item) => {
                      const Icon = item.icon;
                      return (
                        <div key={item.label} className="flex items-center gap-2.5 px-3.5 py-3">
                          <span className="grid size-7 place-items-center rounded-lg bg-secondary text-muted-foreground">
                            <Icon className="size-3.5" />
                          </span>
                          <div className="min-w-0">
                            <p className="text-[9px] font-bold uppercase tracking-[0.1em] text-muted-foreground">{item.label}</p>
                            <p className="num truncate text-[11px] font-semibold text-foreground">{item.value}</p>
                          </div>
                        </div>
                      );
                    })}
                  </div>
                )}

                <div className="flex flex-col gap-2">
                  {!editing && selected.status === "pending" ? (
                    <Button type="button" disabled={Boolean(updatingOwnerId)} onClick={() => void updateOwnerStatus(selected, "approved")} className="h-10 w-full rounded-xl text-[12px] font-bold shadow-glow">
                      <Check className="size-4" />{updatingOwnerId === selected.id ? "Approving..." : "Approve owner"}
                    </Button>
                  ) : null}
                  {!editing ? (
                    <Button type="button" onClick={() => navigate("/registrations")} className="h-10 w-full rounded-xl text-[12px] font-bold shadow-glow">
                      <Plus className="size-4" />Register a pet for {selected.name.split(" ")[0]}
                    </Button>
                  ) : null}
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
    </AppShell>
  );
};

export default Owners;
