import { useState } from "react";
import {
  BadgeCheck,
  Bell,
  BellRing,
  ChevronRight,
  FileCheck2,
  QrCode,
  MapPin,
  ScanLine,
  TriangleAlert,
} from "lucide-react";
import {
  getShiftStats,
  scanResultLabels,
  type ScanEntry,
  type ScanResult,
} from "@/data/personnel";
import type { PersonnelImpoundNotice } from "@/lib/personnel-preview-store";
import type { OwnerNotification } from "@/pages/owner-app/notifications-screen";

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
  impoundNotices: PersonnelImpoundNotice[];
  personnelName: string;
  notifications: OwnerNotification[];
  onMarkNotificationRead: (notification: OwnerNotification) => void;
  onOpenScan: () => void;
  onOpenHistory: () => void;
}

export function HomeScreen({ scans, impoundNotices, personnelName, notifications, onMarkNotificationRead, onOpenScan, onOpenHistory }: HomeScreenProps) {
  const stats = getShiftStats(scans);
  const [notificationsOpen, setNotificationsOpen] = useState(false);
  const unreadNotifications = notifications.filter((notification) => !notification.read_at).length;

  const metrics = [
    { label: "QR scans", value: stats.scans, icon: QrCode, tone: "bg-primary-soft text-primary" },
    { label: "Pets verified", value: stats.verified, icon: BadgeCheck, tone: "bg-success/10 text-success" },
    { label: "Registered scanned", value: stats.registered, icon: FileCheck2, tone: "bg-info/12 text-info" },
    { label: "Needs review", value: stats.review, icon: TriangleAlert, tone: "bg-warning/12 text-warning" },
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
        <button type="button" onClick={() => setNotificationsOpen((open) => !open)} className="relative grid size-9 place-items-center rounded-xl border border-border bg-card text-foreground" aria-label={`${unreadNotifications} unread notifications`} aria-expanded={notificationsOpen}>
          <Bell className="size-4" />
          {unreadNotifications ? <span className="absolute -right-1 -top-1 grid min-h-4 min-w-4 place-items-center rounded-full bg-destructive px-1 text-[8px] font-bold text-destructive-foreground">{unreadNotifications > 9 ? "9+" : unreadNotifications}</span> : null}
        </button>
      </header>

      {notificationsOpen ? (
        <section className="mx-5 mt-3 overflow-hidden rounded-xl border border-border bg-card" aria-label="Notifications">
          <div className="border-b border-border px-3 py-2"><p className="text-[11px] font-bold text-foreground">Notifications</p></div>
          {notifications.length ? <ul className="divide-y divide-border">
            {notifications.slice(0, 5).map((notification) => (
              <li key={notification.id}>
                <button type="button" onClick={() => void onMarkNotificationRead(notification)} className="flex w-full items-start gap-2 px-3 py-2.5 text-left hover:bg-secondary/50">
                  <span className={`mt-1 size-2 shrink-0 rounded-full ${notification.read_at ? "bg-muted-foreground/30" : "bg-primary"}`} />
                  <span className="min-w-0"><span className="block text-[10px] font-bold text-foreground">{notification.title}</span><span className="mt-0.5 block text-[9px] leading-relaxed text-muted-foreground">{notification.message}</span><time className="mt-1 block text-[8px] text-muted-foreground/80">{new Date(notification.created_at).toLocaleString("en-PH", { dateStyle: "medium", timeStyle: "short", timeZone: "Asia/Manila" })}</time></span>
                </button>
              </li>
            ))}
          </ul> : <p className="px-3 py-5 text-center text-[10px] text-muted-foreground">No notifications yet.</p>}
        </section>
      ) : null}

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
                {metric.value}
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
            <p className="text-[10px] text-muted-foreground">Your field activity this shift</p>
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
        </ul> : <p className="mx-5 mt-2.5 rounded-xl border border-dashed border-border px-3 py-5 text-center text-[10px] text-muted-foreground">No scans have been recorded yet.</p>}
      </section>

      {impoundNotices.length ? (
        <section className="mt-4 px-5">
          <div className="flex items-center justify-between">
            <div>
              <h2 className="flex items-center gap-1.5 text-[13px] font-extrabold text-foreground"><BellRing className="size-3.5 text-warning" />Impound notices</h2>
              <p className="text-[9.5px] text-muted-foreground">Owner and barangay notice previews</p>
            </div>
            <span className="num rounded-full bg-warning/12 px-2 py-1 text-[9px] font-bold text-warning">{impoundNotices.length}</span>
          </div>
          <ul className="mt-2 space-y-2">
            {impoundNotices.slice(0, 3).map((notice) => (
              <li key={notice.id} className="rounded-xl border border-border bg-card p-2.5">
                <div className="flex items-start justify-between gap-2">
                  <div className="min-w-0"><p className="truncate text-[10.5px] font-bold text-foreground">{notice.petName} • {notice.petId}</p><p className="mt-0.5 truncate text-[9px] text-muted-foreground">Found: {notice.locationFound} • {notice.dateImpounded}</p></div>
                  <span className="shrink-0 rounded-full bg-secondary px-1.5 py-0.5 text-[7.5px] font-bold uppercase text-muted-foreground">Preview only</span>
                </div>
                <div className="mt-2 grid grid-cols-2 gap-1.5">
                  <span className="flex min-w-0 items-center gap-1 rounded-md bg-secondary/60 px-1.5 py-1 text-[8.5px] text-foreground"><BellRing className="size-2.5 shrink-0 text-primary"/><span className="truncate">Owner: {notice.ownerName} • {notice.ownerPhone}</span></span>
                  <span className="flex min-w-0 items-center gap-1 rounded-md bg-secondary/60 px-1.5 py-1 text-[8.5px] text-foreground"><MapPin className="size-2.5 shrink-0 text-primary"/><span className="truncate">Barangay {notice.barangay}</span></span>
                </div>
                <p className="mt-1 text-[8px] text-muted-foreground">RFID: {notice.rfidTag ?? "No collar tag linked"}</p>
              </li>
            ))}
          </ul>
          <p className="mt-2 text-[8.5px] leading-relaxed text-muted-foreground">Actual SMS/email notification requires backend delivery setup.</p>
        </section>
      ) : null}

      <section className="mt-4 px-5">
        <div className="rounded-xl border border-border bg-secondary/40 p-3">
          <p className="text-[8.5px] font-bold uppercase tracking-[0.12em] text-muted-foreground">
            Scope of access
          </p>
          <p className="mt-1 text-[9.5px] leading-relaxed text-muted-foreground">
            Field verification only. Shelter and adoption statistics are managed by OCVAS.
          </p>
        </div>
      </section>
    </div>
  );
}
