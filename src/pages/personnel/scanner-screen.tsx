import { useEffect, useRef, useState, type FormEvent } from "react";
import { BrowserQRCodeReader } from "@zxing/browser";
import { BadgeCheck, Camera, CameraOff, QrCode, ScanLine, TriangleAlert } from "lucide-react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { cn } from "@/lib/utils";
import { getPhilippineDateKey } from "@/lib/philippine-date";
import { PetRecord } from "@/pages/personnel/pet-record";
import {
  scanFollowUpLabels,
  type PersonnelPet,
  type ScanFollowUp,
  type ScanFollowUpRequest,
  type ScanResult,
} from "@/data/personnel";

const MAX_VACCINE_NAME_LENGTH = 120;
const MIN_CALENDAR_DATE = "0001-01-01";

function isValidDateThroughToday(value: string) {
  if (!/^\d{4}-\d{2}-\d{2}$/.test(value) || value < MIN_CALENDAR_DATE || value > getPhilippineDateKey()) {
    return false;
  }
  const parsedDate = new Date(`${value}T00:00:00Z`);
  return !Number.isNaN(parsedDate.getTime()) && parsedDate.toISOString().slice(0, 10) === value;
}

const deriveResult = (pet: PersonnelPet): ScanResult => {
  if (pet.registration === "unregistered") return "unregistered";
  if (pet.registration === "expired") return "expired";
  if (pet.registration === "expiring" || pet.vaccination !== "complete") return "flagged";
  return "verified";
};

const resultNote = (pet: PersonnelPet, result: ScanResult) => {
  if (result === "unregistered") return "QR resolved to an unissued registration.";
  if (result === "expired") return `Registration expired ${pet.validThrough}.`;
  if (result === "flagged") {
    return pet.registration === "expiring"
      ? `Registration expiring ${pet.validThrough}.`
      : `${pet.lastVaccine}; vaccination needs attention.`;
  }
  return "Registration and vaccination are current.";
};

interface ScannerScreenProps {
  pets: PersonnelPet[];
  openFollowUps: { pet_record_id: string; request_type: ScanFollowUp }[];
  onRecord: (pet: PersonnelPet, result: ScanResult, note: string) => Promise<string | null>;
  onRequestFollowUp: (scanId: string, petId: string, request: ScanFollowUpRequest) => Promise<boolean>;
  onImpound: (pet: PersonnelPet, locationFound: string, dateImpounded: string) => Promise<boolean>;
}

