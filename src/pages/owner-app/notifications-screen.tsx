import { useState } from "react";
import { Bell, Check, CheckCheck, ChevronRight } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import type { Database } from "@/integrations/supabase/types";

export type OwnerNotification = Database["public"]["Tables"]["notifications"]["Row"];

interface NotificationsScreenProps {
  notifications: OwnerNotification[];
  onMarkRead: (notification: OwnerNotification) => void;
  onOpenPet: (petId: string) => boolean;
}

export function NotificationsScreen({ notifications, onMarkRead, onOpenPet }: NotificationsScreenProps) {
  const [selected, setSelected] = useState<OwnerNotification | null>(null);
  const unreadCount = notifications.filter((notification) => !notification.read_at).length;

  return (
    <div className="pb-6">
      <header className="px-5 pt-5">
        <p className="text-[9.5px] font-bold uppercase tracking-[0.16em] text-primary">Updates</p>
        <div className="mt-1 flex items-end justify-between gap-3">
          <div>
            <h1 className="text-[24px] font-extrabold leading-none text-foreground">Notifications</h1>
            <p className="mt-1.5 text-[11px] text-muted-foreground">
              {unreadCount ? `${unreadCount} unread` : "You are all caught up"}
            </p>
          </div>
          <Bell className="mb-1 size-5 text-primary" />
        </div>
      </header>

      <ul className="mt-4 divide-y divide-border border-y border-border">
        {notifications.length ? notifications.map((notification) => (
          <li key={notification.id}>
            <button
              type="button"
              onClick={() => {
                setSelected(notification);
                if (!notification.read_at) onMarkRead(notification);
              }}
              className="flex w-full items-start gap-3 px-5 py-4 text-left hover:bg-secondary/50 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-inset focus-visible:ring-primary"
            >
            <span className={`mt-0.5 grid size-8 shrink-0 place-items-center rounded-lg ${notification.read_at ? "bg-secondary text-muted-foreground" : "bg-success/10 text-success"}`}>
              {notification.read_at ? <CheckCheck className="size-4" /> : <Check className="size-4" />}
            </span>
            <div className="min-w-0 flex-1">
              <p className="text-[12px] font-bold text-foreground">{notification.title}</p>
              <p className="mt-1 text-[10.5px] leading-relaxed text-muted-foreground">{notification.message}</p>
              <time className="mt-2 block text-[9px] text-muted-foreground/80" dateTime={notification.created_at}>
                {new Date(notification.created_at).toLocaleString(undefined, { dateStyle: "medium", timeStyle: "short" })}
              </time>
            </div>
            <ChevronRight className="mt-1 size-4 shrink-0 text-muted-foreground" />
            </button>
          </li>
        )) : (
          <li className="px-5 py-12 text-center">
            <Bell className="mx-auto size-6 text-muted-foreground/60" />
            <p className="mt-2 text-[12px] font-semibold text-foreground">No notifications yet</p>
            <p className="mt-1 text-[10px] text-muted-foreground">Updates about your pet registrations will show here.</p>
          </li>
        )}
      </ul>
      <Dialog open={Boolean(selected)} onOpenChange={(open) => { if (!open) setSelected(null); }}>
        <DialogContent className="max-h-[85vh] overflow-y-auto rounded-xl border-border bg-card sm:max-w-[440px]">
          <DialogHeader>
            <DialogTitle className="break-words pr-6">{selected?.title}</DialogTitle>
            <DialogDescription>
              {selected ? new Date(selected.created_at).toLocaleString(undefined, { dateStyle: "medium", timeStyle: "short" }) : ""}
            </DialogDescription>
          </DialogHeader>
          <p className="whitespace-pre-wrap break-words text-sm leading-relaxed text-foreground">{selected?.message}</p>
          {selected?.pet_record_id ? (
            <Button type="button" onClick={() => {
              if (onOpenPet(selected.pet_record_id!)) setSelected(null);
            }}>View pet record</Button>
          ) : null}
        </DialogContent>
      </Dialog>
    </div>
  );
}