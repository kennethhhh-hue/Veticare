import { useRef, useState, type FormEvent } from "react";
import { Camera } from "lucide-react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { getPhilippineDateKey } from "@/lib/philippine-date";
import type { PersonnelPet } from "@/data/personnel";
import { PetRecord } from "./pet-record";

export interface ScannerPetActions {
  registrationRequestPetIds: string[];
  onRequestRegistration: (petId: string, scanId?: string) => Promise<boolean>;
  onRecordVaccination: (pet: PersonnelPet, vaccineName: string, administeredOn: string, nextDueOn: string | null) => Promise<boolean>;
  onImpound: (pet: PersonnelPet, locationFound: string, dateImpounded: string) => Promise<boolean>;
}

const MAX_VACCINE_NAME_LENGTH = 120;
const MIN_CALENDAR_DATE = "0001-01-01";

function isValidDateThroughToday(value: string) {
  if (!/^\d{4}-\d{2}-\d{2}$/.test(value) || value < MIN_CALENDAR_DATE || value > getPhilippineDateKey()) {
    return false;
  }
  const parsedDate = new Date(`${value}T00:00:00Z`);
  return !Number.isNaN(parsedDate.getTime()) && parsedDate.toISOString().slice(0, 10) === value;
}

function focusHeading(heading: HTMLHeadingElement | null) {
  heading?.focus();
}

export function ScannerHeading({ focusOnMount = false }: { focusOnMount?: boolean }) {
  return (
    <header className="px-5 pt-5">
      <p className="text-[9.5px] font-bold uppercase tracking-[0.16em] text-primary">
        City Pound field tool
      </p>
      <div className="mt-1 flex items-center justify-between gap-2">
        <h1 ref={focusOnMount ? focusHeading : undefined} tabIndex={focusOnMount ? -1 : undefined} className="text-[24px] font-extrabold leading-none tracking-[-0.03em] text-foreground">
          Pet Tag Scanner
        </h1>
        <span className="flex items-center gap-1 rounded-full bg-secondary px-2 py-1 text-[8px] font-bold uppercase tracking-wide text-muted-foreground">
          <Camera className="size-2.5" />
          Camera QR scan
        </span>
      </div>
      <p className="mt-1.5 text-[11px] text-muted-foreground">
        Identify a pet, its owner and its registration status in seconds.
      </p>
    </header>
  );
}