export function ScannerScreen({ pets, openFollowUps, onRecord, onRequestFollowUp, onImpound }: ScannerScreenProps) {
  const videoRef = useRef<HTMLVideoElement>(null);
  const cameraControlsRef = useRef<{ stop: () => void } | null>(null);
  const scanCompletedRef = useRef(false);
  const submittingRef = useRef(false);
  const savingFollowUpRef = useRef(false);
  const impoundSubmittingRef = useRef(false);
  const [phase, setPhase] = useState<"idle" | "result">("idle");
  const [cameraStarting, setCameraStarting] = useState(false);
  const [cameraActive, setCameraActive] = useState(false);
  const [cameraError, setCameraError] = useState<string | null>(null);
  const [recording, setRecording] = useState(false);
  const [savingFollowUp, setSavingFollowUp] = useState(false);
  const [pet, setPet] = useState<PersonnelPet | null>(null);
  const [scanId, setScanId] = useState<string | null>(null);
  const [manualOpen, setManualOpen] = useState(false);
  const [manualValue, setManualValue] = useState("");
  const [manualError, setManualError] = useState<string | null>(null);
  const [vaccinationOpen, setVaccinationOpen] = useState(false);
  const [vaccineName, setVaccineName] = useState("");
  const [vaccineError, setVaccineError] = useState<string | null>(null);
  const [lastVaccinationDate, setLastVaccinationDate] = useState("");
  const [vaccinationDateError, setVaccinationDateError] = useState<string | null>(null);
  const [impoundOpen, setImpoundOpen] = useState(false);
  const [impoundSubmitting, setImpoundSubmitting] = useState(false);
  const [impoundError, setImpoundError] = useState<string | null>(null);
  const [impoundLocation, setImpoundLocation] = useState("");
  const [impoundDate, setImpoundDate] = useState(getPhilippineDateKey);

  useEffect(() => () => cameraControlsRef.current?.stop(), []);

  const finishScan = async (nextPet: PersonnelPet) => {
    if (submittingRef.current) return;
    submittingRef.current = true;
    setRecording(true);
    const result = deriveResult(nextPet);
    let id: string | null;
    try {
      id = await onRecord(nextPet, result, resultNote(nextPet, result));
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "Unable to record the scan.");
      id = null;
    } finally {
      submittingRef.current = false;
      setRecording(false);
    }
    if (!id) {
      setCameraError("Scan was not recorded. Try again.");
      return;
    }
    setPet(nextPet);
    setScanId(id);
    setManualOpen(false);
    setManualValue("");
    setPhase("result");
    if (result === "verified") {
      toast.success(`${nextPet.name} verified`, {
        description: "Registration and vaccination are current.",
      });
    } else {
      toast.warning(`${nextPet.name} needs attention`, {
        description: result === "expired"
          ? "Registration is expired. Advise the owner to renew."
          : result === "unregistered"
            ? "No active registration was found for this QR."
            : nextPet.vaccination === "unknown" && !nextPet.lastVaccinatedOn ? nextPet.lastVaccine : "Vaccination or renewal needs review.",
      });
    }
  };

  const stopCamera = () => {
    cameraControlsRef.current?.stop();
    cameraControlsRef.current = null;
    setCameraActive(false);
  };

  const startCamera = async () => {
    if (!navigator.mediaDevices?.getUserMedia) {
      setCameraError("Camera access needs HTTPS or localhost. Open this app on a secure connection.");
      return;
    }
    if (!videoRef.current) return;

    setCameraStarting(true);
    setCameraError(null);
    scanCompletedRef.current = false;
    try {
      const reader = new BrowserQRCodeReader();
      const controls = await reader.decodeFromVideoDevice(
        undefined,
        videoRef.current,
        (result, _error, scannerControls) => {
          if (!result) return;
          if (scanCompletedRef.current) return;
          const scannedValue = result.getText().trim();
          const normalizedValue = scannedValue.replace(/[\s-]/g, "").toLowerCase();
          const match = pets.find((item) =>
            [item.id, item.qrCode]
              .filter((value): value is string => Boolean(value))
              .some((value) => value.replace(/[\s-]/g, "").toLowerCase() === normalizedValue),
          );

          if (!match) {
            setCameraError(`QR code read, but no approved pet matches “${scannedValue}”.`);
            return;
          }

          scanCompletedRef.current = true;
          scannerControls.stop();
          cameraControlsRef.current = null;
          setCameraActive(false);
          void finishScan(match);
        },
      );
      if (scanCompletedRef.current) {
        controls.stop();
      } else {
        cameraControlsRef.current = controls;
        setCameraActive(true);
      }
    } catch (error) {
      stopCamera();
      const message = error instanceof Error ? error.message : "Unable to access the camera.";
      setCameraError(message.toLowerCase().includes("permission")
        ? "Camera permission was denied. Allow camera access for this site, then try again."
        : message);
    } finally {
      setCameraStarting(false);
    }
  };

  const submitManual = () => {
    if (submittingRef.current) return;
    const query = manualValue.trim().toLowerCase();
    const normalizedQuery = query.replace(/[\s-]/g, "");
    if (!query) {
      setManualError("Enter a pet ID or name.");
      return;
    }
    const match = pets.find(
      (item) =>
        item.id.toLowerCase() === query ||
        item.id.toLowerCase().endsWith(query) ||
        item.qrCode?.replace(/[\s-]/g, "").toLowerCase() === normalizedQuery ||
        item.name.toLowerCase() === query,
    );
    if (!match) {
      setManualError("No pet found for that ID. Check the registration number.");
      return;
    }
    setManualError(null);
    scanCompletedRef.current = true;
    stopCamera();
    void finishScan(match);
  };

  const reset = () => {
    stopCamera();
    setCameraError(null);
    setPet(null);
    setScanId(null);
    setPhase("idle");
  };

  const handleFollowUp = async (request: ScanFollowUpRequest): Promise<boolean> => {
    if (!scanId || !pet || savingFollowUpRef.current) return false;
    savingFollowUpRef.current = true;
    setSavingFollowUp(true);
    try {
      const saved = await onRequestFollowUp(scanId, pet.id, request);
      if (saved) toast.success(`${scanFollowUpLabels[request.type]} request recorded for ${pet.name}.`);
      return saved;
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "Unable to save the request.");
      return false;
    } finally {
      savingFollowUpRef.current = false;
      setSavingFollowUp(false);
    }
  };

  const submitVaccination = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    const name = vaccineName.trim();
    if (!name || Array.from(name).length > MAX_VACCINE_NAME_LENGTH) {
      setVaccineError(`Enter a vaccine name up to ${MAX_VACCINE_NAME_LENGTH} characters.`);
      return;
    }
    setVaccineError(null);
    if (lastVaccinationDate && !isValidDateThroughToday(lastVaccinationDate)) {
      setVaccinationDateError("Enter a valid date on or before today (Philippine time).");
      return;
    }
    setVaccinationDateError(null);
    if (await handleFollowUp({
      type: "vaccination",
      vaccineName: name,
      lastVaccinationDate: lastVaccinationDate || null,
    })) {
      setVaccinationOpen(false);
    }
  };

  const submitImpound = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    if (!pet || impoundSubmittingRef.current) return;
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
      <header className="px-5 pt-5">
        <p className="text-[9.5px] font-bold uppercase tracking-[0.16em] text-primary">
          City Pound field tool
        </p>
        <div className="mt-1 flex items-center justify-between gap-2">
          <h1 className="text-[24px] font-extrabold leading-none tracking-[-0.03em] text-foreground">
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

      <div className="mt-4 px-5">
        {phase === "result" && pet ? (
          <fieldset disabled={savingFollowUp}>
            <PetRecord
              pet={pet}
              mode="scan"
              onBack={reset}
              onRequestFollowUp={(type) => {
                if (type === "vaccination") {
                  setVaccineName("");
                  setVaccineError(null);
                  setLastVaccinationDate("");
                  setVaccinationDateError(null);
                  setVaccinationOpen(true);
                } else {
                  void handleFollowUp({ type: "registration" });
                }
              }}
              requestedFollowUps={openFollowUps
                .filter((request) => request.pet_record_id === pet.recordId)
                .map((request) => request.request_type)}
              onLogImpound={() => {
                setImpoundLocation(pet.barangay);
                setImpoundDate(getPhilippineDateKey());
                setImpoundError(null);
                setImpoundOpen(true);
              }}
              onScanAnother={reset}
            />
            {savingFollowUp ? <p role="status" className="mt-2 text-xs text-muted-foreground">Saving request...</p> : null}
          </fieldset>
        ) : (
          <div className="space-y-3">
            <div className="relative mx-auto aspect-[4/5] w-full max-w-[248px] overflow-hidden rounded-2xl bg-foreground shadow-raised">
              <div className="absolute inset-0 bg-[radial-gradient(circle_at_50%_40%,hsl(var(--primary)/0.28),transparent_65%)]" />
              {[
                "left-6 top-6 border-l-2 border-t-2 rounded-tl-lg",
                "right-6 top-6 border-r-2 border-t-2 rounded-tr-lg",
                "left-6 bottom-6 border-b-2 border-l-2 rounded-bl-lg",
                "right-6 bottom-6 border-b-2 border-r-2 rounded-br-lg",
              ].map((position) => (
                <span key={position} className={cn("absolute size-8 border-primary/80", position)} />
              ))}

              <video
                ref={videoRef}
                className={`size-full object-cover ${cameraActive ? "" : "hidden"}`}
                muted
                autoPlay
                playsInline
                aria-label="Live QR camera preview"
              />
              {!cameraActive ? (
                <div className="absolute inset-0 flex flex-col items-center justify-center gap-2 text-primary-foreground/55">
                  <QrCode className="size-14" strokeWidth={1.2} />
                  <p className="max-w-[150px] text-center text-[9.5px] font-medium leading-relaxed">
                    Camera is off
                  </p>
                </div>
              ) : null}

              {cameraActive ? (
                <>
                  <span className="scan-line absolute left-8 right-8 h-0.5 rounded-full bg-primary shadow-[0_0_12px_hsl(var(--primary))]" />
                  <span className="absolute bottom-3 left-1/2 -translate-x-1/2 rounded-full bg-black/55 px-2 py-0.5 text-[8px] font-semibold uppercase tracking-[0.14em] text-white">
                    Scanning QR
                  </span>
                </>
              ) : null}
            </div>

            <Button
              onClick={cameraActive ? stopCamera : startCamera}
              disabled={cameraStarting || recording}
              className="h-11 w-full rounded-xl text-[12px] font-bold shadow-glow"
            >
              {cameraActive ? <CameraOff className="size-4" /> : <ScanLine className="size-4" />}
              {recording ? "Recording scan..." : cameraStarting ? "Opening camera…" : cameraActive ? "Stop camera" : "Start camera"}
            </Button>

            {cameraError ? (
              <p className="rounded-lg border border-warning/30 bg-warning/10 p-2.5 text-[10px] leading-relaxed text-foreground" role="status">
                {cameraError}
              </p>
            ) : null}

            <button
              type="button"
              onClick={() => setManualOpen((value) => !value)}
              className="flex w-full items-center justify-center gap-1.5 py-1.5 text-[10.5px] font-semibold text-muted-foreground hover:text-foreground"
            >
              <QrCode className="size-3.5" />
              Enter Pet ID manually
            </button>

            {manualOpen ? (
              <div className="space-y-1.5 rounded-xl border border-border bg-card p-2.5">
                <div className="flex items-center gap-1.5">
                  <Input
                    value={manualValue}
                    onChange={(event) => setManualValue(event.target.value)}
                    onKeyDown={(event) => {
                      if (event.key === "Enter") {
                        event.preventDefault();
                        submitManual();
                      }
                    }}
                    placeholder="Pet ID or pet name"
                    aria-label="Pet ID or pet name"
                    className="h-9 rounded-lg border-border text-[11.5px]"
                  />
                  <Button
                    onClick={submitManual}
                    disabled={recording}
                    className="h-9 shrink-0 rounded-lg px-3 text-[11px] font-bold"
                  >
                    Find
                  </Button>
                </div>
                {manualError ? (
                  <p className="text-[9.5px] font-medium text-destructive">{manualError}</p>
                ) : (
                    <p className="text-[9px] text-muted-foreground">
                      Type the Pet ID shown on the digital card or search by the pet's name.
                  </p>
                )}
              </div>
            ) : null}

            <div className="flex items-start gap-2 rounded-xl border border-info/20 bg-info/5 p-2.5">
              <TriangleAlert className="mt-0.5 size-3.5 shrink-0 text-info" />
              <p className="text-[9.5px] leading-relaxed text-muted-foreground">
                Scan the QR code on the digital Pet ID. Camera access requires HTTPS or localhost.
              </p>
            </div>

            <div className="flex items-center justify-center gap-1.5 pt-1 text-[9px] text-muted-foreground/80">
              <BadgeCheck className="size-3 text-primary" />
              Matched scans are recorded for accountability
            </div>
          </div>
        )}
      </div>

      <Dialog open={vaccinationOpen} onOpenChange={(open) => { if (!savingFollowUpRef.current) setVaccinationOpen(open); }}>
        <DialogContent className="max-h-[90dvh] w-[calc(100%-2rem)] max-w-[440px] overflow-y-auto rounded-xl border-border bg-card">
          <DialogHeader>
            <DialogTitle>For Vaccination</DialogTitle>
            <DialogDescription>{pet?.name}</DialogDescription>
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
                disabled={savingFollowUp}
                aria-invalid={vaccineError ? true : undefined}
                aria-describedby={vaccineError ? "vaccine-name-error" : undefined}
                placeholder="Type the vaccine name"
              />
              {vaccineError ? <p id="vaccine-name-error" role="alert" className="text-xs text-destructive">{vaccineError}</p> : null}
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="last-vaccination-date">
                Last vaccination date <span className="font-normal text-muted-foreground">(optional)</span>
              </Label>
              <Input
                id="last-vaccination-date"
                type="date"
                value={lastVaccinationDate}
                onChange={(event) => {
                  setLastVaccinationDate(event.target.value);
                  setVaccinationDateError(null);
                }}
                min={MIN_CALENDAR_DATE}
                max={getPhilippineDateKey()}
                disabled={savingFollowUp}
                aria-invalid={vaccinationDateError ? true : undefined}
                aria-describedby={vaccinationDateError ? "last-vaccination-date-error" : undefined}
              />
              {vaccinationDateError ? (
                <p id="last-vaccination-date-error" role="alert" className="text-xs text-destructive">{vaccinationDateError}</p>
              ) : null}
            </div>
            <div className="flex justify-end gap-2">
              <Button type="button" variant="outline" disabled={savingFollowUp} onClick={() => setVaccinationOpen(false)}>Cancel</Button>
              <Button type="submit" disabled={savingFollowUp}>{savingFollowUp ? "Saving..." : "Save request"}</Button>
            </div>
          </form>
        </DialogContent>
      </Dialog>

      <Dialog open={impoundOpen} onOpenChange={(open) => { if (!impoundSubmittingRef.current) setImpoundOpen(open); }}>
        <DialogContent className="max-h-[90vh] overflow-y-auto rounded-xl border-border bg-card sm:max-w-[440px]">
          <DialogHeader>
            <DialogTitle>Report impound</DialogTitle>
            <DialogDescription>
              {pet ? `${pet.name} • Owner ${pet.owner} (${pet.contact}) • Barangay ${pet.barangay}` : "Record the impound details."}
            </DialogDescription>
          </DialogHeader>
          {pet ? (
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
          ) : null}
        </DialogContent>
      </Dialog>
    </div>
  );
}
