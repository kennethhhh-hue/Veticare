import { useState } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";
import {
  AlertDialog, AlertDialogCancel, AlertDialogContent, AlertDialogDescription,
  AlertDialogFooter, AlertDialogHeader, AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import { Button } from "@/components/ui/button";
import { ownerRequestLabels } from "@/data/owner-app";
import { supabase } from "@/integrations/supabase/client";
import { formatCalendarDate } from "@/lib/philippine-date";

const queueKey = ["owner-service-requests", "submitted"] as const;
type Decision = { id: string; label: string; status: "completed" | "declined" };

export function OwnerRequestQueue() {
  const queryClient = useQueryClient();
  const [decision, setDecision] = useState<Decision | null>(null);
  const requests = useQuery({
    queryKey: queueKey,
    queryFn: async () => {
      const { data, error } = await supabase.from("owner_service_requests")
        .select("id, request_type, preferred_date, details, pets(name), owner:profiles!owner_service_requests_owner_id_fkey(full_name)")
        .eq("status", "submitted").order("created_at");
      if (error) throw new Error(error.message);
      return data;
    },
  });
  const review = useMutation({
    mutationFn: async ({ id, status }: Decision) => {
      const { data, error } = await supabase.rpc("review_owner_service_request", { p_request_id: id, p_status: status });
      if (error) throw new Error(error.message);
      return data;
    },
    onSuccess: (changed) => {
      setDecision(null);
      void queryClient.invalidateQueries({ queryKey: queueKey });
      if (changed) toast.success("Owner request updated.");
      else toast.info("This request was already reviewed.");
    },
  });

  return (
    <section aria-labelledby="owner-service-requests" className="surface-card rounded-2xl border border-border bg-card">
      <header className="flex items-center justify-between gap-2 border-b border-border p-4 sm:p-5">
        <h2 id="owner-service-requests" className="text-[17px] font-extrabold text-foreground">Owner service requests</h2>
        <Button type="button" variant="outline" size="sm" disabled={requests.isFetching} onClick={() => void requests.refetch()}>Refresh</Button>
      </header>
      {requests.isPending ? (
        <p role="status" className="p-5 text-sm text-muted-foreground">Loading owner requests…</p>
      ) : requests.isError ? (
        <p role="alert" className="p-5 text-sm text-destructive">Owner requests are currently unavailable.</p>
      ) : requests.data.length ? (
        <ul className="divide-y divide-border">
          {requests.data.map((item) => {
            const label = ownerRequestLabels[item.request_type];
            return (
              <li key={item.id} className="flex flex-col gap-3 px-4 py-3 sm:flex-row sm:items-center sm:justify-between sm:px-5">
                <div className="min-w-0 space-y-1">
                  <p className="break-words text-[13px] font-bold text-foreground">{label} · {item.pets?.name ?? "Pet"}</p>
                  <p className="text-[11px] text-muted-foreground">{item.owner?.full_name ?? "Pet owner"}</p>
                  {item.preferred_date ? <p className="text-[11px] text-muted-foreground">Preferred date {formatCalendarDate(item.preferred_date)}</p> : null}
                  {item.details ? <p className="whitespace-pre-wrap break-words text-[11px] text-foreground">{item.details}</p> : null}
                </div>
                <div className="flex shrink-0 flex-wrap gap-2">
                  <Button type="button" size="sm" variant="outline" onClick={() => { review.reset(); setDecision({ id: item.id, label, status: "declined" }); }}>Decline</Button>
                  <Button type="button" size="sm" onClick={() => { review.reset(); setDecision({ id: item.id, label, status: "completed" }); }}>Mark completed</Button>
                </div>
              </li>
            );
          })}
        </ul>
      ) : (
        <p className="p-5 text-sm text-muted-foreground">No owner requests waiting for review.</p>
      )}
      <AlertDialog open={Boolean(decision)} onOpenChange={(open) => { if (!open && !review.isPending) setDecision(null); }}>
        <AlertDialogContent className="w-[calc(100%-2rem)] rounded-xl">
          <AlertDialogHeader>
            <AlertDialogTitle>Update owner request?</AlertDialogTitle>
            <AlertDialogDescription>{decision ? `Mark this ${decision.label.toLowerCase()} request as ${decision.status}? The owner will receive a notification.` : ""}</AlertDialogDescription>
          </AlertDialogHeader>
          {review.error ? <p role="alert" className="text-sm text-destructive">{review.error.message}</p> : null}
          <AlertDialogFooter>
            <AlertDialogCancel disabled={review.isPending}>Cancel</AlertDialogCancel>
            <Button type="button" disabled={!decision || review.isPending} onClick={() => { if (decision) review.mutate(decision); }}>
              {review.isPending ? "Saving…" : "Confirm"}
            </Button>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </section>
  );
}
