import { useState, type FormEvent } from "react";
import {
  ArrowLeft,
  CalendarClock,
  Check,
  Clock,
  IdCard,
  Pencil,
  CalendarDays,
  Syringe,
} from "lucide-react";
import { toast } from "sonner";
import { PetPhoto } from "@/components/owner-app/pet-photo";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";
import type { OwnerPet } from "@/data/owner-app";
import type { OwnerRequest } from "@/lib/owner-preview-store";
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";

interface PetDetailProps {
  pet: OwnerPet;
  onBack: () => void;
  onShowId: (pet: OwnerPet) => void;
  onRequest: (request: OwnerRequest) => void;
}

export function PetDetail({ pet, onBack, onShowId, onRequest }: PetDetailProps) {
  const [visitOpen, setVisitOpen] = useState(false);
  const [changeOpen, setChangeOpen] = useState(false);
  const [annualOpen, setAnnualOpen] = useState(false);
  const [vaccineOpen, setVaccineOpen] = useState(false);
  const [visitDate, setVisitDate] = useState("");
  const [annualDate, setAnnualDate] = useState("");
  const [vaccineDate, setVaccineDate] = useState("");
  const [changeDetails, setChangeDetails] = useState("");

  const submitVisit = (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    onRequest({ id: `REQ-${Date.now()}`, type: "visit", petId: pet.id, petName: pet.name, submittedAt: new Date().toISOString(), details: visitDate, status: "submitted" });
    setVisitOpen(false);
    setVisitDate("");
    toast.success(`Sample visit request sent for ${pet.name}.`);
  };

  const submitChange = (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    onRequest({ id: `REQ-${Date.now()}`, type: "pet-detail-change", petId: pet.id, petName: pet.name, submittedAt: new Date().toISOString(), details: changeDetails.trim(), status: "submitted" });
    setChangeOpen(false);
    setChangeDetails("");
    toast.success(`Detail change request sent for ${pet.name}.`);
  };

  const submitAnnualRegistration = (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    onRequest({
      id: `REQ-${Date.now()}`,
      type: "annual-registration",
      petId: pet.id,
      petName: pet.name,
      submittedAt: new Date().toISOString(),
      details: `Annual registration renewal requested${annualDate ? ` for ${annualDate}` : ""}. RFID on file: ${pet.rfidTag || "not assigned yet"}.`,
      status: "submitted",
    });
    setAnnualOpen(false);
    setAnnualDate("");
    setAnnualRfid(pet.rfidTag ?? "");
    toast.success(`Annual registration request submitted for ${pet.name}.`);
  };

  const submitFreeVaccination = (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    onRequest({
      id: `REQ-${Date.now()}`,
      type: "free-vaccination",
      petId: pet.id,
      petName: pet.name,
      submittedAt: new Date().toISOString(),
      details: `Free vaccination clinic requested${vaccineDate ? ` for ${vaccineDate}` : ""}. RFID on file: ${pet.rfidTag || "not assigned yet"}.`,
      status: "submitted",
    });
    setVaccineOpen(false);
    setVaccineDate("");
    toast.success(`Free vaccination request submitted for ${pet.name}.`);
  };

  return (
    <div className="pb-6">
      <div className="relative">
        <PetPhoto
          src={pet.photoUrl}
          alt={pet.name}
          species={pet.species}
          className="h-[248px] w-full"
        />
        <div
          className="pointer-events-none absolute inset-0 bg-gradient-to-t from-foreground/85 via-foreground/15 to-foreground/30"
          aria-hidden
        />
        <button
          type="button"
          onClick={onBack}
          className="absolute left-4 top-4 grid size-9 place-items-center rounded-full bg-card/90 text-foreground shadow-card backdrop-blur transition-colors hover:bg-card"
          aria-label="Back to my pets"
        >
          <ArrowLeft className="size-4" />
        </button>
        <div className="absolute inset-x-5 bottom-4">
          <div className="flex flex-wrap items-center gap-1.5">
            {pet.tags.slice(0, 2).map((tag) => (
              <span
                key={tag}
                className="rounded-full bg-primary-foreground/15 px-2 py-0.5 text-[8.5px] font-bold uppercase tracking-wide text-primary-foreground backdrop-blur"
              >
                {tag}
              </span>
            ))}
          </div>
          <h1 className="mt-1.5 text-[26px] font-extrabold leading-none tracking-[-0.03em] text-primary-foreground">
            {pet.name}
          </h1>
          <p className="mt-1 text-[11px] text-primary-foreground/80">
            {pet.breed} • {pet.sex} • {pet.age}
          </p>
        </div>
      </div>

      <div className="px-5">
        <div className="mt-4 grid grid-cols-2 gap-x-3 gap-y-2.5 rounded-2xl border border-border bg-card p-3.5">
          {[
            { label: "Pet ID", value: pet.petId },
            { label: "Collar RFID", value: pet.rfidTag || "Not linked" },
            { label: "Registered", value: pet.registered },
            { label: "Weight", value: pet.weight },
            { label: "Color", value: pet.color },
          ].map((row) => (
            <div key={row.label} className="min-w-0">
              <p className="text-[8.5px] font-bold uppercase tracking-[0.12em] text-muted-foreground/80">
                {row.label}
              </p>
              <p className="num mt-0.5 truncate text-[11.5px] font-bold text-foreground">
                {row.value}
              </p>
            </div>
          ))}
        </div>

        <div className="mt-3 grid grid-cols-2 gap-2">
          <Button variant="outline" onClick={() => setAnnualOpen(true)} className="h-auto min-h-10 rounded-xl px-2 py-2 text-[10px] font-bold leading-tight">
            <CalendarDays className="size-3.5 shrink-0" />Annual registration
          </Button>
          <Button variant="outline" onClick={() => setVaccineOpen(true)} className="h-auto min-h-10 rounded-xl px-2 py-2 text-[10px] font-bold leading-tight">
            <Syringe className="size-3.5 shrink-0" />Free vaccination
          </Button>
        </div>

        {pet.vaccines.length ? <div className="mt-3 rounded-2xl border border-warning/25 bg-warning/10 p-3.5">
          <div className="flex items-center justify-between">
            <p className="flex items-center gap-1.5 text-[9px] font-bold uppercase tracking-[0.12em] text-warning">
              <CalendarClock className="size-3" />
              Next due
            </p>
            <span className="num rounded-full bg-warning/15 px-1.5 py-0.5 text-[9px] font-bold text-warning">
              in {pet.nextDue.days} days
            </span>
          </div>
          <p className="mt-1.5 text-[13px] font-extrabold text-foreground">
            {pet.nextDue.title}
          </p>
          <p className="text-[10px] text-muted-foreground">{pet.nextDue.date}</p>
          <button
            type="button"
            onClick={() => setVisitOpen(true)}
            className="mt-2 text-[10px] font-bold text-primary hover:underline"
          >
            Book this visit
          </button>
        </div> : null}

        <div className="mt-4 rounded-2xl border border-border bg-card p-3.5">
          <div className="flex items-center justify-between">
            <h2 className="flex items-center gap-1.5 text-[12px] font-extrabold text-foreground">
              <Syringe className="size-3.5 text-primary" />
              Vaccination record
            </h2>
            <span className="num text-[9.5px] font-semibold text-muted-foreground">
              {pet.vaccines.length ? `${pet.vaccines.filter((v) => v.status === "done").length}/${pet.vaccines.length} complete` : "No records linked"}
            </span>
          </div>
          {pet.vaccines.length ? <ul className="mt-2.5 space-y-2">
            {pet.vaccines.map((vaccine) => (
              <li key={vaccine.name} className="flex items-center gap-2.5">
                <span
                  className={cn(
                    "grid size-6 shrink-0 place-items-center rounded-full",
                    vaccine.status === "done"
                      ? "bg-success/10 text-success"
                      : "bg-warning/12 text-warning",
                  )}
                >
                  {vaccine.status === "done" ? (
                    <Check className="size-3" strokeWidth={2.8} />
                  ) : (
                    <Clock className="size-3" />
                  )}
                </span>
                <div className="min-w-0 flex-1">
                  <p className="truncate text-[11px] font-semibold text-foreground">
                    {vaccine.name}
                  </p>
                  <p className="text-[9px] text-muted-foreground">{vaccine.date}</p>
                </div>
                <span
                  className={cn(
                    "shrink-0 rounded px-1.5 py-0.5 text-[8px] font-bold uppercase tracking-wide",
                    vaccine.status === "done"
                      ? "bg-success/10 text-success"
                      : "bg-warning/12 text-warning",
                  )}
                >
                  {vaccine.status === "done" ? "Done" : "Due"}
                </span>
              </li>
            ))}
          </ul> : <p className="mt-2.5 text-[10px] leading-relaxed text-muted-foreground">Vaccination history is not available in the database yet.</p>}
        </div>

        <Button
          onClick={() => onShowId(pet)}
          disabled={pet.registrationStatus !== "approved"}
          className="mt-4 h-11 w-full rounded-xl text-[12px] font-bold shadow-glow"
        >
          <IdCard className="size-4" />
          {pet.registrationStatus === "approved" ? "Show digital pet ID" : "Digital ID after approval"}
        </Button>
        <button
          type="button"
          onClick={() => setChangeOpen(true)}
          className="mt-2 flex w-full items-center justify-center gap-1.5 py-2 text-[10.5px] font-semibold text-muted-foreground hover:text-foreground"
        >
          <Pencil className="size-3" />
          Request a detail change
        </button>
      </div>

      <Dialog open={visitOpen} onOpenChange={setVisitOpen}>
        <DialogContent className="rounded-xl border-border bg-card sm:max-w-[420px]">
          <DialogHeader><DialogTitle>Book a vet visit</DialogTitle><DialogDescription>Submit a sample appointment request for {pet.name}.</DialogDescription></DialogHeader>
          <form onSubmit={submitVisit} className="space-y-3">
            <div className="space-y-1.5"><Label htmlFor="visit-date">Preferred date</Label><Input id="visit-date" type="date" min={new Date().toISOString().slice(0, 10)} value={visitDate} onChange={(event) => setVisitDate(event.target.value)} required /></div>
            <div className="flex justify-end gap-2"><Button type="button" variant="outline" onClick={() => setVisitOpen(false)}>Cancel</Button><Button type="submit">Submit request</Button></div>
          </form>
        </DialogContent>
      </Dialog>

      <Dialog open={changeOpen} onOpenChange={setChangeOpen}>
        <DialogContent className="rounded-xl border-border bg-card sm:max-w-[420px]">
          <DialogHeader><DialogTitle>Request a detail change</DialogTitle><DialogDescription>Tell the City Veterinary Office what needs correction for {pet.name}.</DialogDescription></DialogHeader>
          <form onSubmit={submitChange} className="space-y-3">
            <div className="space-y-1.5"><Label htmlFor="change-details">Details to update</Label><Textarea id="change-details" value={changeDetails} onChange={(event) => setChangeDetails(event.target.value)} required maxLength={500} placeholder="Describe the correction and the correct information." /></div>
            <div className="flex justify-end gap-2"><Button type="button" variant="outline" onClick={() => setChangeOpen(false)}>Cancel</Button><Button type="submit">Submit request</Button></div>
          </form>
        </DialogContent>
      </Dialog>

      <Dialog open={annualOpen} onOpenChange={setAnnualOpen}>
        <DialogContent className="rounded-xl border-border bg-card sm:max-w-[420px]">
          <DialogHeader><DialogTitle>Annual registration renewal</DialogTitle><DialogDescription>Request an annual registration check for {pet.name}. The City Veterinary Office will review the sample request.</DialogDescription></DialogHeader>
          <form onSubmit={submitAnnualRegistration} className="space-y-3">
            <div className="rounded-lg border border-border bg-secondary/50 p-2.5 text-[10px] text-muted-foreground">Pet ID: {pet.petId} • Admin-assigned RFID: {pet.rfidTag || "Not assigned yet"}</div>
            <div className="space-y-1.5"><Label htmlFor="annual-date">Preferred visit date <span className="font-normal text-muted-foreground">(optional)</span></Label><Input id="annual-date" type="date" min={new Date().toISOString().slice(0, 10)} value={annualDate} onChange={(event) => setAnnualDate(event.target.value)} /></div>
            <div className="flex justify-end gap-2"><Button type="button" variant="outline" onClick={() => setAnnualOpen(false)}>Cancel</Button><Button type="submit">Submit renewal request</Button></div>
          </form>
        </DialogContent>
      </Dialog>

      <Dialog open={vaccineOpen} onOpenChange={setVaccineOpen}>
        <DialogContent className="rounded-xl border-border bg-card sm:max-w-[420px]">
          <DialogHeader><DialogTitle>Free vaccination request</DialogTitle><DialogDescription>Request a slot at a City Veterinary Office free vaccination clinic for {pet.name}.</DialogDescription></DialogHeader>
          <form onSubmit={submitFreeVaccination} className="space-y-3">
            <div className="rounded-lg border border-info/20 bg-info/5 p-2.5 text-[10px] leading-relaxed text-muted-foreground">The request is a local preview only. Clinic availability and eligibility must be confirmed by the City Veterinary Office.</div>
            <div className="space-y-1.5"><Label htmlFor="vaccine-date">Preferred clinic date <span className="font-normal text-muted-foreground">(optional)</span></Label><Input id="vaccine-date" type="date" min={new Date().toISOString().slice(0, 10)} value={vaccineDate} onChange={(event) => setVaccineDate(event.target.value)} /></div>
            <div className="flex justify-end gap-2"><Button type="button" variant="outline" onClick={() => setVaccineOpen(false)}>Cancel</Button><Button type="submit">Request free vaccination</Button></div>
          </form>
        </DialogContent>
      </Dialog>
    </div>
  );
}
