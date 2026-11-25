import { useState, type FormEvent } from "react";
import { useNavigate } from "react-router-dom";
import {
  BellRing,
  ChevronRight,
  FileText,
  HelpCircle,
  LogOut,
  MapPin,
  ShieldCheck,
  Stethoscope,
} from "lucide-react";
import { toast } from "sonner";
import { Switch } from "@/components/ui/switch";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { BarangaySelect } from "@/components/owner-app/barangay-select";
import { OcvasContactInfo } from "@/components/veticare/ocvas-contact-info";
import { ProfilePhoto } from "@/components/veticare/profile-photo";
import { signOut } from "@/integrations/supabase/auth-context";
import type { OwnerProfile, OwnerRequest } from "@/lib/owner-preview-store";
import { ownerRequestLabels } from "@/data/owner-app";

export function ProfileScreen({
  profile,
  petCount,
  adoptionCount,
  requests,
  requestsUnavailable,
  onSave,
  onPhotoUpdated,
}: {
  profile: OwnerProfile;
  petCount: number;
  adoptionCount: number;
  requests: OwnerRequest[];
  requestsUnavailable?: boolean;
  onSave: (profile: OwnerProfile) => Promise<boolean>;
  onPhotoUpdated: (avatarUrl: string) => void;
}) {
  const navigate = useNavigate();
  const [notifications, setNotifications] = useState(() => localStorage.getItem("veticare-owner-reminders") !== "off");
  const [editOpen, setEditOpen] = useState(false);
  const [documentsOpen, setDocumentsOpen] = useState(false);
  const [contactOpen, setContactOpen] = useState(false);
  const [draft, setDraft] = useState(profile);

  const [savingProfile, setSavingProfile] = useState(false);

  const saveProfile = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    if (!draft.barangay.trim()) {
      toast.error("Select your barangay in Batangas City.");
      return;
    }
    setSavingProfile(true);
    const saved = await onSave(draft);
    setSavingProfile(false);
    if (!saved) return;
    setEditOpen(false);
    toast.success("Profile changes saved.");
  };

  const initials = profile.fullName.split(" ").map((part) => part[0]).slice(0, 2).join("").toUpperCase();
  const updatePhoto = (avatarUrl: string) => {
    setDraft((current) => ({ ...current, avatarUrl }));
    onPhotoUpdated(avatarUrl);
  };

  return (
    <div className="pb-6">
      <header className="px-5 pt-5">
        <p className="text-[9.5px] font-bold uppercase tracking-[0.16em] text-primary">Account</p>
        <h1 className="mt-1 text-[24px] font-extrabold leading-none text-foreground">Profile</h1>
      </header>

      <section className="mt-4 px-5">
        <div className="surface-card rounded-2xl border border-border bg-card p-4">
          <div className="flex items-center gap-3">
            <span className="grid size-12 shrink-0 place-items-center overflow-hidden rounded-full bg-primary text-[14px] font-bold text-primary-foreground">
              {profile.avatarUrl ? <img src={profile.avatarUrl} alt={`${profile.fullName} profile`} className="size-full object-cover" /> : initials}
            </span>
            <div className="min-w-0 flex-1">
              <p className="truncate text-[15px] font-extrabold text-foreground">{profile.fullName}</p>
              <p className="truncate text-[10px] text-muted-foreground">{profile.email}</p>
              <p className="mt-0.5 truncate text-[9.5px] text-muted-foreground">{profile.phone}</p>
            </div>
            <button
              type="button"
              onClick={() => { setDraft(profile); setEditOpen(true); }}
              className="shrink-0 rounded-lg border border-border px-2 py-1 text-[9.5px] font-bold text-muted-foreground hover:text-foreground"
            >Edit</button>
          </div>

          <div className="mt-3.5 grid grid-cols-3 divide-x divide-border border-t border-border pt-3 text-center">
            <div><p className="num text-[16px] font-extrabold text-foreground">{petCount}</p><p className="mt-1 text-[8.5px] font-semibold uppercase text-muted-foreground">Pets</p></div>
            <div><p className="num text-[16px] font-extrabold text-foreground">{adoptionCount}</p><p className="mt-1 text-[8.5px] font-semibold uppercase text-muted-foreground">Requests</p></div>
            <div><p className="text-[11px] font-extrabold text-foreground">2026</p><p className="mt-1.5 text-[8.5px] font-semibold uppercase text-muted-foreground">Member since</p></div>
          </div>

          <div className="mt-3 flex items-center gap-1.5 rounded-lg bg-secondary/70 px-2.5 py-2">
            <MapPin className="size-3 shrink-0 text-primary" />
            <p className="truncate text-[9.5px] text-muted-foreground">{[profile.address, profile.barangay].filter(Boolean).join(", ")}</p>
            <ShieldCheck className="ml-auto size-3 shrink-0 text-info" />
            <span className="text-[8px] font-bold uppercase text-info">Preview</span>
          </div>
        </div>
      </section>

      <section className="mt-4 px-5">
        <p className="text-[9px] font-bold uppercase tracking-[0.16em] text-muted-foreground">Preferences</p>
        <div className="mt-2 overflow-hidden rounded-2xl border border-border bg-card">
          <div className="flex items-center gap-2.5 border-b border-border px-3.5 py-3">
            <span className="grid size-7 place-items-center rounded-lg bg-primary-soft text-primary"><BellRing className="size-3.5" /></span>
            <div className="min-w-0 flex-1"><p className="text-[11.5px] font-semibold text-foreground">Vaccination reminders</p><p className="text-[9px] text-muted-foreground">Preference saved on this device</p></div>
            <Switch
              checked={notifications}
              onCheckedChange={(value) => {
                setNotifications(value);
                localStorage.setItem("veticare-owner-reminders", value ? "on" : "off");
                toast.success(value ? "Reminders on" : "Reminders paused");
              }}
              className="data-[state=checked]:bg-primary"
              aria-label="Toggle vaccination reminders"
            />
          </div>
          <button type="button" onClick={() => setDocumentsOpen(true)} className="flex w-full items-center gap-2.5 border-b border-border px-3.5 py-3 text-left hover:bg-secondary/50">
            <span className="grid size-7 place-items-center rounded-lg bg-secondary text-foreground/70"><FileText className="size-3.5" /></span>
            <span className="min-w-0 flex-1"><span className="block text-[11.5px] font-semibold text-foreground">My documents</span><span className="block text-[9px] text-muted-foreground">Sample documents and requirements</span></span>
            <ChevronRight className="size-3.5 text-muted-foreground" />
          </button>
          <button type="button" onClick={() => setContactOpen(true)} className="flex w-full items-center gap-2.5 px-3.5 py-3 text-left hover:bg-secondary/50">
            <span className="grid size-7 place-items-center rounded-lg bg-secondary text-foreground/70"><HelpCircle className="size-3.5" /></span>
            <span className="min-w-0 flex-1"><span className="block text-[11.5px] font-semibold text-foreground">Help &amp; support</span><span className="block text-[9px] text-muted-foreground">OCVAS contact details and office hours</span></span>
            <ChevronRight className="size-3.5 text-muted-foreground" />
          </button>
        </div>
      </section>

      {requestsUnavailable ? <p role="alert" className="mt-4 px-5 text-[10.5px] text-destructive">Unable to load owner requests. Refresh to try again.</p> : null}
      {requests.length ? (
        <section className="mt-4 px-5">
          <div className="flex items-center justify-between">
            <p className="text-[9px] font-bold uppercase tracking-[0.16em] text-muted-foreground">My requests</p>
            <span className="num rounded-full bg-secondary px-2 py-0.5 text-[9px] font-bold text-muted-foreground">{requests.length}</span>
          </div>
          <ul className="mt-2 divide-y divide-border overflow-hidden rounded-xl border border-border bg-card">
            {requests.map((request) => (
              <li key={request.id} className="flex items-start justify-between gap-2 p-3">
                <span className="min-w-0">
                  <span className="block text-[10.5px] font-bold text-foreground">{ownerRequestLabels[request.type]} • {request.petName}</span>
                  {request.details ? <span className="mt-0.5 block break-words text-[9px] text-muted-foreground">{request.details}</span> : null}
                </span>
                <span className="shrink-0 rounded-full bg-secondary px-2 py-1 text-[8px] font-bold capitalize text-secondary-foreground">
                  {request.localOnly ? "Saved on this device" : request.status}
                </span>
              </li>
            ))}
          </ul>
        </section>
      ) : null}

      <section className="mt-4 px-5">
        <p className="text-[9px] font-bold uppercase tracking-[0.16em] text-muted-foreground">Veticare</p>
        <div className="mt-2 overflow-hidden rounded-2xl border border-border bg-card">
          <button type="button" onClick={async () => { const { error } = await signOut(); if (error) { toast.error(error.message); return; } navigate("/login", { replace: true }); }} className="flex w-full items-center gap-2.5 px-3.5 py-3 text-left hover:bg-destructive/5">
            <span className="grid size-7 place-items-center rounded-lg bg-destructive/10 text-destructive"><LogOut className="size-3.5" /></span>
            <span className="flex-1 text-[11.5px] font-semibold text-destructive">Sign out</span>
          </button>
        </div>
      </section>

      <div className="mt-5 flex flex-col items-center gap-1 px-5 text-center">
        <span className="flex items-center gap-1 text-[9px] font-semibold text-muted-foreground"><Stethoscope className="size-3 text-primary" />City Veterinary Office</span>
      </div>

      <Dialog open={editOpen} onOpenChange={setEditOpen}>
        <DialogContent className="max-h-[90vh] overflow-y-auto rounded-xl border-border bg-card sm:max-w-[440px]">
          <DialogHeader><DialogTitle>Edit profile</DialogTitle><DialogDescription>Changes are saved to this browser preview.</DialogDescription></DialogHeader>
          <form onSubmit={(event) => void saveProfile(event)} className="space-y-3">
            <ProfilePhoto name={draft.fullName || "Owner"} photoUrl={draft.avatarUrl} onPhotoUpdated={updatePhoto} />
            <div className="space-y-1.5">
              <Label htmlFor="owner-profile-email">Email address</Label>
              <Input id="owner-profile-email" type="email" value={draft.email} readOnly aria-readonly="true" className="bg-secondary/50" />
              <p className="text-[9px] text-muted-foreground">Email changes require a separate verification step.</p>
            </div>
            {([
              ["name", "Full name"],
              ["phone", "Mobile number"],
              ["address", "Street / house address"],
              ["barangay", "Barangay"],
            ] as const).map(([field, label]) => (
              <div key={field} className="space-y-1.5">
                <Label htmlFor={`owner-profile-${field}`}>{label}</Label>
                {field === "barangay" ? (
                  <BarangaySelect
                    id="owner-profile-barangay"
                    value={draft.barangay}
                    onValueChange={(value) => setDraft((current) => ({ ...current, barangay: value }))}
                    required
                  />
                ) : (
                  <Input
                    id={`owner-profile-${field}`}
                    type="text"
                    required
                    value={field === "name" ? draft.fullName : draft[field]}
                    onChange={(event) => setDraft((current) => ({ ...current, [field === "name" ? "fullName" : field]: event.target.value }))}
                  />
                )}
              </div>
            ))}
            <div className="flex justify-end gap-2"><Button type="button" variant="outline" disabled={savingProfile} onClick={() => setEditOpen(false)}>Cancel</Button><Button type="submit" disabled={savingProfile}>{savingProfile ? "Saving…" : "Save profile"}</Button></div>
          </form>
        </DialogContent>
      </Dialog>

      <Dialog open={documentsOpen} onOpenChange={setDocumentsOpen}>
        <DialogContent className="rounded-xl border-border bg-card sm:max-w-[420px]">
          <DialogHeader><DialogTitle>My documents</DialogTitle><DialogDescription>Sample documents associated with your owner profile.</DialogDescription></DialogHeader>
          <ul className="divide-y divide-border rounded-lg border border-border">
            {["Government ID • Verified", "Proof of address • Verified", "Pet ownership declaration • Pending"].map((document) => <li key={document} className="flex items-center gap-2 p-3 text-[11px] text-foreground"><FileText className="size-4 text-primary" />{document}</li>)}
          </ul>
          <Button variant="outline" onClick={() => setDocumentsOpen(false)}>Close</Button>
        </DialogContent>
      </Dialog>

      <Dialog open={contactOpen} onOpenChange={setContactOpen}>
        <DialogContent className="max-h-[85vh] overflow-y-auto rounded-xl border-border bg-card sm:max-w-[480px]">
          <DialogHeader>
            <DialogTitle>OCVAS contact information</DialogTitle>
            <DialogDescription>Contact the Office of the City Veterinarian and Agricultural Services.</DialogDescription>
          </DialogHeader>
          <OcvasContactInfo compact />
          <Button type="button" variant="outline" onClick={() => setContactOpen(false)}>Close</Button>
        </DialogContent>
      </Dialog>
    </div>
  );
}
