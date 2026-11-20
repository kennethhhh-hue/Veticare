import { useEffect, useState, type ReactNode } from "react";
import { Link } from "react-router-dom";
import {
  Bell,
  BriefcaseBusiness,
  Clock,
  Database,
  Globe2,
  LockKeyhole,
  Moon,
  Save,
  ScrollText,
  ShieldCheck,
} from "lucide-react";
import { toast } from "sonner";
import { AppShell } from "@/components/veticare/app-shell";
import { PageHeader } from "@/components/admin/page-header";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Switch } from "@/components/ui/switch";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { cn } from "@/lib/utils";
import { useTheme } from "@/hooks/use-theme";

const DAYS = ["Mon", "Tue", "Wed", "Thu", "Fri", "Sat", "Sun"];
const SETTINGS_KEY = "veticare-admin-settings-preview";

function SettingCard({
  icon: Icon,
  title,
  description,
  children,
  className,
}: {
  icon: typeof Moon;
  title: string;
  description: string;
  children: ReactNode;
  className?: string;
}) {
  return (
    <section
      className={cn(
        "surface-card fade-up rounded-2xl border border-border bg-card p-4 sm:p-5",
        className,
      )}
    >
      <header className="flex items-start gap-3">
        <span className="grid size-9 shrink-0 place-items-center rounded-xl bg-primary-soft text-primary">
          <Icon className="size-4" strokeWidth={2.1} />
        </span>
        <div className="min-w-0">
          <h2 className="text-[14px] font-extrabold tracking-[-0.02em] text-foreground">
            {title}
          </h2>
          <p className="mt-0.5 text-[11px] leading-snug text-muted-foreground">{description}</p>
        </div>
      </header>
      <div className="mt-3">{children}</div>
    </section>
  );
}

function SettingRow({
  label,
  hint,
  children,
}: {
  label: string;
  hint?: string;
  children: ReactNode;
}) {
  return (
    <div className="flex items-center justify-between gap-4 border-b border-border py-2.5 last:border-b-0">
      <div className="min-w-0">
        <p className="text-[11.5px] font-semibold text-foreground">{label}</p>
        {hint ? <p className="mt-0.5 text-[9.5px] text-muted-foreground">{hint}</p> : null}
      </div>
      <div className="shrink-0">{children}</div>
    </div>
  );
}

