import { useCallback, useEffect, useState } from "react";
import type { SupabaseClient } from "@supabase/supabase-js";
import { CircleAlert, RefreshCw } from "lucide-react";
import { toast } from "sonner";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import { Button } from "@/components/ui/button";
import { supabase } from "@/integrations/supabase/client";
import { PHILIPPINE_TIME_ZONE } from "@/lib/philippine-date";

type ReviewFlag = {
  id: string;
  pet_record_id: string;
  reported_by: string;
  scan_id: string | null;
  status: "open" | "resolved";
  created_at: string;
};

type ReviewDatabase = {
  public: {
    Tables: {
      personnel_review_flags: {
        Row: ReviewFlag;
        Insert: never;
        Update: never;
        Relationships: [];
      };
    };
    Views: Record<string, never>;
    Functions: {
      resolve_personnel_review_flag: {
        Args: { p_flag_id: string };
        Returns: boolean;
      };
    };
    Enums: Record<string, never>;
    CompositeTypes: Record<string, never>;
  };
};

const reviewClient = supabase as unknown as SupabaseClient<ReviewDatabase>;

type QueueItem = ReviewFlag & {
  petName: string;
  petId: string;
  reporter: string;
  scanNote: string | null;
  scanResult: string | null;
};

export function PersonnelReviewQueue() {
  const [items, setItems] = useState<QueueItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [loadError, setLoadError] = useState<string | null>(null);
  const [selected, setSelected] = useState<QueueItem | null>(null);
  const [resolving, setResolving] = useState(false);
  const [resolveError, setResolveError] = useState<string | null>(null);

  const loadQueue = useCallback(async () => {
    setLoading(true);
    setLoadError(null);
    try {
      const { data: flags, error: flagsError } = await reviewClient
        .from("personnel_review_flags")
        .select("id, pet_record_id, reported_by, scan_id, status, created_at")
        .eq("status", "open")
        .order("created_at", { ascending: false });
      if (flagsError) throw flagsError;
      if (!flags?.length) {
        setItems([]);
        return;
      }

      const petIds = [...new Set(flags.map((flag) => flag.pet_record_id))];
      const reporterIds = [...new Set(flags.map((flag) => flag.reported_by))];
      const scanIds = flags.flatMap((flag) => flag.scan_id ? [flag.scan_id] : []);
      const [petsResult, profilesResult, scansResult] = await Promise.all([
        supabase.from("pets").select("id, name, pet_id").in("id", petIds),
        supabase.from("profiles").select("id, full_name, email").in("id", reporterIds),
        scanIds.length ? supabase.from("personnel_scans").select("id, note, result").in("id", scanIds) : Promise.resolve({ data: [], error: null }),
      ]);
      if (petsResult.error) throw petsResult.error;
      if (profilesResult.error) throw profilesResult.error;
      if (scansResult.error) throw scansResult.error;

      const pets = new Map((petsResult.data ?? []).map((pet) => [pet.id, pet]));
      const profiles = new Map((profilesResult.data ?? []).map((profile) => [profile.id, profile]));
      const scans = new Map((scansResult.data ?? []).map((scan) => [scan.id, scan]));
      setItems(flags.map((flag) => {
        const pet = pets.get(flag.pet_record_id);
        const profile = profiles.get(flag.reported_by);
        const scan = flag.scan_id ? scans.get(flag.scan_id) : undefined;
        return {
          ...flag,
          petName: pet?.name || "Pet unavailable",
          petId: pet?.pet_id || `Pet ID unavailable; record ${flag.pet_record_id}`,
          reporter: profile?.full_name || profile?.email || `Reporter unavailable (${flag.reported_by})`,
          scanNote: scan?.note || null,
          scanResult: scan?.result || null,
        };
      }));
    } catch (error) {
      setLoadError(error instanceof Error ? error.message : String((error as { message?: string })?.message ?? error));
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    void loadQueue();
  }, [loadQueue]);

  const resolveFlag = async () => {
    if (!selected || resolving) return;
    setResolving(true);
    setResolveError(null);
    try {
      const { data, error } = await reviewClient.rpc("resolve_personnel_review_flag", { p_flag_id: selected.id });
      if (error) throw error;
      if (data !== true) {
        setResolveError("This flag was not resolved. It may no longer be open; refresh the queue to check.");
        return;
      }
      setItems((current) => current.filter((item) => item.id !== selected.id));
      setSelected(null);
      toast.success("Personnel review flag resolved.");
    } catch (error) {
      setResolveError(error instanceof Error ? error.message : String((error as { message?: string })?.message ?? error));
    } finally {
      setResolving(false);
    }
  };

  return (
    <section aria-labelledby="personnel-review-title" className="surface-card fade-up rounded-2xl border border-border bg-card">
      <header className="flex items-start justify-between gap-3 p-4 sm:p-5">
        <div>
          <p className="flex items-center gap-1.5 text-[10.5px] font-bold uppercase tracking-[0.16em] text-primary">
            <CircleAlert className="size-3.5" aria-hidden="true" /> Personnel
          </p>
          <h2 id="personnel-review-title" className="mt-1 text-[17px] font-extrabold text-foreground">Review queue</h2>
        </div>
        <Button variant="outline" size="sm" onClick={() => void loadQueue()} disabled={loading || resolving} aria-label="Refresh personnel review queue" className="shrink-0 rounded-xl text-[11px]">
          <RefreshCw className="mr-1.5 size-3.5" aria-hidden="true" /> Refresh
        </Button>
      </header>

      <div className="border-t border-border" aria-live="polite" aria-busy={loading}>
        {loading ? (
          <p className="px-5 py-8 text-center text-[11px] text-muted-foreground">Loading personnel review flags...</p>
        ) : loadError ? (
          <p role="alert" className="px-5 py-8 text-center text-[11px] text-destructive">Unable to load personnel review flags: {loadError}</p>
        ) : items.length === 0 ? (
          <p className="px-5 py-8 text-center text-[11px] text-muted-foreground">No open personnel review flags.</p>
        ) : (
          <ul className="divide-y divide-border">
            {items.map((item) => (
              <li key={item.id} className="flex flex-col gap-3 px-4 py-3.5 sm:flex-row sm:items-center sm:justify-between sm:px-5">
                <div className="min-w-0">
                  <p className="break-words text-[13px] font-bold text-foreground">{item.petName} <span className="font-semibold text-muted-foreground">({item.petId})</span></p>
                  <p className="mt-0.5 break-words text-[11px] text-muted-foreground">Reported by {item.reporter}</p>
                  {item.scanNote ? <p className="mt-1 break-words text-[11px] text-foreground">Scan result: {item.scanResult} · {item.scanNote}</p> : null}
                  <time dateTime={item.created_at} className="mt-0.5 block text-[10px] text-muted-foreground">
                    {new Date(item.created_at).toLocaleString("en-PH", { dateStyle: "medium", timeStyle: "short", timeZone: PHILIPPINE_TIME_ZONE })} PHT
                  </time>
                </div>
                <Button variant="outline" size="sm" className="self-start text-[11px] sm:self-center" disabled={resolving} aria-label={`Resolve review flag for ${item.petName}, ${item.petId}`} onClick={() => { setResolveError(null); setSelected(item); }}>Resolve</Button>
              </li>
            ))}
          </ul>
        )}
      </div>

      <AlertDialog open={selected !== null} onOpenChange={(open) => { if (!open && !resolving) setSelected(null); }}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Resolve personnel review flag?</AlertDialogTitle>
            <AlertDialogDescription>
              Mark the flag for {selected?.petName} ({selected?.petId}) as resolved?
            </AlertDialogDescription>
          </AlertDialogHeader>
          {resolveError && <p role="alert" className="text-sm text-destructive">{resolveError}</p>}
          <AlertDialogFooter>
            <AlertDialogCancel disabled={resolving}>Cancel</AlertDialogCancel>
            <AlertDialogAction disabled={resolving} onClick={(event) => { event.preventDefault(); void resolveFlag(); }}>
              {resolving ? "Resolving..." : "Resolve flag"}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </section>
  );
}