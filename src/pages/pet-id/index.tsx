import { useCallback, useEffect, useMemo, useState, type FormEvent } from "react";
import {
  Copy,
  Fingerprint,
  IdCard,
  PawPrint,
  RefreshCw,
  Search,
  ShieldCheck,
  Siren,
  SlidersHorizontal,
} from "lucide-react";
import { toast } from "sonner";
import { AppShell } from "@/components/veticare/app-shell";
import { PageHeader } from "@/components/admin/page-header";
import { MetricStrip } from "@/components/admin/metric-strip";
import { FilterSelect } from "@/components/admin/filter-select";
import { StatusPill } from "@/components/admin/status-pill";
import { Pagination } from "@/components/admin/pagination";
import { IdPattern } from "@/components/veticare/id-pattern";
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
import { type PetIdRecord, type PetIdStatus } from "@/data/shelter-records";
import { supabase } from "@/integrations/supabase/client";

type RegistryPetIdRecord = PetIdRecord & { recordId: string; rfidTag: string | null };

const PAGE_SIZE = 5;

const PetId = () => {
  const [records, setRecords] = useState<RegistryPetIdRecord[]>([]);
  const [loading, setLoading] = useState(true);
  const [loadError, setLoadError] = useState<string | null>(null);
  const [query, setQuery] = useState("");
  const [status, setStatus] = useState("all");
  const [species, setSpecies] = useState("all");
  const [needsRenewal, setNeedsRenewal] = useState(false);
  const [awaitingIssue, setAwaitingIssue] = useState(false);
  const [showFilters, setShowFilters] = useState(false);
  const [page, setPage] = useState(1);
  const [selected, setSelected] = useState<PetIdRecord | null>(null);
  const [issueOpen, setIssueOpen] = useState(false);
  const [recordToIssue, setRecordToIssue] = useState("");

  const loadRegistry = useCallback(async () => {
    setLoading(true);
    setLoadError(null);
    const [{ data: pets, error: petsError }, { data: profiles, error: profilesError }] = await Promise.all([
      supabase.from("pets").select("id, owner_id, name, species, breed, pet_id, rfid_tag, status, pet_id_status, pet_id_issued_at, pet_id_valid_through").in("status", ["pending", "approved"]).order("created_at", { ascending: false }),
      supabase.from("profiles").select("id, full_name, email, barangay").eq("role", "owner"),
    ]);
    const error = petsError ?? profilesError;
    if (error) {
      setLoadError(error.message);
      setLoading(false);
      return;
    }

    const ownersById = new Map((profiles ?? []).map((profile) => [profile.id, profile]));
    setRecords((pets ?? []).map((pet) => {
      const owner = ownersById.get(pet.owner_id);
      const issuedDate = pet.pet_id_issued_at
        ? new Date(`${pet.pet_id_issued_at}T12:00:00`).toLocaleDateString(undefined, { month: "short", day: "2-digit", year: "numeric" })
        : "Pending approval";
      const validThrough = pet.pet_id_valid_through
        ? new Date(`${pet.pet_id_valid_through}T12:00:00`).toLocaleDateString(undefined, { month: "short", day: "2-digit", year: "numeric" })
        : "—";
      return {
        recordId: pet.id,
        id: pet.pet_id || `Pending • ${pet.id.slice(0, 8)}`,
        rfidTag: pet.rfid_tag,
        pet: pet.name,
        species: pet.species as "Dog" | "Cat",
        breed: pet.breed,
        owner: owner?.full_name || owner?.email || "Pet owner",
        barangay: owner?.barangay || "—",
        issued: issuedDate,
        validThrough,
        status: (pet.pet_id_status || (pet.status === "approved" ? "active" : "pending")) as PetIdStatus,
      };
    }));
    setLoading(false);
  }, []);

  useEffect(() => {
    void loadRegistry();
    window.addEventListener("focus", loadRegistry);
    return () => window.removeEventListener("focus", loadRegistry);
  }, [loadRegistry]);

  const filtered = useMemo(() => {
    const search = query.trim().toLowerCase();
    return records.filter((record) => {
      const matchesQuery =
        search.length === 0 ||
        `${record.id} ${record.rfidTag ?? ""} ${record.pet} ${record.owner} ${record.barangay} ${record.breed}`
          .toLowerCase()
          .includes(search);
      const matchesStatus = status === "all" || record.status === status;
      const matchesSpecies = species === "all" || record.species === species;
      const matchesRenewal =
        !needsRenewal || record.status === "expired" || record.status === "replaced";
      const matchesIssue = !awaitingIssue || record.status === "pending";
      return matchesQuery && matchesStatus && matchesSpecies && matchesRenewal && matchesIssue;
    });
  }, [records, query, status, species, needsRenewal, awaitingIssue]);

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
    setNeedsRenewal(false);
    setAwaitingIssue(false);
    setPage(1);
    void loadRegistry();
    toast.success("Pet ID registry refreshed from Supabase.");
  };

  const issuePetId = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    const pending = records.find((record) => record.recordId === recordToIssue && record.status === "pending");
    if (!pending) return;
    const number = String(Date.now()).slice(-4);
    const petId = `VC-${new Date().getFullYear()}-${number}`;
    const { error } = await supabase.from("pets").update({ pet_id: petId, qr_code: petId, pet_id_status: "pending" }).eq("id", pending.recordId);
    if (error) {
      toast.error(error.message);
      return;
    }
    await loadRegistry();
    setIssueOpen(false);
    setRecordToIssue("");
    toast.success(`Pet ID assigned to ${pending.pet}.`, { description: "It becomes active after RFID assignment and admin approval." });
  };

  const copyId = async (id: string) => {
    try {
      await navigator.clipboard.writeText(id);
      toast.success("Pet ID copied", { description: id });
    } catch {
      toast.info("Copy isn't available in this browser", { description: id });
    }
  };

  const metrics = [
    {
      label: "Issued IDs",
      value: records.filter((record) => record.id.startsWith("VC-")).length,
      hint: "In the registry",
      icon: IdCard,
      tone: "primary" as const,
    },
    {
      label: "Active",
      value: records.filter((record) => record.status === "active").length,
      hint: "Valid this year",
      icon: ShieldCheck,
      tone: "info" as const,
    },
    {
      label: "Awaiting issuance",
      value: records.filter((record) => record.status === "pending").length,
      hint: "Pending approval",
      icon: Fingerprint,
      tone: "warning" as const,
    },
    {
      label: "Needs renewal",
      value: records.filter(
        (record) => record.status === "expired" || record.status === "replaced",
      ).length,
      hint: "Expired or replaced",
      icon: Siren,
      tone: "neutral" as const,
    },
  ];

  return (
    <AppShell>
      <PageHeader
        eyebrow="Registry"
        title="Pet ID"
        description="Issue, verify and renew digital pet IDs so every registered pet stays traceable at clinics and checkpoints."
        actions={
          <Button
            onClick={() => setIssueOpen(true)}
            className="h-9 rounded-xl px-3.5 text-[12px] font-bold shadow-glow"
          >
            <IdCard className="size-4" />
            Generate Pet ID
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
              placeholder="Search Pet ID, RFID, pet, or owner…"
              aria-label="Search pet IDs"
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
                { value: "active", label: "Active" },
                { value: "pending", label: "Pending" },
                { value: "expired", label: "Expired" },
                { value: "replaced", label: "Replaced" },
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
                id: "renewal",
                label: "Needs renewal",
                checked: needsRenewal,
                onChange: (value: boolean) => {
                  setNeedsRenewal(value);
                  setPage(1);
                },
              },
              {
                id: "issue",
                label: "Awaiting issuance",
                checked: awaitingIssue,
                onChange: (value: boolean) => {
                  setAwaitingIssue(value);
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
              {filtered.length} of {records.length} IDs
            </span>
          </div>
        ) : null}

        <div className="hidden border-y border-border bg-secondary/40 px-5 py-2 xl:grid xl:grid-cols-[minmax(0,1.1fr)_148px_minmax(0,1.1fr)_92px_96px_92px] xl:gap-4">
          {["Pet", "Pet ID", "Owner", "Issued", "Valid through", "Status"].map((label) => (
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
              <IdCard className="size-5" />
            </span>
              <p className="text-[13px] font-bold text-foreground">
                {loading ? "Loading Pet ID records…" : loadError ? "Pet ID registry unavailable" : records.length === 0 ? "No pet registrations yet" : "No IDs match"}
              </p>
            <p className="max-w-[260px] text-[11.5px] text-muted-foreground">
              {loadError ?? (records.length === 0 ? "Owner pet submissions and approved registrations will appear here." : "Try another owner or clear the filters to see every ID.")}
            </p>
            {!loading && !loadError && records.length > 0 ? <Button
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
            {visible.map((record) => (
              <li
                key={record.recordId}
                role="button"
                tabIndex={0}
                aria-label={`View Pet ID record for ${record.pet}, ${record.id}`}
                onClick={(event) => {
                  if ((event.target as HTMLElement).closest("button")) return;
                  setSelected(record);
                }}
                onKeyDown={(event) => {
                  if (event.target !== event.currentTarget) return;
                  if (event.key === "Enter" || event.key === " ") {
                    event.preventDefault();
                    setSelected(record);
                  }
                }}
                className="grid cursor-pointer grid-cols-[minmax(0,1fr)_auto] items-center gap-x-3 gap-y-2.5 px-3.5 py-3.5 transition-colors hover:bg-secondary/40 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-inset focus-visible:ring-primary sm:px-4 xl:grid-cols-[minmax(0,1.1fr)_148px_minmax(0,1.1fr)_92px_96px_92px] xl:gap-4 xl:px-5"
              >
                <div className="order-1 flex min-w-0 items-center gap-2.5 xl:order-none">
                  <span
                    className={cn(
                      "grid size-9 shrink-0 place-items-center rounded-xl text-[11px] font-bold",
                      record.species === "Dog"
                        ? "bg-primary-soft text-primary"
                        : "bg-warning/12 text-warning",
                    )}
                  >
                    {record.pet
                      .split(" ")
                      .map((part) => part[0])
                      .slice(0, 2)
                      .join("")}
                  </span>
                  <div className="min-w-0">
                    <p className="truncate text-[12.5px] font-bold text-foreground">{record.pet}</p>
                    <p className="mt-0.5 truncate text-[10px] text-muted-foreground">
                      {record.breed} • {record.species}
                    </p>
                    <p className="num mt-0.5 flex items-center gap-1 text-[9.5px] font-semibold text-primary xl:hidden">
                      {record.id}
                      <button
                        type="button"
                        onClick={(event) => { event.stopPropagation(); void copyId(record.id); }}
                        className="text-primary/70 transition-colors hover:text-primary"
                        aria-label={`Copy pet ID ${record.id}`}
                      >
                        <Copy className="size-2.5" />
                      </button>
                    </p>
                  </div>
                </div>

                <div className="order-3 hidden min-w-0 xl:order-none xl:col-span-1 xl:block">
                  <p className="text-[9px] font-bold uppercase tracking-[0.1em] text-muted-foreground xl:hidden">
                    Pet ID
                  </p>
                  <button
                    type="button"
                    onClick={(event) => { event.stopPropagation(); void copyId(record.id); }}
                    className="num inline-flex items-center gap-1 rounded-md bg-secondary px-1.5 py-0.5 text-[10px] font-bold text-foreground/80 transition-colors hover:bg-primary-soft hover:text-primary"
                    aria-label={`Copy pet ID ${record.id}`}
                  >
                    {record.id}
                    <Copy className="size-2.5 opacity-60" />
                  </button>
                </div>

                <div className="order-3 col-span-2 min-w-0 xl:order-none xl:col-span-1">
                  <p className="text-[9px] font-bold uppercase tracking-[0.1em] text-muted-foreground xl:hidden">
                    Owner
                  </p>
                  <p className="truncate text-[11px] font-semibold text-foreground">
                    {record.owner}
                  </p>
                  <p className="truncate text-[9.5px] text-muted-foreground">
                    Barangay {record.barangay}
                  </p>
                </div>

                <div className="order-3 xl:order-none">
                  <p className="text-[9px] font-bold uppercase tracking-[0.1em] text-muted-foreground xl:hidden">
                    Issued
                  </p>
                  <p className="text-[10.5px] text-foreground/85">{record.issued}</p>
                </div>

                <div className="order-3 xl:order-none">
                  <p className="text-[9px] font-bold uppercase tracking-[0.1em] text-muted-foreground xl:hidden">
                    Valid through
                  </p>
                  <p className="text-[10.5px] text-foreground/85">{record.validThrough}</p>
                </div>

                <div className="order-2 xl:order-none">
                  <StatusPill status={record.status} />
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
        IDs are issued automatically when a registration is approved
      </p>

      <Dialog open={Boolean(selected)} onOpenChange={(open) => (!open ? setSelected(null) : null)}>
        <DialogContent className="max-h-[88vh] w-[calc(100%-2rem)] max-w-[480px] overflow-y-auto rounded-2xl border-border p-5 sm:rounded-2xl">
          {selected ? (
            <>
              <DialogHeader className="pr-6 text-left">
                <DialogTitle className="text-[16px] font-extrabold tracking-[-0.02em]">
                  Pet ID preview
                </DialogTitle>
                <DialogDescription className="text-[11px]">
                  {selected.pet} • {selected.breed}
                </DialogDescription>
              </DialogHeader>

              <div className="space-y-3">
                <div className="overflow-hidden rounded-2xl border border-border bg-card shadow-raised">
                  <div className="brand-gradient flex items-center justify-between px-4 py-3 text-primary-foreground">
                    <div className="flex items-center gap-2">
                      <span className="grid size-6 place-items-center rounded-lg bg-primary-foreground/15">
                        <PawPrint className="size-3.5" />
                      </span>
                      <span className="text-[12px] font-extrabold tracking-[-0.02em]">
                        Veticare
                      </span>
                    </div>
                    <span className="text-[8px] font-bold uppercase tracking-[0.2em] text-primary-foreground/80">
                      Digital pet ID
                    </span>
                  </div>

                  <div className="p-4">
                    <div className="flex items-center gap-3">
                      <span
                        className={cn(
                          "grid size-12 shrink-0 place-items-center rounded-xl text-[13px] font-bold",
                          selected.species === "Dog"
                            ? "bg-primary-soft text-primary"
                            : "bg-warning/12 text-warning",
                        )}
                      >
                        {selected.pet
                          .split(" ")
                          .map((part) => part[0])
                          .slice(0, 2)
                          .join("")}
                      </span>
                      <div className="min-w-0">
                        <p className="truncate text-[16px] font-extrabold tracking-[-0.02em] text-foreground">
                          {selected.pet}
                        </p>
                        <p className="text-[10.5px] text-muted-foreground">
                          {selected.breed} • {selected.species}
                        </p>
                        <span className="num mt-1 inline-block rounded-md bg-primary-soft px-1.5 py-0.5 text-[9px] font-bold text-primary">
                          {selected.id}
                        </span>
                      </div>
                    </div>

                    <dl className="mt-3.5 grid grid-cols-2 gap-y-2 border-t border-border pt-3">
                      {[
                        { label: "Owner", value: selected.owner },
                        { label: "Barangay", value: selected.barangay },
                        { label: "Issued", value: selected.issued },
                        { label: "Valid through", value: selected.validThrough },
                      ].map((row) => (
                        <div key={row.label}>
                          <dt className="text-[8px] font-bold uppercase tracking-[0.14em] text-muted-foreground/80">
                            {row.label}
                          </dt>
                          <dd className="mt-0.5 truncate text-[10.5px] font-semibold text-foreground">
                            {row.value}
                          </dd>
                        </div>
                      ))}
                    </dl>

                    <div className="mt-3 flex items-end justify-between border-t border-border pt-3">
                      <div>
                        <p className="text-[8px] font-bold uppercase tracking-[0.14em] text-muted-foreground/80">
                          Issued by
                        </p>
                        <p className="mt-0.5 text-[10px] font-bold text-foreground">
                          City Veterinary Office
                        </p>
                        <div className="mt-1.5">
                          <StatusPill status={selected.status} />
                        </div>
                      </div>
                      <IdPattern value={selected.id} />
                    </div>
                  </div>

                  <div className="flex items-center justify-between bg-secondary/70 px-4 py-2">
                    <p className="text-[8px] font-medium tracking-wide text-muted-foreground">
                      Bacoor City • Veticare pet registry
                    </p>
                    <p className="text-[8px] font-bold tracking-wide text-muted-foreground">
                      {selected.status === "active" ? "OFFICIAL PET ID" : "PENDING APPROVAL"}
                    </p>
                  </div>
                </div>

                <div className="flex flex-col gap-2">
                  <Button
                    onClick={() => copyId(selected.id)}
                    className="h-10 w-full rounded-xl text-[12px] font-bold shadow-glow"
                  >
                    <Copy className="size-4" />
                    Copy pet ID
                  </Button>
                  <Button
                    variant="outline"
                    onClick={() => setSelected(null)}
                    className="h-10 w-full rounded-xl border-border text-[12px] font-semibold"
                  >
                    Close preview
                  </Button>
                </div>
              </div>
            </>
          ) : null}
        </DialogContent>
      </Dialog>

      <Dialog open={issueOpen} onOpenChange={setIssueOpen}>
        <DialogContent className="rounded-xl border-border bg-card sm:max-w-[440px]">
          <DialogHeader>
            <DialogTitle>Generate Pet ID</DialogTitle>
            <DialogDescription>Assign a Pet ID and matching QR value. The ID becomes active after RFID assignment and admin approval.</DialogDescription>
          </DialogHeader>
          {records.some((record) => record.status === "pending") ? (
            <form onSubmit={issuePetId} className="space-y-3">
              <div className="space-y-1.5">
                <Label htmlFor="pending-id-record">Pet registration</Label>
                <select id="pending-id-record" required value={recordToIssue} onChange={(event) => setRecordToIssue(event.target.value)} className="h-10 w-full rounded-md border border-input bg-background px-3 text-sm">
                  <option value="">Select pet</option>
                  {records.filter((record) => record.status === "pending").map((record) => <option key={record.recordId} value={record.recordId}>{record.pet} • {record.owner} • {record.id}</option>)}
                </select>
              </div>
              <div className="flex justify-end gap-2">
                <Button type="button" variant="outline" onClick={() => setIssueOpen(false)}>Cancel</Button>
                <Button type="submit"><IdCard className="size-4" />Assign Pet ID</Button>
              </div>
            </form>
          ) : (
            <div className="rounded-lg border border-border bg-secondary/60 p-3 text-sm text-muted-foreground">
              No pending registrations are waiting for an ID.
            </div>
          )}
        </DialogContent>
      </Dialog>
    </AppShell>
  );
};

export default PetId;