const Settings = () => {
  const { theme, setTheme } = useTheme();
  const [dirty, setDirty] = useState(false);

  const [require2fa, setRequire2fa] = useState(true);
  const [sessionTimeout, setSessionTimeout] = useState("30");
  const [emailDigest, setEmailDigest] = useState(true);
  const [smsAlerts, setSmsAlerts] = useState(true);
  const [weeklySummary, setWeeklySummary] = useState(false);
  const [retention, setRetention] = useState("5 years");
  const [autoArchive, setAutoArchive] = useState(true);
  const [timezone, setTimezone] = useState("Asia/Manila");
  const [opens, setOpens] = useState("08:00");
  const [closes, setCloses] = useState("17:00");
  const [days, setDays] = useState<string[]>(["Mon", "Tue", "Wed", "Thu", "Fri"]);
  const [auditEnabled, setAuditEnabled] = useState(true);
  const [auditRetention, setAuditRetention] = useState("3 years");

  useEffect(() => {
    try {
      const saved = localStorage.getItem(SETTINGS_KEY);
      if (!saved) return;
      const preferences = JSON.parse(saved) as Record<string, unknown>;
      if (typeof preferences.require2fa === "boolean") setRequire2fa(preferences.require2fa);
      if (typeof preferences.sessionTimeout === "string") setSessionTimeout(preferences.sessionTimeout);
      if (typeof preferences.emailDigest === "boolean") setEmailDigest(preferences.emailDigest);
      if (typeof preferences.smsAlerts === "boolean") setSmsAlerts(preferences.smsAlerts);
      if (typeof preferences.weeklySummary === "boolean") setWeeklySummary(preferences.weeklySummary);
      if (typeof preferences.retention === "string") setRetention(preferences.retention);
      if (typeof preferences.autoArchive === "boolean") setAutoArchive(preferences.autoArchive);
      if (typeof preferences.timezone === "string") setTimezone(preferences.timezone);
      if (typeof preferences.opens === "string") setOpens(preferences.opens);
      if (typeof preferences.closes === "string") setCloses(preferences.closes);
      if (Array.isArray(preferences.days) && preferences.days.every((day) => typeof day === "string")) setDays(preferences.days);
      if (typeof preferences.auditEnabled === "boolean") setAuditEnabled(preferences.auditEnabled);
      if (typeof preferences.auditRetention === "string") setAuditRetention(preferences.auditRetention);
    } catch {
      localStorage.removeItem(SETTINGS_KEY);
    }
  }, []);

  const mark = () => setDirty(true);

  const toggleDay = (day: string) => {
    setDays((prev) => (prev.includes(day) ? prev.filter((item) => item !== day) : [...prev, day]));
    mark();
  };

  const save = () => {
    localStorage.setItem(SETTINGS_KEY, JSON.stringify({
      require2fa,
      sessionTimeout,
      emailDigest,
      smsAlerts,
      weeklySummary,
      retention,
      autoArchive,
      timezone,
      opens,
      closes,
      days,
      auditEnabled,
      auditRetention,
    }));
    setDirty(false);
    toast.success("Preferences saved on this device", {
      description: "These sample settings will remain after refreshing this browser.",
    });
  };

  return (
    <AppShell>
      <PageHeader
        eyebrow="Administration"
        title="System Settings"
        description="Tune the console appearance, security, notifications and record policies for the city veterinary office."
        actions={
          <>
            {dirty ? (
              <span className="flex items-center gap-1.5 rounded-full bg-warning/12 px-2.5 py-1 text-[10px] font-bold text-warning">
                <span className="size-1.5 rounded-full bg-warning" />
                Unsaved changes
              </span>
            ) : null}
            <Button
              onClick={save}
              disabled={!dirty}
              className="h-9 rounded-xl px-3.5 text-[12px] font-bold shadow-glow disabled:opacity-50 disabled:shadow-none"
            >
              <Save className="size-4" />
              Save changes
            </Button>
          </>
        }
      />

      <div className="mt-5 grid gap-4 xl:grid-cols-2">
        <SettingCard
          icon={Moon}
          title="Appearance"
          description="Night mode is applied instantly across the whole console."
        >
          <SettingRow label="Night mode" hint="Deep green palette for low-light shifts">
            <div className="flex items-center gap-2">
              <span className="text-[10px] font-semibold text-muted-foreground">
                {theme === "dark" ? "On" : "Off"}
              </span>
              <Switch
                checked={theme === "dark"}
                onCheckedChange={(value) => {
                  setTheme(value ? "dark" : "light");
                  mark();
                }}
                aria-label="Toggle night mode"
                className="data-[state=checked]:bg-primary"
              />
            </div>
          </SettingRow>
          <div className="mt-2 flex items-center gap-2 rounded-xl bg-secondary/50 p-2.5">
            <span
              className={cn(
                "grid size-8 place-items-center rounded-lg",
                theme === "dark" ? "bg-primary/20 text-primary" : "bg-card text-primary",
              )}
            >
              <Moon className="size-3.5" />
            </span>
            <p className="text-[10px] leading-relaxed text-muted-foreground">
              Preference is stored on this device. Team-wide theming follows once settings sync.
            </p>
          </div>
        </SettingCard>

        <SettingCard
          icon={LockKeyhole}
          title="Security"
          description="Protect admin access with stronger sign-in rules."
        >
          <SettingRow
            label="Require two-factor authentication"
            hint="Applies to Admin and Veterinarian roles"
          >
            <Switch
              checked={require2fa}
              onCheckedChange={(value) => {
                setRequire2fa(value);
                mark();
              }}
              className="data-[state=checked]:bg-primary"
              aria-label="Require two-factor authentication"
            />
          </SettingRow>
          <SettingRow label="Session timeout" hint="Idle admins are signed out automatically">
            <Select
              value={sessionTimeout}
              onValueChange={(value) => {
                setSessionTimeout(value);
                mark();
              }}
            >
              <SelectTrigger className="h-9 w-[112px] rounded-xl border-border text-[11.5px] font-semibold">
                <SelectValue />
              </SelectTrigger>
              <SelectContent className="rounded-xl border-border">
                <SelectItem value="15" className="text-[12px]">
                  15 min
                </SelectItem>
                <SelectItem value="30" className="text-[12px]">
                  30 min
                </SelectItem>
                <SelectItem value="60" className="text-[12px]">
                  60 min
                </SelectItem>
              </SelectContent>
            </Select>
          </SettingRow>
        </SettingCard>

        <SettingCard
          icon={Bell}
          title="Notifications"
          description="Choose what the office sends to owners and staff."
        >
          <SettingRow label="Email digests" hint="Daily summary of new registrations">
            <Switch
              checked={emailDigest}
              onCheckedChange={(value) => {
                setEmailDigest(value);
                mark();
              }}
              className="data-[state=checked]:bg-primary"
              aria-label="Toggle email digests"
            />
          </SettingRow>
          <SettingRow label="SMS vaccination alerts" hint="Reminders 5 days before a due date">
            <Switch
              checked={smsAlerts}
              onCheckedChange={(value) => {
                setSmsAlerts(value);
                mark();
              }}
              className="data-[state=checked]:bg-primary"
              aria-label="Toggle SMS alerts"
            />
          </SettingRow>
          <SettingRow label="Weekly adoption summary" hint="Every Monday at 8:00 AM">
            <Switch
              checked={weeklySummary}
              onCheckedChange={(value) => {
                setWeeklySummary(value);
                mark();
              }}
              className="data-[state=checked]:bg-primary"
              aria-label="Toggle weekly adoption summary"
            />
          </SettingRow>
        </SettingCard>

        <SettingCard
          icon={Database}
          title="Data retention"
          description="How long owner and pet records stay in the registry."
        >
          <SettingRow label="Retention window" hint="Records older than this are archived">
            <Select
              value={retention}
              onValueChange={(value) => {
                setRetention(value);
                mark();
              }}
            >
              <SelectTrigger className="h-9 w-[112px] rounded-xl border-border text-[11.5px] font-semibold">
                <SelectValue />
              </SelectTrigger>
              <SelectContent className="rounded-xl border-border">
                {["1 year", "3 years", "5 years", "Indefinite"].map((option) => (
                  <SelectItem key={option} value={option} className="text-[12px]">
                    {option}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </SettingRow>
          <SettingRow label="Auto-archive inactive owners" hint="After 24 months without activity">
            <Switch
              checked={autoArchive}
              onCheckedChange={(value) => {
                setAutoArchive(value);
                mark();
              }}
              className="data-[state=checked]:bg-primary"
              aria-label="Toggle auto-archive"
            />
          </SettingRow>
          <p className="mt-2 text-[10px] leading-relaxed text-muted-foreground">
            Archived records stay searchable for audits and can be restored by an Admin.
          </p>
        </SettingCard>

        <SettingCard
          icon={Globe2}
          title="Timezone & locale"
          description="Timestamps and report periods follow this timezone."
        >
          <SettingRow label="Office timezone" hint="Used across logs, schedules and exports">
            <Select
              value={timezone}
              onValueChange={(value) => {
                setTimezone(value);
                mark();
              }}
            >
              <SelectTrigger className="h-9 w-[150px] rounded-xl border-border text-[11.5px] font-semibold">
                <SelectValue />
              </SelectTrigger>
              <SelectContent className="rounded-xl border-border">
                {[
                  "Asia/Manila",
                  "Asia/Singapore",
                  "Asia/Tokyo",
                  "UTC",
                ].map((option) => (
                  <SelectItem key={option} value={option} className="text-[12px]">
                    {option}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </SettingRow>
          <SettingRow label="Date format" hint="Matches the registry tables">
            <span className="num rounded-lg bg-secondary px-2 py-1 text-[10.5px] font-semibold text-secondary-foreground">
              May 14, 2026
            </span>
          </SettingRow>
        </SettingCard>

        <SettingCard
          icon={ScrollText}
          title="Audit logging"
          description="Track every administrative action for accountability."
        >
          <SettingRow label="Record admin activity" hint="Sign-ins, edits, exports and failures">
            <Switch
              checked={auditEnabled}
              onCheckedChange={(value) => {
                setAuditEnabled(value);
                mark();
              }}
              className="data-[state=checked]:bg-primary"
              aria-label="Toggle audit logging"
            />
          </SettingRow>
          <SettingRow label="Log retention" hint="Old entries are purged automatically">
            <Select
              value={auditRetention}
              onValueChange={(value) => {
                setAuditRetention(value);
                mark();
              }}
            >
              <SelectTrigger className="h-9 w-[112px] rounded-xl border-border text-[11.5px] font-semibold">
                <SelectValue />
              </SelectTrigger>
              <SelectContent className="rounded-xl border-border">
                {["1 year", "3 years", "7 years"].map((option) => (
                  <SelectItem key={option} value={option} className="text-[12px]">
                    {option}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </SettingRow>
          <Link
            to="/activity-logs"
            className="mt-2 inline-flex items-center gap-1.5 text-[10.5px] font-bold text-primary hover:underline"
          >
            <ShieldCheck className="size-3.5" />
            Open the audit trail
          </Link>
        </SettingCard>

        <SettingCard
          icon={BriefcaseBusiness}
          title="Business hours"
          description="Used for walk-in schedules and automated replies."
          className="xl:col-span-2"
        >
          <div className="grid gap-3 sm:grid-cols-[1fr_1fr_auto] sm:items-end">
            <div className="space-y-1">
              <p className="text-[9.5px] font-bold uppercase tracking-[0.12em] text-muted-foreground">
                Opens
              </p>
              <Input
                type="time"
                value={opens}
                onChange={(event) => {
                  setOpens(event.target.value);
                  mark();
                }}
                className="num h-9 rounded-xl border-border text-[12px]"
              />
            </div>
            <div className="space-y-1">
              <p className="text-[9.5px] font-bold uppercase tracking-[0.12em] text-muted-foreground">
                Closes
              </p>
              <Input
                type="time"
                value={closes}
                onChange={(event) => {
                  setCloses(event.target.value);
                  mark();
                }}
                className="num h-9 rounded-xl border-border text-[12px]"
              />
            </div>
            <p className="flex items-center gap-1.5 pb-2 text-[10.5px] text-muted-foreground">
              <Clock className="size-3.5 text-primary" />
              {opens} – {closes} • {timezone}
            </p>
          </div>

          <div className="mt-3 flex flex-wrap items-center gap-1.5">
            {DAYS.map((day) => {
              const active = days.includes(day);
              return (
                <button
                  key={day}
                  type="button"
                  onClick={() => toggleDay(day)}
                  aria-pressed={active}
                  className={cn(
                    "rounded-lg border px-2.5 py-1.5 text-[10.5px] font-bold transition-colors",
                    active
                      ? "border-primary/25 bg-primary-soft text-primary"
                      : "border-border bg-card text-muted-foreground hover:text-foreground",
                  )}
                >
                  {day}
                </button>
              );
            })}
            <span className="ml-auto text-[10px] text-muted-foreground">
              {days.length} open days per week
            </span>
          </div>
        </SettingCard>
      </div>

      <p className="mt-4 flex flex-wrap items-center gap-x-2 gap-y-1 text-[10.5px] text-muted-foreground/80">
        <span className="rounded-full border border-border bg-card px-2 py-0.5 font-semibold">
          Preview dataset
        </span>
        Settings are saved locally on this device; team sync is not enabled
      </p>
    </AppShell>
  );
};

export default Settings;
