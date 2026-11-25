import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { FunctionsFetchError, FunctionsHttpError } from "@supabase/supabase-js";
import { useNavigate } from "react-router-dom";
import {
  CalendarDays,
  ChevronLeft,
  ChevronRight,
  KeyRound,
  Mail,
  MapPin,
  MoreVertical,
  PawPrint,
  Pencil,
  Phone,
  Plus,
  RefreshCw,
  Search,
  SlidersHorizontal,
  Trash2,
  UserCheck,
  Users,
} from "lucide-react";
import { toast } from "sonner";
import { AppShell } from "@/components/veticare/app-shell";
import { PageHeader } from "@/components/admin/page-header";
import { AdminOwnerAvatar } from "@/components/admin/owner-avatar";
import { MetricStrip } from "@/components/admin/metric-strip";
import { FilterSelect } from "@/components/admin/filter-select";
import { StatusPill } from "@/components/admin/status-pill";
import { Pagination } from "@/components/admin/pagination";
import { PetProfileDetails } from "@/components/admin/pet-profile-details";
import { PetPhoto } from "@/components/owner-app/pet-photo";
import { Button } from "@/components/ui/button";
import { Checkbox } from "@/components/ui/checkbox";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { ScrollArea } from "@/components/ui/scroll-area";
import { BarangaySelect } from "@/components/owner-app/barangay-select";
import {
  Dialog,
  DialogClose,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import {
  AlertDialog,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import {
  Tooltip,
  TooltipContent,
  TooltipTrigger,
} from "@/components/ui/tooltip";
import { cn } from "@/lib/utils";
import { type OwnerRecord } from "@/data/admin-records";
import { supabase } from "@/integrations/supabase/client";
import type { Tables } from "@/integrations/supabase/types";
import { ImpoundClaimBadge } from "@/components/veticare/impound-claim-badge";

const PAGE_SIZE = 5;
type OwnerAccountAction = "reset-owner-password" | "delete-owner-account";

const Owners = () => {
  const navigate = useNavigate();
  const [ownerRows, setOwnerRows] = useState<OwnerRecord[]>([]);
  const [petsByOwner, setPetsByOwner] = useState<Map<string, Tables<"pets">[]>>(new Map());
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
  const [accountAction, setAccountAction] = useState<{ type: OwnerAccountAction; owner: OwnerRecord } | null>(null);
  const [accountActionBusy, setAccountActionBusy] = useState(false);
  const [accountActionError, setAccountActionError] = useState<string | null>(null);
  const accountActionLock = useRef(false);
  const accountMenuRef = useRef<HTMLButtonElement>(null);
  const ownerLoadVersion = useRef(0);
  const [editing, setEditing] = useState(false);
  const [draft, setDraft] = useState({ name: "", phone: "", address: "", barangay: "" });

  const loadOwners = useCallback(async () => {
    const version = ++ownerLoadVersion.current;
    setLoading(true);
    setLoadError(null);
    const [{ data: profiles, error: profilesError }, { data: petRows, error: petsError }] = await Promise.all([
      supabase
        .from("profiles")
        .select("id, email, full_name, phone, address, barangay, approval_status, created_at")
        .eq("role", "owner")
        .is("account_deleted_at", null)
        .order("created_at", { ascending: false }),
      supabase.from("pets").select("*"),
    ]);
    if (version !== ownerLoadVersion.current) return;

    if (profilesError) {
      const message = profilesError.message || "Unable to load owner profiles.";
      setLoadError(message);
      toast.error(message);
      setLoading(false);
      return;
    }

    if (petsError) toast.warning("Owner profiles loaded, but pet profiles are unavailable.");

    const petCounts = new Map<string, number>();
    const groupedPets = new Map<string, Tables<"pets">[]>();
    for (const pet of petRows ?? []) {
      petCounts.set(pet.owner_id, (petCounts.get(pet.owner_id) ?? 0) + 1);
      const ownerPets = groupedPets.get(pet.owner_id) ?? [];
      ownerPets.push(pet);
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
      const matchesAttention = !needsAttention || owner.status === "inactive" || owner.status === "rejected";
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
    };
    setOwnerRows((current) => current.map((item) => item.id === selected.id ? updated : item));
    setSelected(updated);
    setEditing(false);
    toast.success("Owner profile updated.");
  };

  const openAccountConfirmation = (type: OwnerAccountAction, owner: OwnerRecord) => {
    setAccountActionError(null);
    setAccountAction({ type, owner });
  };

  const confirmAccountAction = async () => {
    if (!accountAction || accountActionLock.current) return;
    const { type, owner } = accountAction;
    accountActionLock.current = true;
    setAccountActionBusy(true);
    setAccountActionError(null);
    try {
      const { data, error } = await supabase.functions.invoke<{ success: boolean; email?: string }>("admin-users", {
        body: { action: type, userId: owner.id },
      });
      if (error) {
        if (error instanceof FunctionsFetchError) {
          throw new Error("The owner account service could not be reached. Check that the admin-users Edge Function is deployed and reachable.");
        }
        const details = error instanceof FunctionsHttpError ? await error.context.json().catch(() => null) : null;
        throw new Error(typeof details?.error === "string" ? details.error : error.message);
      }
      if (!data?.success) throw new Error("The server did not confirm this action.");

      setAccountAction(null);
      if (type === "delete-owner-account") {
        setOwnerRows((current) => current.filter((item) => item.id !== owner.id));
        setSelected(null);
        setEditing(false);
        toast.success(`${owner.name}'s account was deleted.`);
        void loadOwners();
      } else {
        toast.success(data.email ? `Password reset link sent to ${data.email}.` : "Password reset link sent.");
      }
    } catch (error) {
      setAccountActionError(error instanceof Error ? error.message : "Unable to complete this action.");
    } finally {
      accountActionLock.current = false;
      setAccountActionBusy(false);
    }
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
              {loadError ?? (loading ? "Loading owner accounts." : "Try another barangay or clear the filters to see every household.")}
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
                  <AdminOwnerAvatar ownerId={owner.id} name={owner.name} className="size-9 rounded-xl bg-primary-soft text-[11px] text-primary" />
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
                          setDraft({ name: owner.name, phone: owner.phone, address: owner.address, barangay: owner.barangay });
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

      <Dialog
        open={Boolean(selected)}
        onOpenChange={(open) => {
          if (!open) {
            setSelected(null);
            setEditing(false);
          }
        }}
      >
        <DialogContent showCloseButton={false} className="max-h-[min(88dvh,720px)] w-[calc(100%-2rem)] max-w-[480px] grid-cols-[minmax(0,1fr)] overflow-x-hidden overflow-y-auto rounded-2xl border-border p-4 sm:rounded-2xl sm:p-5">
          {selected ? (
            <>
              <DialogHeader className="pr-9 text-left">
                <div className="flex items-center gap-3">
                  <AdminOwnerAvatar ownerId={selected.id} name={selected.name} className="size-11 rounded-xl bg-primary-soft text-primary" />
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
              <DropdownMenu modal={false}>
                <DropdownMenuTrigger asChild>
                  <Button ref={accountMenuRef} type="button" variant="ghost" size="icon" className="absolute right-3 top-3 size-8 rounded-lg" aria-label="Owner account actions">
                    <MoreVertical className="size-4" />
                  </Button>
                </DropdownMenuTrigger>
                <DropdownMenuContent align="end" className="w-44 rounded-xl" onCloseAutoFocus={(event) => {
                  if (accountAction) event.preventDefault();
                }}>
                  <DropdownMenuItem onSelect={() => openAccountConfirmation("reset-owner-password", selected)} className="gap-2">
                    <KeyRound className="size-4" />Reset password
                  </DropdownMenuItem>
                  <DropdownMenuItem onSelect={() => openAccountConfirmation("delete-owner-account", selected)} className="gap-2 text-destructive focus:bg-destructive/10 focus:text-destructive">
                    <Trash2 className="size-4" />Delete account
                  </DropdownMenuItem>
                </DropdownMenuContent>
              </DropdownMenu>

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
                        {petsByOwner.get(selected.id)?.map((pet) => {
                          const species = pet.species === "Cat" ? "Cat" : "Dog";
                          const petStatus = pet.status === "approved" || pet.status === "rejected" ? pet.status : "pending";
                          return (
                            <li key={pet.id} className="relative flex min-w-0 items-center gap-2.5 rounded-lg p-2.5 hover:bg-secondary/50">
                              <PetPhoto src={pet.photo_url ?? undefined} alt={pet.name} species={species} className="size-11 shrink-0 rounded-lg" />
                              <div className="min-w-0 flex-1">
                                <div className="flex flex-wrap items-center gap-1.5">
                                  <p className="truncate text-[11.5px] font-bold text-foreground">{pet.name}</p>
                                  <StatusPill status={petStatus} />
                                  {pet.impound_claimed_at ? <ImpoundClaimBadge /> : null}
                                </div>
                                <p className="truncate text-[9.5px] text-muted-foreground">{pet.breed} · {pet.species} · {pet.sex} · {pet.age}</p>
                                <p className="num mt-0.5 truncate text-[9px] text-muted-foreground">
                                  Pet ID: {pet.pet_id ?? "Pending"}
                                </p>
                              </div>
                              <ChevronRight aria-hidden="true" className="size-4 shrink-0 text-muted-foreground" />
                              <Dialog>
                                <DialogTrigger asChild>
                                  <button type="button" aria-label={`View ${pet.name}'s pet profile`} className="absolute inset-0 cursor-pointer rounded-lg focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-inset focus-visible:ring-ring" />
                                </DialogTrigger>
                                <DialogContent className="max-h-[90dvh] w-[calc(100%-2rem)] grid-cols-[minmax(0,1fr)] grid-rows-[auto_minmax(0,1fr)] gap-0 overflow-hidden rounded-xl border-border bg-card p-0 sm:max-w-[520px]">
                                  <DialogHeader className="px-6 pb-4 pt-5 pr-12 text-left">
                                    <DialogClose asChild>
                                      <Button type="button" size="sm" variant="ghost" className="w-fit px-1">
                                        <ChevronLeft className="size-4" />Back to owner
                                      </Button>
                                    </DialogClose>
                                    <DialogTitle>Pet profile</DialogTitle>
                                    <DialogDescription>Pet registration and vaccination history.</DialogDescription>
                                  </DialogHeader>
                                  <ScrollArea type="hover" className="min-h-0">
                                    <div tabIndex={0} role="region" aria-label="Pet profile information" className="space-y-4 px-6 pb-6 pt-1 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-inset focus-visible:ring-ring">
                                      <PetProfileDetails pet={{
                                        id: pet.id,
                                        name: pet.name,
                                        species,
                                        breed: pet.breed,
                                        gender: pet.sex === "Female" ? "Female" : "Male",
                                        age: pet.age,
                                        weight: pet.weight,
                                        color: pet.color,
                                        photoUrl: pet.photo_url,
                                        status: petStatus,
                                        impoundClaimed: Boolean(pet.impound_claimed_at),
                                        owner: selected.name,
                                        phone: selected.phone,
                                        registered: new Date(pet.created_at).toLocaleDateString(undefined, { month: "short", day: "numeric", year: "numeric" }),
                                        petId: pet.pet_id,
                                        qrCode: pet.qr_code,
                                      }} />
                                    </div>
                                  </ScrollArea>
                                </DialogContent>
                              </Dialog>
                            </li>
                          );
                        })}
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
                  {!editing ? (
                    <Button type="button" onClick={() => navigate("/registrations")} className="h-10 w-full rounded-xl text-[12px] font-bold shadow-glow">
                      <Plus className="size-4" />Register a pet for {selected.name.split(" ")[0]}
                    </Button>
                  ) : null}
                  <DialogClose asChild>
                    <Button variant="outline" className="h-10 w-full rounded-xl border-border text-[12px] font-semibold">
                      Close record
                    </Button>
                  </DialogClose>
                </div>
              </div>
            </>
          ) : null}
        </DialogContent>
      </Dialog>
      <AlertDialog open={Boolean(accountAction)} onOpenChange={(open) => {
        if (!open && !accountActionLock.current) setAccountAction(null);
      }}>
        <AlertDialogContent
          className="w-[calc(100%-2rem)] max-w-[440px] rounded-2xl border-border"
          onCloseAutoFocus={(event) => {
            if (accountMenuRef.current) {
              event.preventDefault();
              accountMenuRef.current.focus();
            }
          }}
        >
          {accountAction ? (
            <>
              <AlertDialogHeader>
                <AlertDialogTitle>Are you sure?</AlertDialogTitle>
                <AlertDialogDescription>
                  {accountAction.type === "delete-owner-account"
                    ? `Permanently delete sign-in access for ${accountAction.owner.name}? Their linked pet and adoption records will be kept.`
                    : `Send a password reset link to the email registered to ${accountAction.owner.name}?`}
                </AlertDialogDescription>
              </AlertDialogHeader>
              {accountActionError ? <p role="alert" className="text-sm text-destructive">{accountActionError}</p> : null}
              <AlertDialogFooter>
                <AlertDialogCancel disabled={accountActionBusy}>Cancel</AlertDialogCancel>
                <Button type="button" variant={accountAction.type === "delete-owner-account" ? "destructive" : "default"} disabled={accountActionBusy} onClick={() => void confirmAccountAction()}>
                  {accountAction.type === "delete-owner-account"
                    ? accountActionBusy ? "Deleting..." : "Delete account"
                    : accountActionBusy ? "Sending..." : "Send reset link"}
                </Button>
              </AlertDialogFooter>
            </>
          ) : null}
        </AlertDialogContent>
      </AlertDialog>
    </AppShell>
  );
};

export default Owners;
