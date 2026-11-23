import { useCallback, useEffect, useRef, useState } from "react";
import type { SupabaseClient } from "@supabase/supabase-js";
import { RefreshCw } from "lucide-react";
import { toast } from "sonner";
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
import { supabase } from "@/integrations/supabase/client";
import { PHILIPPINE_TIME_ZONE } from "@/lib/philippine-date";

type Report = {
  id: string;
  pet_record_id: string;
  reported_by: string;
  location_found: string;
  date_impounded: string;
  reason: string;
  status: string;
  created_at: string;
};

type ReportDatabase = {
  public: {
    Tables: {
      personnel_impound_reports: {
        Row: Report;
        Insert: never;
        Update: never;
        Relationships: [];
      };
    };
    Views: Record<string, never>;
    Functions: {
      mark_personnel_impound_report_reviewed: {
        Args: { p_report_id: string };
        Returns: boolean;
      };
    };
    Enums: Record<string, never>;
    CompositeTypes: Record<string, never>;
  };
};

const reportClient = supabase as unknown as SupabaseClient<ReportDatabase>;

const errorMessage = (error: unknown, fallback: string) =>
  typeof error === "object" && error !== null && "message" in error && typeof error.message === "string"
    ? error.message
    : fallback;

type QueueItem = Report & {
  petName: string;
  petId: string;
  reporter: string;
};

