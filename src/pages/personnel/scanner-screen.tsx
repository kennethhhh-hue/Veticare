import { useEffect, useRef, useState, type FormEvent } from "react";
import { BrowserQRCodeReader } from "@zxing/browser";
import { BadgeCheck, Camera, CameraOff, QrCode, ScanLine, TriangleAlert } from "lucide-react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { cn } from "@/lib/utils";
import { PetRecord } from "@/pages/personnel/pet-record";
import {
  type PersonnelPet,
  type ScanResult,
} from "@/data/personnel";

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
  onRecord: (pet: PersonnelPet, result: ScanResult, note: string) => string;
  onFlagScan: (scanId: string) => void;
  onImpound: (pet: PersonnelPet, locationFound: string, dateImpounded: string, reason: string) => void;
}

export function ScannerScreen({ pets, onRecord, onFlagScan, onImpound }: ScannerScreenProps) {
  const videoRef = useRef<HTMLVideoElement>(null);
  const cameraControlsRef = useRef<{ stop: () => void } | null>(null);
  const scanCompletedRef = useRef(false);
  const [phase, setPhase] = useState<"idle" | "result">("idle");
  const [cameraStarting, setCameraStarting] = useState(false);
  const [cameraActive, setCameraActive] = useState(false);
  const [cameraError, setCameraError] = useState<string | null>(null);
  const [pet, setPet] = useState<PersonnelPet | null>(null);
  const [scanId, setScanId] = useState<string | null>(null);
  const [flagged, setFlagged] = useState(false);
  const [manualOpen, setManualOpen] = useState(false);
  const [manualValue, setManualValue] = useState("");
  const [manualError, setManualError] = useState<string | null>(null);
  const [impoundOpen, setImpoundOpen] = useState(false);
  const [impoundLocation, setImpoundLocation] = useState("");
  const [impoundDate, setImpoundDate] = useState(new Date().toISOString().slice(0, 10));
  const [impoundReason, setImpoundReason] = useState("");

  useEffect(() => () => cameraControlsRef.current?.stop(), []);

  const finishScan = (nextPet: PersonnelPet) => {
    const result = deriveResult(nextPet);
    const id = onRecord(nextPet, result, resultNote(nextPet, result));
    setPet(nextPet);
    setScanId(id);
    setFlagged(false);
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
            : "Vaccination or renewal is due.",
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
          finishScan(match);
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
        item.name.toLowerCase() === query ||
        item.rfidTag?.replace(/[\s-]/g, "").toLowerCase() === normalizedQuery ||
        item.microchip?.replace(/[\s-]/g, "").toLowerCase() === normalizedQuery,
    );
    if (!match) {
      setManualError("No pet found for that ID. Check the registration number.");
      return;
    }
    setManualError(null);
    setManualOpen(false);
    setManualValue("");
    finishScan(match);
  };

  const reset = () => {
    stopCamera();
    setCameraError(null);
    setPet(null);
    setScanId(null);
    setFlagged(false);
    setPhase("idle");
  };

  const handleFlag = () => {
    if (!scanId || !pet) return;
    onFlagScan(scanId);
    setFlagged(true);
    toast.info(`${pet.name} flagged for OCVAS review`, {
      description: "The scan was logged for follow-up by the city vet office.",
    });
  };

  const submitImpound = (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    if (!pet) return;
    onImpound(pet, impoundLocation.trim(), impoundDate, impoundReason.trim());
    setImpoundOpen(false);
    setImpoundLocation("");
    setImpoundReason("");
    toast.success("Impound report recorded.", {
      description: `Notice preview prepared for ${pet.owner} and Barangay ${pet.barangay}. No message was sent.`,
    });
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
          <PetRecord
            pet={pet}
            mode="scan"
            onBack={reset}
            onFlag={handleFlag}
            onLogImpound={() => {
              setImpoundLocation(pet.barangay);
              setImpoundOpen(true);
            }}
            onScanAnother={reset}
            flagged={flagged}
          />
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
              disabled={cameraStarting}
              className="h-11 w-full rounded-xl text-[12px] font-bold shadow-glow"
            >
              {cameraActive ? <CameraOff className="size-4" /> : <ScanLine className="size-4" />}
              {cameraStarting ? "Opening camera…" : cameraActive ? "Stop camera" : "Start camera"}
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
              Enter pet ID / RFID manually
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
                    placeholder="Pet ID, RFID tag, or name"
                    aria-label="Pet ID, RFID tag, or pet name"
                    className="h-9 rounded-lg border-border text-[11.5px]"
                  />
                  <Button
                    onClick={submitManual}
                    className="h-9 shrink-0 rounded-lg px-3 text-[11px] font-bold"
                  >
                    Find
                  </Button>
                </div>
                {manualError ? (
                  <p className="text-[9.5px] font-medium text-destructive">{manualError}</p>
                ) : (
                    <p className="text-[9px] text-muted-foreground">
                      Connect a compatible collar RFID reader in keyboard mode, focus this field, and scan; you can also type the tag code.
                  </p>
                )}
              </div>
            ) : null}

            <div className="flex items-start gap-2 rounded-xl border border-info/20 bg-info/5 p-2.5">
              <TriangleAlert className="mt-0.5 size-3.5 shrink-0 text-info" />
              <p className="text-[9.5px] leading-relaxed text-muted-foreground">
                Camera scans QR codes. Collar RFID requires a separate compatible RFID reader; if it works as a keyboard, focus the manual field and scan there. Camera permission requires HTTPS or localhost.
              </p>
            </div>

            <div className="flex items-center justify-center gap-1.5 pt-1 text-[9px] text-muted-foreground/80">
              <BadgeCheck className="size-3 text-primary" />
              Every scan is recorded for accountability
            </div>
          </div>
        )}
      </div>

      <Dialog open={impoundOpen} onOpenChange={setImpoundOpen}>
        <DialogContent className="max-h-[90vh] overflow-y-auto rounded-xl border-border bg-card sm:max-w-[440px]">
          <DialogHeader>
            <DialogTitle>Log impound &amp; prepare notices</DialogTitle>
            <DialogDescription>
              {pet ? `${pet.name} • Owner ${pet.owner} (${pet.contact}) • Barangay ${pet.barangay}` : "Record the impound details."}
            </DialogDescription>
          </DialogHeader>
          {pet ? (
            <form onSubmit={submitImpound} className="space-y-3">
              <div className="space-y-1.5">
                <Label htmlFor="impound-location">Location where found</Label>
                <Input id="impound-location" value={impoundLocation} onChange={(event) => setImpoundLocation(event.target.value)} required placeholder="Barangay, street, landmark" />
              </div>
              <div className="space-y-1.5">
                <Label htmlFor="impound-date">Date impounded</Label>
                <Input id="impound-date" type="date" value={impoundDate} onChange={(event) => setImpoundDate(event.target.value)} required />
              </div>
              <div className="space-y-1.5">
                <Label htmlFor="impound-reason">Reason / field notes</Label>
                <Textarea id="impound-reason" value={impoundReason} onChange={(event) => setImpoundReason(event.target.value)} required maxLength={400} placeholder="Why was the animal brought to the pound?" />
              </div>
              <div className="rounded-lg border border-warning/25 bg-warning/10 p-2.5 text-[9.5px] leading-relaxed text-muted-foreground">
                This preview prepares owner and barangay notice entries locally. SMS/email delivery is not enabled yet.
              </div>
              <div className="flex justify-end gap-2">
                <Button type="button" variant="outline" onClick={() => setImpoundOpen(false)}>Cancel</Button>
                <Button type="submit">Save report &amp; notice preview</Button>
              </div>
            </form>
          ) : null}
        </DialogContent>
      </Dialog>
    </div>
  );
}