export function ScannerPetResult({
  pet,
  scanId,
  onBack,
  onScanAnother,
  actions,
}: {
  pet: PersonnelPet;
  scanId?: string;
  onBack: () => void;
  onScanAnother: () => void;
  actions: ScannerPetActions;
}) {
  const { registrationRequestPetIds, onRequestRegistration, onRecordVaccination, onImpound } = actions;
  const savingScanActionRef = useRef(false);
  const impoundSubmittingRef = useRef(false);
  const [savingScanAction, setSavingScanAction] = useState(false);
  const [vaccinationOpen, setVaccinationOpen] = useState(false);
  const [vaccineName, setVaccineName] = useState("");
  const [vaccineError, setVaccineError] = useState<string | null>(null);
  const [administeredOn, setAdministeredOn] = useState(getPhilippineDateKey);
  const [vaccinationDateError, setVaccinationDateError] = useState<string | null>(null);
  const [nextDueOn, setNextDueOn] = useState("");
  const [nextDueError, setNextDueError] = useState<string | null>(null);
  const [impoundOpen, setImpoundOpen] = useState(false);
  const [impoundSubmitting, setImpoundSubmitting] = useState(false);
  const [impoundError, setImpoundError] = useState<string | null>(null);
  const [impoundLocation, setImpoundLocation] = useState("");
  const [impoundDate, setImpoundDate] = useState(getPhilippineDateKey);

  const requestRegistration = async () => {
    if (savingScanActionRef.current) return;
    savingScanActionRef.current = true;
    setSavingScanAction(true);
    try {
      if (await onRequestRegistration(pet.id, scanId)) toast.success(`Registration request recorded for ${pet.name}.`);
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "Unable to save the request.");
    } finally {
      savingScanActionRef.current = false;
      setSavingScanAction(false);
    }
  };

  const submitVaccination = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    if (savingScanActionRef.current) return;
    const name = vaccineName.trim();
    if (!name || Array.from(name).length > MAX_VACCINE_NAME_LENGTH) {
      setVaccineError(`Enter a vaccine name up to ${MAX_VACCINE_NAME_LENGTH} characters.`);
      return;
    }
    setVaccineError(null);
    if (!isValidDateThroughToday(administeredOn)) {
      setVaccinationDateError("Enter a valid date on or before today (Philippine time).");
      return;
    }
    setVaccinationDateError(null);
    if (nextDueOn && nextDueOn <= administeredOn) {
      setNextDueError("The next due date must be after the date administered.");
      return;
    }
    setNextDueError(null);
    savingScanActionRef.current = true;
    setSavingScanAction(true);
    try {
      if (await onRecordVaccination(pet, name, administeredOn, nextDueOn || null)) {
        setVaccinationOpen(false);
        toast.success(`Vaccination saved to ${pet.name}'s health record.`);
      }
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "Unable to save the vaccination.");
    } finally {
      savingScanActionRef.current = false;
      setSavingScanAction(false);
    }
  };

  const submitImpound = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    if (impoundSubmittingRef.current) return;
    const location = impoundLocation.trim();
    if (!location || Array.from(location).length > 200) {
      setImpoundError("Enter the location where the animal was found, up to 200 characters.");
      return;
    }
    if (!isValidDateThroughToday(impoundDate)) {
      setImpoundError("Enter a valid impound date that is not in the future (Philippine time).");
      return;
    }
    impoundSubmittingRef.current = true;
    setImpoundSubmitting(true);
    setImpoundError(null);
    try {
      if (await onImpound(pet, location, impoundDate)) {
        setImpoundOpen(false);
        setImpoundLocation("");
        toast.success("Impound report submitted.");
      }
    } catch (error) {
      setImpoundError(error && typeof error === "object" && "message" in error && typeof error.message === "string" ? error.message : "Unable to submit the impound report. Try again.");
    } finally {
      impoundSubmittingRef.current = false;
      setImpoundSubmitting(false);
    }
  };

  return (
    <div className="pb-6">
      <ScannerHeading focusOnMount />
      <fieldset className="mt-4 px-5" disabled={savingScanAction}>
        <PetRecord
          pet={pet}
          onBack={onBack}
          onRecordVaccination={() => {
            setVaccineName("");
            setVaccineError(null);
            setAdministeredOn(getPhilippineDateKey());
            setVaccinationDateError(null);
            setNextDueOn("");
            setNextDueError(null);
            setVaccinationOpen(true);
          }}
          onRequestRegistration={() => void requestRegistration()}
          registrationRequested={registrationRequestPetIds.includes(pet.recordId)}
          onLogImpound={() => {
            setImpoundLocation(pet.barangay);
            setImpoundDate(getPhilippineDateKey());
            setImpoundError(null);
            setImpoundOpen(true);
          }}
          onScanAnother={onScanAnother}
        />
        {savingScanAction && !vaccinationOpen ? <p role="status" className="mt-2 text-xs text-muted-foreground">Saving request...</p> : null}
      </fieldset>

      <Dialog open={vaccinationOpen} onOpenChange={(open) => { if (!savingScanActionRef.current) setVaccinationOpen(open); }}>
        <DialogContent className="max-h-[90dvh] w-[calc(100%-2rem)] max-w-[440px] overflow-y-auto rounded-xl border-border bg-card">
          <DialogHeader>
            <DialogTitle>Record vaccination</DialogTitle>
            <DialogDescription>Save the vaccine given to {pet.name} in the pet’s health record.</DialogDescription>
          </DialogHeader>
          <form onSubmit={submitVaccination} className="space-y-3">
            <div className="space-y-1.5">
              <Label htmlFor="vaccine-name">Vaccine name</Label>
              <Input
                id="vaccine-name"
                value={vaccineName}
                onChange={(event) => {
                  setVaccineName(event.target.value);
                  setVaccineError(null);
                }}
                required
                maxLength={MAX_VACCINE_NAME_LENGTH}
                disabled={savingScanAction}
                aria-invalid={vaccineError ? true : undefined}
                aria-describedby={vaccineError ? "vaccine-name-error" : undefined}
                placeholder="Type the vaccine name"
              />
              {vaccineError ? <p id="vaccine-name-error" role="alert" className="text-xs text-destructive">{vaccineError}</p> : null}
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="vaccination-date">Date administered</Label>
              <Input
                id="vaccination-date"
                type="date"
                value={administeredOn}
                onChange={(event) => {
                  setAdministeredOn(event.target.value);
                  setVaccinationDateError(null);
                }}
                min={MIN_CALENDAR_DATE}
                max={getPhilippineDateKey()}
                required
                disabled={savingScanAction}
                aria-invalid={vaccinationDateError ? true : undefined}
                aria-describedby={vaccinationDateError ? "last-vaccination-date-error" : undefined}
              />
              {vaccinationDateError ? (
                <p id="last-vaccination-date-error" role="alert" className="text-xs text-destructive">{vaccinationDateError}</p>
              ) : null}
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="vaccination-next-due">Next due date</Label>
              <Input id="vaccination-next-due" type="date" value={nextDueOn} min={administeredOn} max="9999-12-31"
                onChange={(event) => { setNextDueOn(event.target.value); setNextDueError(null); }}
                disabled={savingScanAction} aria-invalid={Boolean(nextDueError)}
                aria-describedby={nextDueError ? "vaccination-next-due-error" : undefined} />
              {nextDueError ? <p id="vaccination-next-due-error" role="alert" className="text-xs text-destructive">{nextDueError}</p> : null}
              <p className="text-xs text-muted-foreground">The owner can receive email reminders when a due date is set.</p>
            </div>
            <div className="flex justify-end gap-2">
              <Button type="button" variant="outline" disabled={savingScanAction} onClick={() => setVaccinationOpen(false)}>Cancel</Button>
              <Button type="submit" disabled={savingScanAction}>{savingScanAction ? "Saving…" : "Save vaccination"}</Button>
            </div>
          </form>
        </DialogContent>
      </Dialog>

      <Dialog open={impoundOpen} onOpenChange={(open) => { if (!impoundSubmittingRef.current) setImpoundOpen(open); }}>
        <DialogContent className="max-h-[90vh] overflow-y-auto rounded-xl border-border bg-card sm:max-w-[440px]">
          <DialogHeader>
            <DialogTitle>Report impound</DialogTitle>
            <DialogDescription>
              {`${pet.name} • Owner ${pet.owner} (${pet.contact}) • Barangay ${pet.barangay}`}
            </DialogDescription>
          </DialogHeader>
          <form onSubmit={submitImpound} className="space-y-3">
            <div className="space-y-1.5">
              <Label htmlFor="impound-location">Location where found</Label>
              <Input id="impound-location" value={impoundLocation} onChange={(event) => setImpoundLocation(event.target.value)} required maxLength={200} disabled={impoundSubmitting} placeholder="Barangay, street, landmark" />
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="impound-date">Date impounded</Label>
              <Input id="impound-date" type="date" value={impoundDate} onChange={(event) => setImpoundDate(event.target.value)} required min={MIN_CALENDAR_DATE} max={getPhilippineDateKey()} disabled={impoundSubmitting} />
            </div>
            {impoundError ? <p role="alert" className="text-xs text-destructive">{impoundError}</p> : null}
            <div className="flex justify-end gap-2">
              <Button type="button" variant="outline" disabled={impoundSubmitting} onClick={() => setImpoundOpen(false)}>Cancel</Button>
              <Button type="submit" disabled={impoundSubmitting}>{impoundSubmitting ? "Submitting..." : "Submit report"}</Button>
            </div>
          </form>
        </DialogContent>
      </Dialog>
    </div>
  );
}