export function PersonnelImpoundReports() {
  const [reports, setReports] = useState<QueueItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [loadError, setLoadError] = useState<string | null>(null);
  const [selected, setSelected] = useState<QueueItem | null>(null);
  const [reviewing, setReviewing] = useState(false);
  const loadVersion = useRef(0);

  const loadReports = useCallback(async () => {
    const version = ++loadVersion.current;
    setLoading(true);
    setLoadError(null);
    try {
      const { data, error } = await reportClient
        .from("personnel_impound_reports")
        .select("id, pet_record_id, reported_by, location_found, date_impounded, reason, status, created_at")
        .eq("status", "pending")
        .order("created_at", { ascending: false });
      if (error) throw error;
      if (!data?.length) {
        if (version === loadVersion.current) setReports([]);
        return;
      }

      const petIds = [...new Set(data.map((report) => report.pet_record_id))];
      const reporterIds = [...new Set(data.map((report) => report.reported_by))];
      const [petsResult, profilesResult] = await Promise.all([
        supabase.from("pets").select("id, pet_id, name").in("id", petIds),
        supabase.from("profiles").select("id, full_name, email").in("id", reporterIds),
      ]);
      if (petsResult.error) throw petsResult.error;
      if (profilesResult.error) throw profilesResult.error;
      if (version !== loadVersion.current) return;

      const pets = new Map((petsResult.data ?? []).map((pet) => [pet.id, pet]));
      const profiles = new Map((profilesResult.data ?? []).map((profile) => [profile.id, profile]));
      setReports(data.map((report) => {
        const pet = pets.get(report.pet_record_id);
        const profile = profiles.get(report.reported_by);
        return {
          ...report,
          petName: pet?.name || "Pet unavailable",
          petId: pet?.pet_id || "Pet ID unavailable",
          reporter: profile?.full_name || profile?.email || "Reporter unavailable",
        };
      }));
    } catch (error) {
      if (version === loadVersion.current) setLoadError(errorMessage(error, "Please try again."));
    } finally {
      if (version === loadVersion.current) setLoading(false);
    }
  }, []);

  useEffect(() => {
    void loadReports();
    return () => { loadVersion.current += 1; };
  }, [loadReports]);

  const markReviewed = async () => {
    if (!selected || reviewing) return;
    setReviewing(true);
    try {
      const { data, error } = await reportClient.rpc("mark_personnel_impound_report_reviewed", {
        p_report_id: selected.id,
      });
      if (error) throw error;
      if (data !== true) {
        toast.error("Report was not marked reviewed.", {
          description: "It may no longer be pending. Refresh the queue to check its status.",
        });
        return;
      }
      setReports((current) => current.filter((report) => report.id !== selected.id));
      setSelected(null);
      toast.success("Report marked reviewed.", {
        description: "No shelter intake was created and no messages were sent.",
      });
    } catch (error) {
      toast.error("Unable to mark report reviewed.", {
        description: errorMessage(error, "Please try again."),
      });
    } finally {
      setReviewing(false);
    }
  };

  return (
    <section aria-labelledby="personnel-reports-heading" className="surface-card mt-4 overflow-hidden rounded-2xl border border-border bg-card sm:mt-5">
      <header className="flex flex-wrap items-start justify-between gap-3 border-b border-border p-4">
        <div>
          <h2 id="personnel-reports-heading" className="text-sm font-bold text-foreground">Personnel field impound reports</h2>
          <p className="mt-1 text-xs text-muted-foreground">Pending reports are separate from shelter intake records.</p>
        </div>
        <Button variant="outline" size="sm" disabled={loading || reviewing} onClick={() => void loadReports()}>
          <RefreshCw className={loading ? "size-4 animate-spin" : "size-4"} />
          {loading ? "Loading" : "Refresh"}
        </Button>
      </header>

      {loading ? (
        <p role="status" className="p-4 text-sm text-muted-foreground">Loading personnel reports...</p>
      ) : loadError ? (
        <div role="alert" className="p-4 text-sm text-destructive">
          <p>Unable to load personnel reports.</p>
          <p className="mt-1 break-words">{loadError}</p>
        </div>
      ) : reports.length === 0 ? (
        <p className="p-4 text-sm text-muted-foreground">No pending personnel reports.</p>
      ) : (
        <ul className="divide-y divide-border">
          {reports.map((report) => (
            <li key={report.id} className="grid gap-3 p-4 lg:grid-cols-[minmax(0,1fr)_minmax(0,1fr)_auto] lg:items-start">
              <div className="min-w-0 space-y-1">
                <p className="break-words text-sm font-bold text-foreground">{report.petName}</p>
                <p className="break-words text-xs text-muted-foreground">{report.petId}</p>
                <p className="break-words text-xs text-foreground"><span className="font-semibold">Location found:</span> {report.location_found}</p>
                <p className="text-xs text-foreground"><span className="font-semibold">Date impounded:</span> {new Date(`${report.date_impounded}T12:00:00Z`).toLocaleDateString("en-PH", { year: "numeric", month: "short", day: "numeric", timeZone: PHILIPPINE_TIME_ZONE })}</p>
              </div>
              <div className="min-w-0 space-y-1 text-xs text-foreground">
                <p className="whitespace-pre-wrap break-words"><span className="font-semibold">Reason:</span> {report.reason}</p>
                <p className="break-words"><span className="font-semibold">Reporter:</span> {report.reporter}</p>
                <p><span className="font-semibold">Reported:</span> {new Date(report.created_at).toLocaleString("en-PH", { year: "numeric", month: "short", day: "numeric", hour: "numeric", minute: "2-digit", timeZone: PHILIPPINE_TIME_ZONE })}</p>
              </div>
              <Button variant="outline" size="sm" disabled={reviewing} onClick={() => setSelected(report)}>Mark reviewed</Button>
            </li>
          ))}
        </ul>
      )}

      <AlertDialog open={selected !== null} onOpenChange={(open) => { if (!open && !reviewing) setSelected(null); }}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Mark this report reviewed?</AlertDialogTitle>
            <AlertDialogDescription>
              This marks the report for {selected?.petName} as reviewed only. It does not create a shelter intake or send messages.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel disabled={reviewing}>Cancel</AlertDialogCancel>
            <Button disabled={reviewing} onClick={() => void markReviewed()}>{reviewing ? "Marking reviewed..." : "Confirm review"}</Button>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </section>
  );
}