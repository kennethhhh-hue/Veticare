import { useCallback, useEffect, useMemo, useState } from "react";
import { useQueryClient } from "@tanstack/react-query";
import { useNavigate } from "react-router-dom";
import {
  Check,
  CircleAlert,
  Clock,
  FileSearch,
  PawPrint,
  X,
} from "lucide-react";
import { toast } from "sonner";
import { cn } from "@/lib/utils";
import { Button } from "@/components/ui/button";
import { sidebarCountKeys, type StatusKey, type VerificationItem } from "@/data/veticare";
import { supabase } from "@/integrations/supabase/client";
import { PHILIPPINE_TIME_ZONE } from "@/lib/philippine-date";

const tabs: { key: StatusKey; label: string }[] = [
  { key: "pending", label: "Pending" },
  { key: "approved", label: "Approved" },
  { key: "rejected", label: "Rejected" },
];

const initials = (name: string) =>
  name
    .split(" ")
    .map((part) => part[0])
    .slice(0, 2)
    .join("");

interface VerificationQueueProps {
  id?: string;
}

export function VerificationQueue({ id }: VerificationQueueProps) {
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  const [items, setItems] = useState<VerificationItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [loadError, setLoadError] = useState<string | null>(null);
  const [tab, setTab] = useState<StatusKey>("pending");

  const loadQueue = useCallback(async () => {
    setLoading(true);
    setLoadError(null);
    const [{ data: pets, error: petsError }, { data: profiles, error: profilesError }] = await Promise.all([
      supabase.from("pets").select("id, owner_id, name, species, breed, status, created_at").order("created_at", { ascending: false }),
      supabase.from("profiles").select("id, full_name, email, barangay").eq("role", "owner"),
    ]);
    const error = petsError ?? profilesError;
    if (error) {
      setLoadError(error.message);
      setLoading(false);
      return;
    }

    const ownersById = new Map((profiles ?? []).map((profile) => [profile.id, profile]));
    setItems((pets ?? []).map((pet) => {
      const owner = ownersById.get(pet.owner_id);
      const submittedAt = new Date(pet.created_at);
      const hoursWaiting = Math.max(0, (Date.now() - submittedAt.getTime()) / 3_600_000);
      const submitted = hoursWaiting < 1
        ? "Just now"
        : hoursWaiting < 24
          ? `${Math.floor(hoursWaiting)} hr${Math.floor(hoursWaiting) === 1 ? "" : "s"} ago`
          : submittedAt.toLocaleDateString("en-PH", { month: "short", day: "numeric", timeZone: PHILIPPINE_TIME_ZONE });
      return {
        id: pet.id,
        pet: pet.name,
        species: pet.species,
        breed: `${pet.breed} • ${pet.species}`,
        owner: owner?.full_name || owner?.email || "Pet owner",
        location: owner?.barangay ? `Barangay ${owner.barangay}` : "Barangay not provided",
        submitted,
        createdAt: pet.created_at,
        status: pet.status as StatusKey,
        missing: pet.status === "pending" ? ["Pet ID and RFID review"] : [],
      };
    }));
    setLoading(false);
  }, []);

  useEffect(() => {
    void loadQueue();
    window.addEventListener("focus", loadQueue);
    return () => window.removeEventListener("focus", loadQueue);
  }, [loadQueue]);

  const counts = useMemo(
    () => ({
      pending: items.filter((i) => i.status === "pending").length,
      approved: items.filter((i) => i.status === "approved").length,
      rejected: items.filter((i) => i.status === "rejected").length,
    }),
    [items],
  );

  const visible = items.filter((item) => item.status === tab);
  const waitingOver48Hours = items.filter((item) => {
    if (item.status !== "pending" || !item.createdAt) return false;
    return Date.now() - new Date(item.createdAt).getTime() > 48 * 3_600_000;
  }).length;

  const reject = async (item: VerificationItem) => {
    const { error } = await supabase.from("pets").update({ status: "rejected" }).eq("id", item.id);
    if (error) {
      toast.error(error.message);
      return;
    }
    void queryClient.invalidateQueries({ queryKey: sidebarCountKeys.registrations });
    toast.success(`${item.pet} registration rejected.`);
    await loadQueue();
  };

  return (
    <section
      id={id}
      className="surface-card fade-up scroll-mt-24 rounded-2xl border border-border bg-card"
    >
      <header className="flex flex-col gap-3 p-4 pb-3 sm:p-5 sm:pb-3">
        <div className="flex items-start justify-between gap-3">
          <div>
            <p className="flex items-center gap-1.5 text-[10.5px] font-bold uppercase tracking-[0.16em] text-primary">
              <FileSearch className="size-3.5" />
              Verification
            </p>
            <h2 className="mt-1 flex flex-wrap items-center gap-2 text-[17px] font-extrabold tracking-[-0.02em] text-foreground">
              Registration queue
              {!loading && !loadError && counts.pending > 0 ? (
                <span className="num rounded-full bg-warning/12 px-2 py-0.5 text-[10.5px] font-bold text-warning">
                  {counts.pending} waiting
                </span>
              ) : null}
            </h2>
            <p className="mt-0.5 text-[12px] text-muted-foreground">
              Live owner submissions. Assign Pet ID and RFID in Pet Registrations before approval.
            </p>
          </div>
          <Button variant="outline" size="sm" onClick={() => void loadQueue()} disabled={loading} className="shrink-0 rounded-xl text-[11px]">Refresh</Button>
        </div>

        <div className="flex items-center gap-1 self-start rounded-xl bg-secondary p-1">
          {tabs.map((t) => (
            <button
              key={t.key}
              type="button"
              onClick={() => setTab(t.key)}
              className={cn(
                "flex items-center gap-1.5 rounded-lg px-3 py-1.5 text-[11.5px] font-semibold transition-all",
                tab === t.key
                  ? "bg-card text-foreground shadow-sm"
                  : "text-muted-foreground hover:text-foreground",
              )}
            >
              {t.label}
              {!loading && !loadError && counts[t.key] > 0 ? (
                <span
                  className={cn(
                    "num rounded-full px-1.5 text-[10px] font-bold",
                    tab === t.key ? "bg-primary-soft text-primary" : "bg-card/60 text-muted-foreground",
                  )}
                >
                  {counts[t.key]}
                </span>
              ) : null}
            </button>
          ))}
        </div>
      </header>

      <div className="border-t border-border">
        {loading ? <p className="px-5 py-8 text-center text-[11px] text-muted-foreground">Loading live registrations…</p> : loadError ? (
          <p className="px-5 py-8 text-center text-[11px] text-destructive">Unable to load registrations: {loadError}</p>
        ) : visible.length === 0 ? (
          <div className="flex flex-col items-center gap-2 px-5 py-12 text-center">
            <span className="grid size-11 place-items-center rounded-2xl bg-primary-soft text-primary">
              <Check className="size-5" />
            </span>
            <p className="text-[13px] font-bold text-foreground">
              Nothing in {tab} right now
            </p>
            <p className="max-w-[260px] text-[11.5px] text-muted-foreground">
              New submissions appear here as owners send their documents.
            </p>
          </div>
        ) : (
          <ul className="divide-y divide-border">
            {visible.map((item) => (
              <li
                key={item.id}
                className="flex flex-col gap-2.5 px-4 py-3.5 transition-colors hover:bg-secondary/40 sm:flex-row sm:items-center sm:gap-4 sm:px-5"
              >
                <div className="flex min-w-0 flex-1 items-center gap-3">
                  <span
                    className={cn(
                      "grid size-10 shrink-0 place-items-center rounded-xl text-[11.5px] font-bold",
                      item.status === "rejected"
                        ? "bg-destructive/10 text-destructive"
                        : item.status === "approved"
                          ? "bg-success/10 text-success"
                          : "bg-primary-soft text-primary",
                    )}
                  >
                    {initials(item.pet)}
                  </span>
                  <div className="min-w-0">
                    <div className="flex items-center gap-1.5">
                      <button
                        type="button"
                        onClick={() => navigate("/registrations")}
                        className="truncate text-left text-[13px] font-bold text-foreground hover:text-primary hover:underline"
                        aria-label={`Open registration for ${item.pet}`}
                      >
                        {item.pet}
                      </button>
                      <span className="num shrink-0 whitespace-nowrap rounded bg-secondary px-1.5 py-px text-[9px] font-semibold text-muted-foreground">
                        {item.id}
                      </span>
                    </div>
                    <p className="mt-0.5 truncate text-[11px] text-muted-foreground">
                        {item.breed} • {item.owner}
                    </p>
                    <p className="mt-0.5 flex items-center gap-1 text-[10px] text-muted-foreground/80">
                      <PawPrint className="size-2.5 shrink-0" />
                      <span className="truncate">{item.location}</span>
                      <span className="text-border">|</span>
                      <Clock className="size-2.5 shrink-0" />
                      <span className="shrink-0">{item.submitted}</span>
                    </p>
                  </div>
                </div>

                <div className="flex items-center justify-between gap-2 sm:contents">
                <div className="flex min-w-0 items-center gap-2 sm:w-[150px] sm:shrink-0">
                  {item.status === "pending" ? (
                    item.missing.length ? (
                      <span className="flex min-w-0 items-center gap-1 rounded-md bg-warning/12 px-2 py-1 text-[10.5px] font-semibold text-warning">
                        <CircleAlert className="size-3 shrink-0" />
                        <span className="truncate">{item.missing[0]}</span>
                      </span>
                    ) : (
                      <span className="flex items-center gap-1 rounded-md bg-success/10 px-2 py-1 text-[10.5px] font-semibold text-success">
                        <Check className="size-3" />
                        Complete
                      </span>
                    )
                  ) : (
                    <span
                      className={cn(
                        "rounded-md px-2 py-1 text-[10.5px] font-semibold capitalize",
                        item.status === "approved"
                          ? "bg-success/10 text-success"
                          : "bg-destructive/10 text-destructive",
                      )}
                    >
                      {item.status}
                    </span>
                  )}
                </div>

                <div className="flex items-center gap-1.5 sm:shrink-0">
                  {item.status === "pending" ? (
                    <>
                      <Button
                        size="sm"
                        variant="ghost"
                        onClick={() => void reject(item)}
                        className="size-8 rounded-lg p-0 text-muted-foreground hover:bg-destructive/10 hover:text-destructive"
                        aria-label={`Reject ${item.pet}`}
                      >
                        <X className="size-3.5" />
                      </Button>
                      <Button size="sm" onClick={() => navigate("/registrations")} className="h-8 rounded-lg px-2.5 text-[11px] font-bold">
                        Review &amp; assign ID
                      </Button>
                    </>
                  ) : (
                    <span className="text-[10.5px] font-medium text-muted-foreground">
                      {item.status === "approved" ? "ID issued" : "Awaiting owner"}
                    </span>
                  )}
                </div>
                </div>
              </li>
            ))}
          </ul>
        )}
      </div>

      <footer className="flex flex-wrap items-center justify-between gap-2 border-t border-border px-4 py-3 sm:px-5">
        <p className="flex items-center gap-1.5 text-[11px] text-muted-foreground">
          <Clock className="size-3.5 text-warning" />
          {waitingOver48Hours} {waitingOver48Hours === 1 ? "record is" : "records are"} past the 48-hour target
        </p>
        <p className="text-[10.5px] font-medium text-muted-foreground/80">
          Changes sync with the Supabase pet registry
        </p>
      </footer>
    </section>
  );
}
