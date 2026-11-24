import { useState } from "react";
import {
  ArrowLeft,
  BadgeCheck,
  Bell,
  ChevronRight,
  FileCheck2,
  QrCode,
  ScanLine,
  TriangleAlert,
} from "lucide-react";
import {
  scanResultLabels,
  type ScanEntry,
  type ScanResult,
} from "@/data/personnel";
import type { PersonnelImpoundReport } from "@/pages/personnel";
import type { OwnerNotification } from "@/pages/owner-app/notifications-screen";
import { getPhilippineDateKey } from "@/lib/philippine-date";
import { cn } from "@/lib/utils";
import { NotificationDetail } from "@/components/veticare/notification-detail";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from "@/components/ui/dialog";

const resultTone: Record<ScanResult, string> = {
  verified: "bg-success/10 text-success",
  flagged: "bg-warning/12 text-warning",
  expired: "bg-destructive/10 text-destructive",
  unregistered: "bg-secondary text-muted-foreground",
};

const resultDot: Record<ScanResult, string> = {
  verified: "bg-success",
  flagged: "bg-warning",
  expired: "bg-destructive",
  unregistered: "bg-muted-foreground",
};

interface HomeScreenProps {
  scans: ScanEntry[];
  verifiedCount: number;
  reviewCount: number;
  activityReady: boolean;
  today: string;
  impoundReports: PersonnelImpoundReport[];
  impoundReportsLoading: boolean;
  impoundReportsError: string | null;
  onRefreshImpoundReports: () => void;
  personnelName: string;
  notifications: OwnerNotification[];
  onMarkNotificationRead: (notification: OwnerNotification) => void;
  onOpenScan: () => void;
  onOpenHistory: () => void;
}

