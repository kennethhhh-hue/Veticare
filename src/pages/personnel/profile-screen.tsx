import { useState, type FormEvent } from "react";
import { useNavigate } from "react-router-dom";
import {
  BadgeCheck,
  BellRing,
  ChevronRight,
  KeyRound,
  LogOut,
  Mail,
  MapPin,
  Phone,
  ShieldCheck,
} from "lucide-react";
import { toast } from "sonner";
import { Switch } from "@/components/ui/switch";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { ProfilePhoto } from "@/components/veticare/profile-photo";
import { signOut } from "@/integrations/supabase/auth-context";
import { readPersonnelNotifications, readPersonnelRequests, writePersonnelNotifications, writePersonnelRequests } from "@/lib/personnel-preview-store";

export function ProfileScreen({
  identity,
  onPhotoUpdated,
}: {
  identity: { name: string; email: string; phone: string; avatarUrl?: string };
  onPhotoUpdated: (avatarUrl: string) => void;
}) {
  const navigate = useNavigate();
  const [notifications, setNotifications] = useState(readPersonnelNotifications);
  const [resetOpen, setResetOpen] = useState(false);
  const [editOpen, setEditOpen] = useState(false);
  const [resetNote, setResetNote] = useState("");
  const [resetRequests, setResetRequests] = useState(readPersonnelRequests);

  const submitResetRequest = (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    const updated = [`${new Date().toLocaleString()} — ${resetNote.trim()}`, ...resetRequests];
    setResetRequests(updated);
    writePersonnelRequests(updated);
    setResetNote("");
    setResetOpen(false);
    toast.success("Password reset request saved in this preview.", {
      description: "No password was changed or sent to the server.",
    });
  };

  return (
    <div className="pb-6">
      <header className="px-5 pt-5">
        <p className="text-[9.5px] font-bold uppercase tracking-[0.16em] text-primary">
          OCVAS
        </p>
        <h1 className="mt-1 text-[24px] font-extrabold leading-none tracking-[-0.03em] text-foreground">
          My profile
        </h1>
      </header>

      <section className="mt-4 px-5">
        <div className="rounded-2xl border border-border bg-card p-4 shadow-card">
          <div className="flex items-center gap-3">
            <span className="grid size-12 shrink-0 place-items-center overflow-hidden rounded-full bg-primary text-[14px] font-bold text-primary-foreground">
              {identity.avatarUrl ? <img src={identity.avatarUrl} alt={`${identity.name || "Personnel"} profile`} className="size-full object-cover" /> : (identity.name || "OCVAS Personnel").split(/\s+/).map((part) => part[0]).slice(0, 2).join("").toUpperCase()}
            </span>
            <div className="min-w-0 flex-1">
              <p className="truncate text-[15px] font-extrabold tracking-[-0.02em] text-foreground">
                {identity.name || "OCVAS Personnel"}
              </p>
              <p className="truncate text-[10px] text-muted-foreground">
                OCVAS Personnel
              </p>
            </div>
            <span className="flex shrink-0 items-center gap-1 rounded-full bg-success/10 px-2 py-1 text-[8px] font-bold uppercase tracking-wide text-success">
              <span className="size-1.5 rounded-full bg-success" />
              On duty
            </span>
          </div>
          <Button type="button" variant="outline" size="sm" onClick={() => setEditOpen(true)} className="mt-3 h-8 w-full text-[10px]">Edit profile</Button>

          <div className="mt-3.5 space-y-2 border-t border-border pt-3">
            {[
              { label: "Office", value: "Office of the City Veterinarian and Agricultural Services", icon: MapPin },
              { label: "Location", value: "Batangas City", icon: BadgeCheck },
            ].map((row) => {
              const Icon = row.icon;
              return (
                <div key={row.label} className="flex items-center gap-2">
                  <Icon className="size-3 shrink-0 text-muted-foreground" />
                  <p className="text-[9.5px] text-muted-foreground">{row.label}</p>
                  <p className="ml-auto truncate text-right text-[9.5px] font-semibold text-foreground">
                    {row.value}
                  </p>
                </div>
              );
            })}
          </div>
        </div>
      </section>

      <section className="mt-4 px-5">
        <p className="text-[9px] font-bold uppercase tracking-[0.16em] text-muted-foreground">
          Account
        </p>
        <div className="mt-2 overflow-hidden rounded-2xl border border-border bg-card">
          <div className="flex items-center gap-2.5 border-b border-border px-3.5 py-3">
            <span className="grid size-7 place-items-center rounded-lg bg-secondary text-foreground/70">
              <Mail className="size-3.5" />
            </span>
            <div className="min-w-0 flex-1">
              <p className="text-[9px] font-bold uppercase tracking-[0.1em] text-muted-foreground">
                Email
              </p>
              <p className="truncate text-[10.5px] font-semibold text-foreground">
                {identity.email || "—"}
              </p>
            </div>
          </div>
          <div className="flex items-center gap-2.5 border-b border-border px-3.5 py-3">
            <span className="grid size-7 place-items-center rounded-lg bg-secondary text-foreground/70">
              <Phone className="size-3.5" />
            </span>
            <div className="min-w-0 flex-1">
              <p className="text-[9px] font-bold uppercase tracking-[0.1em] text-muted-foreground">
                Contact
              </p>
              <p className="num truncate text-[10.5px] font-semibold text-foreground">
                {identity.phone || "—"}
              </p>
            </div>
          </div>
          <button
            type="button"
            onClick={() => setResetOpen(true)}
            className="flex w-full items-center gap-2.5 border-b border-border px-3.5 py-3 text-left transition-colors hover:bg-secondary/50"
          >
            <span className="grid size-7 place-items-center rounded-lg bg-secondary text-foreground/70">
              <KeyRound className="size-3.5" />
            </span>
            <span className="flex-1 text-[11px] font-semibold text-foreground">
              Request password reset
            </span>
            <ChevronRight className="size-3.5 text-muted-foreground" />
          </button>
          <div className="flex items-center gap-2.5 px-3.5 py-3">
            <span className="grid size-7 place-items-center rounded-lg bg-secondary text-foreground/70">
              <BellRing className="size-3.5" />
            </span>
            <div className="min-w-0 flex-1">
              <p className="text-[11px] font-semibold text-foreground">Scan notifications</p>
              <p className="text-[9px] text-muted-foreground">Shift reminders and flags</p>
            </div>
            <Switch
              checked={notifications}
              onCheckedChange={(value) => {
                setNotifications(value);
                writePersonnelNotifications(value);
                toast.success(value ? "Notifications on" : "Notifications paused", {
                  description: "Preference stays on this device for now.",
                });
              }}
              className="data-[state=checked]:bg-primary"
              aria-label="Toggle scan notifications"
            />
          </div>
        </div>
      </section>

      <section className="mt-4 px-5">
        <div className="flex items-center gap-2 rounded-xl border border-border bg-primary-soft/40 p-3">
          <ShieldCheck className="size-4 shrink-0 text-primary" />
          <p className="text-[9.5px] leading-relaxed text-muted-foreground">
            Personnel access covers scanning and verification only. Admin tools are
            handled by OCVAS.
          </p>
        </div>

        <button
          type="button"
          onClick={async () => {
            const { error } = await signOut();
            if (error) {
              toast.error(error.message);
              return;
            }
            navigate("/login", { replace: true });
          }}
          className="mt-2.5 flex h-10 w-full items-center justify-center gap-1.5 rounded-xl border border-border bg-card text-[11.5px] font-semibold text-destructive transition-colors hover:bg-destructive/5"
        >
          <LogOut className="size-4" />
          Log out
        </button>
      </section>

      <p className="mt-4 text-center text-[8.5px] text-muted-foreground/70">
        OCVAS Personnel · Batangas City
      </p>

      {resetRequests.length ? (
        <section className="mt-4 px-5">
          <div className="rounded-xl border border-warning/25 bg-warning/10 p-3">
            <p className="text-[9px] font-bold uppercase tracking-[0.12em] text-warning">Reset requests</p>
            <p className="mt-1 text-[10px] text-foreground">{resetRequests.length} sample request{resetRequests.length === 1 ? "" : "s"} saved on this device.</p>
            <p className="mt-1 truncate text-[9px] text-muted-foreground">Latest: {resetRequests[0]}</p>
          </div>
        </section>
      ) : null}

      <Dialog open={resetOpen} onOpenChange={setResetOpen}>
        <DialogContent className="rounded-xl border-border bg-card sm:max-w-[420px]">
          <DialogHeader>
            <DialogTitle>Request password reset</DialogTitle>
            <DialogDescription>This preview saves a request locally; it does not change your sign-in password.</DialogDescription>
          </DialogHeader>
          <form onSubmit={submitResetRequest} className="space-y-3">
            <div className="space-y-1.5">
              <Label htmlFor="reset-note">Note for your administrator</Label>
              <Textarea id="reset-note" value={resetNote} onChange={(event) => setResetNote(event.target.value)} required maxLength={300} placeholder="Optional context for your reset request" />
            </div>
            <div className="flex justify-end gap-2">
              <Button type="button" variant="outline" onClick={() => setResetOpen(false)}>Cancel</Button>
              <Button type="submit">Save request</Button>
            </div>
          </form>
        </DialogContent>
      </Dialog>

      <Dialog open={editOpen} onOpenChange={setEditOpen}>
        <DialogContent className="rounded-xl border-border bg-card sm:max-w-[440px]">
          <DialogHeader>
            <DialogTitle>Edit profile</DialogTitle>
            <DialogDescription>Update your OCVAS personnel profile photo.</DialogDescription>
          </DialogHeader>
          <ProfilePhoto
            name={identity.name || "OCVAS Personnel"}
            photoUrl={identity.avatarUrl}
            onPhotoUpdated={onPhotoUpdated}
          />
          <Button type="button" variant="outline" onClick={() => setEditOpen(false)}>Done</Button>
        </DialogContent>
      </Dialog>
    </div>
  );
}
