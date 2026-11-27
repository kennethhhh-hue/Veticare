import { ImpoundClaimBadge } from "@/components/veticare/impound-claim-badge";
import {
  ArrowLeft,
  BellRing,
  ClipboardList,
  MapPin,
  Phone,
  QrCode,
  ShieldCheck,
  Syringe,
} from "lucide-react";
import { PetPhoto } from "@/components/owner-app/pet-photo";
import { Button } from "@/components/ui/button";
import { formatCalendarDate } from "@/lib/philippine-date";
import { cn } from "@/lib/utils";
import {
  registrationLabels,
  scanFollowUpLabels,
  vaccinationLabels,
  type PersonnelPet,
  type RegistrationState,
  type VaccinationState,
} from "@/data/personnel";

const registrationTone: Record<RegistrationState, string> = {
  active: "bg-success/10 text-success",
  expiring: "bg-warning/12 text-warning",
  expired: "bg-destructive/10 text-destructive",
  unregistered: "bg-secondary text-muted-foreground",
};

const vaccinationTone: Record<VaccinationState, string> = {
  complete: "bg-success/10 text-success",
  due: "bg-warning/12 text-warning",
  overdue: "bg-destructive/10 text-destructive",
  unknown: "bg-secondary text-muted-foreground",
};

interface PetRecordProps {
  pet: PersonnelPet;
  onBack?: () => void;
  onRecordVaccination?: () => void;
  onRequestRegistration?: () => void;
  registrationRequested?: boolean;
  onScanAnother?: () => void;
  onLogImpound?: () => void;
}

