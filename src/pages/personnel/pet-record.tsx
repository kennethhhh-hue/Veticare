import { ImpoundClaimBadge } from "@/components/veticare/impound-claim-badge";
import {
  ArrowLeft,
  BadgeCheck,
  BellRing,
  ClipboardList,
  Flag,
  MapPin,
  Phone,
  QrCode,
  ShieldCheck,
  Syringe,
  TriangleAlert,
} from "lucide-react";
import { PetPhoto } from "@/components/owner-app/pet-photo";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";
import {
  registrationLabels,
  scanFollowUpLabels,
  vaccinationLabels,
  type PersonnelPet,
  type RegistrationState,
  type ScanFollowUp,
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
  mode?: "scan" | "verify";
  onBack?: () => void;
  onVerify?: () => void;
  onFlag?: () => void;
  onRequestFollowUp?: (type: ScanFollowUp) => void;
  requestedFollowUps?: ScanFollowUp[];
  onScanAnother?: () => void;
  onLogImpound?: () => void;
  verified?: boolean;
  flagged?: boolean;
}

export function PetRecord({
  pet,
  mode = "scan",
  onBack,
  onVerify,
  onFlag,
  onRequestFollowUp,
  requestedFollowUps = [],
  onScanAnother,
  onLogImpound,
  verified = false,
  flagged = false,
}: PetRecordProps) {
  const registrationOk = pet.registration === "active" || pet.registration === "expiring";
  const vaccinationOk = pet.vaccination === "complete";
  const needsReview = !registrationOk || !vaccinationOk;
  const vaccinationRequested = requestedFollowUps.includes("vaccination");
  const registrationRequested = requestedFollowUps.includes("registration");

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
            {mode === "scan" ? "Scan result" : "Pet record"}
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
            <p
              className={cn(
                "mt-0.5 inline-flex items-center gap-1 text-[10px] font-semibold",
                pet.vaccination === "complete"
                  ? "text-success"
                  : pet.vaccination === "due"
                    ? "text-warning"
                    : pet.vaccination === "overdue" ? "text-destructive" : "text-muted-foreground",
              )}
            >
              <Syringe className="size-2.5" />
              {pet.vaccination === "unknown" ? pet.lastVaccine : vaccinationLabels[pet.vaccination]}
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

      {!onRequestFollowUp ? (
        <div
          className={cn(
            "flex items-start gap-2 rounded-xl border px-2.5 py-2",
            needsReview
              ? "border-warning/25 bg-warning/10"
              : "border-success/20 bg-success/5",
          )}
        >
          {needsReview ? (
            <TriangleAlert className="mt-0.5 size-3.5 shrink-0 text-warning" />
          ) : (
            <BadgeCheck className="mt-0.5 size-3.5 shrink-0 text-success" />
          )}
          <p className="text-[9.5px] leading-relaxed text-muted-foreground">
            {needsReview
              ? `This pet needs attention: ${registrationLabels[pet.registration].toLowerCase()} registration and ${pet.lastVaccinatedOn ? "vaccination validity needs review" : vaccinationLabels[pet.vaccination].toLowerCase()}. ${pet.lastVaccinatedOn && pet.vaccination !== "complete" ? `Last record: ${pet.lastVaccine}.` : ""}`
              : `Registration and vaccination are current. ${pet.lastVaccine}.`}
          </p>
        </div>
      ) : null}

      <div className="flex flex-col gap-2">
        {mode === "scan" && onLogImpound && pet.owner !== "New Owner Draft" ? (
          <Button
            variant="outline"
            onClick={onLogImpound}
            className="h-10 w-full rounded-xl border-warning/30 bg-warning/5 text-[11.5px] font-bold text-foreground"
          >
            <BellRing className="size-4 text-warning" />
            Report Impound
          </Button>
        ) : null}
        {onRequestFollowUp ? (
          <>
            <Button
              type="button"
              variant="outline"
              onClick={() => onRequestFollowUp("vaccination")}
              disabled={vaccinationOk || vaccinationRequested}
              className="h-10 w-full rounded-xl border-border text-[11.5px] font-semibold text-foreground/85 disabled:opacity-60"
            >
              <Syringe className="size-4 text-primary" />
              {vaccinationOk ? "Vaccination Complete" : vaccinationRequested ? "Vaccination Requested" : scanFollowUpLabels.vaccination}
            </Button>
            <Button
              type="button"
              variant="outline"
              onClick={() => onRequestFollowUp("registration")}
              disabled={registrationOk || registrationRequested}
              className="h-10 w-full rounded-xl border-border text-[11.5px] font-semibold text-foreground/85 disabled:opacity-60"
            >
              <ClipboardList className="size-4 text-primary" />
              {registrationOk ? "Already Registered" : registrationRequested ? "Registration Requested" : scanFollowUpLabels.registration}
            </Button>
          </>
        ) : null}
        {onVerify ? (
          <Button
            onClick={onVerify}
            disabled={verified || pet.registration === "unregistered"}
            className="h-10 w-full rounded-xl text-[11.5px] font-bold shadow-glow disabled:opacity-60 disabled:shadow-none"
          >
            <BadgeCheck className="size-4" />
            {verified
              ? "Verification recorded today"
              : mode === "scan"
                ? "Record field verification"
                : "Record annual verification"}
          </Button>
        ) : null}

        {onFlag ? (
          <Button
            variant="outline"
            onClick={onFlag}
            disabled={flagged}
            className="h-10 w-full rounded-xl border-border text-[11.5px] font-semibold text-foreground/85 disabled:opacity-60"
          >
            <Flag className="size-4 text-warning" />
            {flagged ? "Flagged for OCVAS review" : "Mark for OCVAS review"}
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

      {mode === "verify" ? (
        <p className="text-center text-[9px] leading-relaxed text-muted-foreground/80">
          Personnel access is limited to verification. Record edits require an admin.
        </p>
      ) : null}
    </div>
  );
}
