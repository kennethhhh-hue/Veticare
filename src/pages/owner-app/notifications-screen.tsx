import { Bell, Check, CheckCheck } from "lucide-react";
import type { Database } from "@/integrations/supabase/types";

export type OwnerNotification = Database["public"]["Tables"]["notifications"]["Row"];

interface NotificationsScreenProps {
  notifications: OwnerNotification[];
  onMarkRead: (notification: OwnerNotification) => void;
}

export function NotificationsScreen({ notifications, onMarkRead }: NotificationsScreenProps) {
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
          <li key={notification.id} className="flex items-start gap-3 px-5 py-4">
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
            {!notification.read_at ? (
              <button
                type="button"
                onClick={() => onMarkRead(notification)}
                className="shrink-0 rounded-md px-2 py-1 text-[9px] font-semibold text-primary hover:bg-primary-soft"
              >
                Mark read
              </button>
            ) : null}
          </li>
        )) : (
          <li className="px-5 py-12 text-center">
            <Bell className="mx-auto size-6 text-muted-foreground/60" />
            <p className="mt-2 text-[12px] font-semibold text-foreground">No notifications yet</p>
            <p className="mt-1 text-[10px] text-muted-foreground">Updates about your pet registrations will show here.</p>
          </li>
        )}
      </ul>
    </div>
  );
}