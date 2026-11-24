import { Bell, Clock, Heart, PawPrint, ShieldCheck } from "lucide-react";
import { DialogDescription, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import type { Database } from "@/integrations/supabase/types";

type NotificationDetailProps = {
  notification: Pick<
    Database["public"]["Tables"]["notifications"]["Row"],
    "notification_type" | "title" | "message" | "created_at"
  >;
  formattedDate: string;
};

export function NotificationDetail({ notification, formattedDate }: NotificationDetailProps) {
  const type = notification.notification_type;
  const Icon = type.startsWith("adoption_") ? Heart
    : type === "impound_logged" ? PawPrint
    : type === "pet_approved" ? ShieldCheck
    : Bell;

  return (
    <>
      <DialogHeader className="min-w-0 rounded-xl border border-primary/15 bg-primary-soft p-3.5 text-left">
        <div className="flex items-start gap-3">
          <span className="grid size-10 shrink-0 place-items-center rounded-xl bg-card text-primary shadow-sm">
            <Icon className="size-5" aria-hidden="true" />
          </span>
          <div className="min-w-0 space-y-1.5">
            <DialogTitle className="break-words text-base font-extrabold leading-snug text-foreground">
              {notification.title}
            </DialogTitle>
            <DialogDescription className="flex items-center gap-1.5 text-xs">
              <Clock className="size-3.5 shrink-0" aria-hidden="true" />
              <time dateTime={notification.created_at}>{formattedDate}</time>
            </DialogDescription>
          </div>
        </div>
      </DialogHeader>
      <p className="min-w-0 whitespace-pre-wrap break-words rounded-xl border border-border bg-secondary/40 px-4 py-3.5 text-sm leading-relaxed text-foreground">
        {notification.message}
      </p>
    </>
  );
}