export function HomeScreen({ scans, verifiedCount, reviewCount, activityReady, today, impoundReports, impoundReportsLoading, impoundReportsError, onRefreshImpoundReports, personnelName, notifications, onMarkNotificationRead, onOpenScan, onOpenHistory }: HomeScreenProps) {
  const todaysScans = scans.filter((scan) => getPhilippineDateKey(new Date(scan.createdAt)) === today);
  const [notificationsOpen, setNotificationsOpen] = useState(false);
  const [selectedNotification, setSelectedNotification] = useState<OwnerNotification | null>(null);
  const unreadNotifications = notifications.filter((notification) => !notification.read_at).length;

  const metrics = [
    { label: "Scans today", value: todaysScans.length, icon: QrCode, tone: "bg-primary-soft text-primary" },
    { label: "Verified today", value: verifiedCount, icon: BadgeCheck, tone: "bg-success/10 text-success" },
    { label: "Pets scanned", value: new Set(todaysScans.map((scan) => scan.petRecordId)).size, icon: FileCheck2, tone: "bg-info/12 text-info" },
    { label: "Open reviews", value: reviewCount, icon: TriangleAlert, tone: "bg-warning/12 text-warning" },
  ];

  return (
    <div className="pb-6">
      <header className="flex items-center gap-3 px-5 pt-5">
        <span className="grid size-10 shrink-0 place-items-center rounded-full bg-primary text-[12px] font-bold text-primary-foreground">
          {(personnelName || "OCVAS Personnel").split(/\s+/).map((part) => part[0]).slice(0, 2).join("").toUpperCase()}
        </span>
        <div className="min-w-0 flex-1">
          <p className="text-[10.5px] font-medium text-muted-foreground">Good morning</p>
          <p className="truncate text-[15px] font-extrabold tracking-[-0.02em] text-foreground">
            {personnelName || "OCVAS Personnel"}
          </p>
        </div>
        <button type="button" onClick={() => setNotificationsOpen(true)} className="relative grid size-9 place-items-center rounded-xl border border-border bg-card text-foreground" aria-label={`Notifications, ${unreadNotifications} unread`} aria-haspopup="dialog" aria-expanded={notificationsOpen}>
          <Bell className="size-4" />
          {unreadNotifications ? <span className="absolute -right-1 -top-1 grid min-h-4 min-w-4 place-items-center rounded-full bg-destructive px-1 text-[8px] font-bold text-destructive-foreground">{unreadNotifications > 9 ? "9+" : unreadNotifications}</span> : null}
        </button>
      </header>

      <Dialog open={notificationsOpen} onOpenChange={(open) => {
        setNotificationsOpen(open);
        if (!open) setSelectedNotification(null);
      }}>
        <DialogContent className={cn(
          "max-h-[min(85dvh,600px)] w-[calc(100%-2rem)] overflow-y-auto rounded-xl border-border bg-card p-5 sm:max-w-[440px]",
          selectedNotification && "max-w-[440px] rounded-2xl pt-10 shadow-raised sm:rounded-2xl",
        )}>
          {!selectedNotification ? (
            <DialogHeader>
              <DialogTitle className="break-words pr-6">Notifications</DialogTitle>
              <DialogDescription>
                {unreadNotifications ? `${unreadNotifications} unread` : "You are all caught up."}
              </DialogDescription>
            </DialogHeader>
          ) : null}
          {selectedNotification ? (
            <>
              <NotificationDetail
                notification={selectedNotification}
                formattedDate={new Date(selectedNotification.created_at).toLocaleString("en-PH", { dateStyle: "medium", timeStyle: "short", timeZone: "Asia/Manila" })}
              />
              <Button type="button" variant="outline" className="justify-self-start" onClick={() => setSelectedNotification(null)}>
                <ArrowLeft className="size-4" />Back to notifications
              </Button>
            </>
          ) : notifications.length ? (
            <ul className="divide-y divide-border border-y border-border">
              {notifications.map((notification) => (
                <li key={notification.id}>
                  <button type="button" onClick={() => { setSelectedNotification(notification); if (!notification.read_at) onMarkNotificationRead(notification); }} className="flex w-full items-start gap-3 px-1 py-3 text-left hover:bg-secondary/50 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-inset focus-visible:ring-primary">
                    <span className={`mt-1.5 size-2 shrink-0 rounded-full ${notification.read_at ? "bg-muted-foreground/30" : "bg-primary"}`} />
                    <span className="min-w-0 flex-1">
                      <span className="block break-words text-[12px] font-bold text-foreground">{notification.title}</span>
                      <span className="mt-1 block break-words text-[11px] leading-relaxed text-muted-foreground">{notification.message}</span>
                      <time dateTime={notification.created_at} className="mt-1 block text-[10px] text-muted-foreground/80">{new Date(notification.created_at).toLocaleString("en-PH", { dateStyle: "medium", timeStyle: "short", timeZone: "Asia/Manila" })}</time>
                    </span>
                    <ChevronRight className="mt-1 size-4 shrink-0 text-muted-foreground" />
                  </button>
                </li>
              ))}
            </ul>
          ) : (
            <p className="py-6 text-center text-sm text-muted-foreground">No notifications yet.</p>
          )}
        </DialogContent>
      </Dialog>

      <section className="mt-4 px-5">
        <div className="relative overflow-hidden rounded-2xl brand-gradient p-4 text-primary-foreground shadow-glow">
          <span
            className="pointer-events-none absolute -right-8 -top-10 size-32 rounded-full bg-primary-foreground/10 blur-2xl"
            aria-hidden
          />
          <div className="relative flex items-center justify-between">
            <span className="flex items-center gap-1.5 rounded-full bg-primary-foreground/15 px-2 py-1 text-[8.5px] font-bold uppercase tracking-[0.14em]">
              <QrCode className="size-3" />
              QR verification
            </span>
            <span className="text-[9px] font-medium text-primary-foreground/75">
              OCVAS · Batangas City
            </span>
          </div>
          <p className="relative mt-3 text-[19px] font-extrabold leading-tight tracking-[-0.02em]">
            Scan a pet QR
          </p>
          <p className="relative mt-0.5 max-w-[240px] text-[10.5px] leading-relaxed text-primary-foreground/75">
            Check registration and vaccination status before any field action.
          </p>
          <button
            type="button"
            onClick={onOpenScan}
            className="relative mt-3 flex h-9 w-full items-center justify-center gap-1.5 rounded-xl bg-primary-foreground text-[11.5px] font-bold text-primary transition-colors hover:bg-primary-foreground/90"
          >
            <ScanLine className="size-4" />
            Open scanner
          </button>
        </div>
      </section>

      <section className="mt-4 grid grid-cols-2 gap-2 px-5">
        {metrics.map((metric) => {
          const Icon = metric.icon;
          return (
            <div
              key={metric.label}
              className="rounded-xl border border-border bg-card px-3 py-2.5 shadow-card"
            >
              <div className="flex items-center gap-1.5">
                <span className={`grid size-6 place-items-center rounded-lg ${metric.tone}`}>
                  <Icon className="size-3.5" />
                </span>
                <p className="text-[8.5px] font-bold uppercase tracking-[0.1em] text-muted-foreground">
                  {metric.label}
                </p>
              </div>
              <p className="num mt-1.5 text-[20px] font-extrabold leading-none text-foreground">
                {activityReady ? metric.value : "—"}
              </p>
            </div>
          );
        })}
      </section>

      <section className="mt-5">
        <div className="flex items-center justify-between px-5">
          <div>
            <h2 className="text-[14px] font-extrabold tracking-[-0.02em] text-foreground">
              Recent scans
            </h2>
            <p className="text-[10px] text-muted-foreground">Your recent recorded activity</p>
          </div>
          <button
            type="button"
            onClick={onOpenHistory}
            className="flex items-center gap-0.5 text-[10.5px] font-bold text-primary"
          >
            See all
            <ChevronRight className="size-3" />
          </button>
        </div>

        {scans.length ? <ul className="mt-2.5 space-y-2 px-5">
          {scans.slice(0, 3).map((scan) => (
            <li key={scan.id}>
              <button
                type="button"
                onClick={onOpenHistory}
                className="flex w-full items-center gap-3 rounded-xl border border-border bg-card p-2.5 text-left transition-colors hover:bg-secondary/60"
              >
                <span className="grid size-9 shrink-0 place-items-center rounded-lg bg-secondary">
                  <QrCode className="size-4 text-foreground/70" />
                </span>
                <span className="min-w-0 flex-1">
                  <span className="block truncate text-[11.5px] font-bold text-foreground">
                    {scan.petName}
                  </span>
                  <span className="num block truncate text-[9px] text-muted-foreground">
                    {scan.petId} • {scan.scannedAt}
                  </span>
                </span>
                <span
                  className={`shrink-0 rounded-full px-1.5 py-0.5 text-[8.5px] font-bold ${resultTone[scan.result]}`}
                >
                  {scanResultLabels[scan.result]}
                </span>
              </button>
            </li>
          ))}
        </ul> : <p className="mx-5 mt-2.5 rounded-xl border border-dashed border-border px-3 py-5 text-center text-[10px] text-muted-foreground">{activityReady ? "No scans have been recorded yet." : "Scan history is unavailable."}</p>}
      </section>

      <section className="mt-4 px-5">
        <h2 className="text-[13px] font-extrabold text-foreground">Recent impound reports</h2>
        <p className="text-[9.5px] text-muted-foreground">Your reports and their review status</p>
        {impoundReportsLoading ? (
          <p role="status" className="mt-2 text-xs text-muted-foreground">Loading impound reports...</p>
        ) : impoundReportsError ? (
          <div role="alert" className="mt-2 text-xs text-destructive">
            <p>Unable to load impound reports: {impoundReportsError}</p>
            <button type="button" onClick={onRefreshImpoundReports} className="mt-1 font-bold underline">Try again</button>
          </div>
        ) : impoundReports.length ? (
          <ul className="mt-2 space-y-2">
            {impoundReports.map((report) => (
              <li key={report.id} className="rounded-xl border border-border bg-card p-2.5">
                <div className="flex items-start justify-between gap-2">
                  <div className="min-w-0">
                    <p className="break-words text-[10.5px] font-bold text-foreground">{report.pets?.name ?? "Pet unavailable"} • {report.pets?.pet_id ?? report.pets?.id ?? report.pet_record_id}</p>
                    <p className="mt-0.5 break-words text-[9px] text-muted-foreground">Found: {report.location_found} • {report.date_impounded}</p>
                  </div>
                  <span className={`shrink-0 rounded-full px-1.5 py-0.5 text-[8.5px] font-bold ${report.status === "reviewed" ? "bg-success/10 text-success" : "bg-warning/12 text-warning"}`}>
                    {report.status === "reviewed" ? "Reviewed" : "Pending review"}
                  </span>
                </div>
                {report.reason ? <p className="mt-1 break-words text-[9px] text-muted-foreground">{report.reason}</p> : null}
              </li>
            ))}
          </ul>
        ) : <p className="mt-2 text-xs text-muted-foreground">No impound reports submitted yet.</p>}
      </section>

      <section className="mt-4 px-5">
        <div className="rounded-xl border border-border bg-secondary/40 p-3">
          <p className="text-[8.5px] font-bold uppercase tracking-[0.12em] text-muted-foreground">
            Scope of access
          </p>
          <p className="mt-1 text-[9.5px] leading-relaxed text-muted-foreground">
            Personnel can verify pets and submit impound reports. Shelter intake and adoptions are managed by OCVAS admins.
          </p>
        </div>
      </section>
    </div>
  );
}