export function PetRecord({
  pet,
  onBack,
  onRecordVaccination,
  onRequestRegistration,
  registrationRequested = false,
  onScanAnother,
  onLogImpound,
}: PetRecordProps) {
  const registrationOk = pet.registration === "active" || pet.registration === "expiring";

  return (
    <div className="space-y-3">
      <div className="flex items-center justify-between">
        {onBack ? (
          <button
            type="button"
            onClick={onBack}
            className="flex items-center gap-1.5 py-1 text-[10.5px] font-semibold text-muted-foreground transition-colors hover:text-foreground"
          >
            <ArrowLeft className="size-3.5" />
            Back
          </button>
        ) : (
          <span className="flex items-center gap-1.5 py-1 text-[10px] font-bold uppercase tracking-[0.14em] text-primary">
            <QrCode className="size-3" />
            Pet record
          </span>
        )}
        <span className="flex items-center gap-1 rounded-full bg-secondary px-2 py-1 text-[8.5px] font-bold uppercase tracking-wide text-muted-foreground">
          <ShieldCheck className="size-2.5 text-primary" />
          Verified source
        </span>
      </div>

      <div className="overflow-hidden rounded-2xl border border-border bg-card shadow-card">
        <div className="flex items-start gap-3 p-3.5">
          <PetPhoto
            src={pet.photoUrl}
            alt={pet.name}
            species={pet.species}
            className="size-[62px] shrink-0 rounded-xl ring-1 ring-border"
          />
          <div className="min-w-0 flex-1">
            <div className="flex flex-wrap items-center gap-1.5">
              <p className="truncate text-[17px] font-extrabold tracking-[-0.02em] text-foreground">
                {pet.name}
              </p>
              <span
                className={cn(
                  "rounded-full px-1.5 py-0.5 text-[8.5px] font-bold",
                  registrationTone[pet.registration],
                )}
              >
                {registrationLabels[pet.registration]}
              </span>
              {pet.impoundClaimed ? <ImpoundClaimBadge /> : null}
            </div>
            <p className="mt-0.5 truncate text-[10.5px] text-muted-foreground">
              {pet.breed} • {pet.sex} • {pet.age}
            </p>
            <p className="num mt-1 text-[10px] font-bold text-primary">{pet.id}</p>
          </div>
        </div>

        <div className="grid grid-cols-2 gap-x-3 gap-y-2.5 border-t border-border px-3.5 py-3">
          <div>
            <p className="text-[8.5px] font-bold uppercase tracking-[0.12em] text-muted-foreground/80">
              Registration
            </p>
            <p className="mt-0.5 text-[10px] font-semibold text-foreground">
              Valid through {pet.validThrough}
            </p>
          </div>
          <div>
            <p className="text-[8.5px] font-bold uppercase tracking-[0.12em] text-muted-foreground/80">
              Vaccination
            </p>
            <p className={cn("mt-0.5 inline-flex items-center gap-1 rounded-full px-1.5 py-0.5 text-[10px] font-semibold", vaccinationTone[pet.vaccination])}>
              <Syringe className="size-2.5" />
              {vaccinationLabels[pet.vaccination]}
            </p>
          </div>
          <div className="min-w-0">
            <p className="text-[8.5px] font-bold uppercase tracking-[0.12em] text-muted-foreground/80">
              QR payload
            </p>
            <p className="num mt-0.5 truncate text-[10px] font-semibold text-foreground">
              {pet.qrCode ?? pet.id}
            </p>
          </div>
          <div>
            <p className="text-[8.5px] font-bold uppercase tracking-[0.12em] text-muted-foreground/80">
              Registered
            </p>
            <p className="mt-0.5 text-[10px] font-semibold text-foreground">{pet.registeredOn}</p>
          </div>
        </div>

        {pet.lastVaccine && pet.lastVaccinatedOn ? (
          <section className="border-t border-border px-3.5 py-2.5">
            <h2 className="text-[8.5px] font-bold uppercase tracking-[0.12em] text-muted-foreground">Vaccination details</h2>
            <div className="mt-1 flex flex-wrap items-baseline justify-between gap-1.5 text-[11px]">
              <p className="break-words font-semibold text-foreground">{pet.lastVaccine}</p>
              <time dateTime={pet.lastVaccinatedOn} className="text-muted-foreground">{formatCalendarDate(pet.lastVaccinatedOn)}</time>
            </div>
          </section>
        ) : null}

        <div className="border-t border-border bg-secondary/30 px-3.5 py-2.5">
          <div className="flex items-center justify-between">
            <p className="text-[8.5px] font-bold uppercase tracking-[0.12em] text-muted-foreground/80">
              Owner
            </p>
            <p className="text-[8.5px] font-medium text-muted-foreground">{pet.barangay}</p>
          </div>
          <p className="mt-0.5 text-[11.5px] font-bold text-foreground">{pet.owner}</p>
          <div className="mt-1 flex flex-wrap items-center gap-x-3 gap-y-1 text-[9.5px] text-muted-foreground">
            <span className="flex items-center gap-1">
              <Phone className="size-2.5" />
              {pet.contact}
            </span>
            <span className="flex items-center gap-1">
              <MapPin className="size-2.5" />
              Barangay {pet.barangay}
            </span>
          </div>
        </div>
      </div>

      <div className="flex flex-col gap-2">
        {onLogImpound && pet.owner !== "New Owner Draft" ? (
          <Button
            variant="outline"
            onClick={onLogImpound}
            className="h-10 w-full rounded-xl border-warning/30 bg-warning/5 text-[11.5px] font-bold text-foreground"
          >
            <BellRing className="size-4 text-warning" />
            Report Impound
          </Button>
        ) : null}
        {onRecordVaccination ? (
          <Button type="button" variant="outline" onClick={onRecordVaccination} className="h-10 w-full rounded-xl border-border text-[11.5px] font-semibold text-foreground/85">
            <Syringe className="size-4 text-primary" />
            Record vaccination
          </Button>
        ) : null}
        {onRequestRegistration ? (
          <Button type="button" variant="outline" onClick={onRequestRegistration} disabled={registrationOk || registrationRequested} className="h-10 w-full rounded-xl border-border text-[11.5px] font-semibold text-foreground/85 disabled:opacity-60">
            <ClipboardList className="size-4 text-primary" />
            {registrationOk ? "Already Registered" : registrationRequested ? "Registration Requested" : scanFollowUpLabels.registration}
          </Button>
        ) : null}
        {onScanAnother ? (
          <button
            type="button"
            onClick={onScanAnother}
            className="flex items-center justify-center gap-1.5 py-2 text-[10.5px] font-bold text-primary hover:underline"
          >
            <QrCode className="size-3.5" />
            Scan another pet
          </button>
        ) : null}
      </div>
    </div>
  );
}
