import { useRef, useState, type ChangeEvent, type FormEvent } from "react";
import { FunctionsHttpError } from "@supabase/supabase-js";
import {
  ArrowLeft,
  CalendarClock,
  IdCard,
  Syringe,
} from "lucide-react";
import { toast } from "sonner";
import { PetPhoto } from "@/components/owner-app/pet-photo";
import { Button } from "@/components/ui/button";
import type { OwnerPet, OwnerRequestInput } from "@/data/owner-app";
import { formatCalendarDate, getPhilippineDateKey } from "@/lib/philippine-date";
import { usePetVaccinations } from "@/hooks/use-pet-vaccinations";
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { supabase } from "@/integrations/supabase/client";

const photoTypes = ["image/jpeg", "image/png", "image/webp"];

interface PetDetailProps {
  pet: OwnerPet;
  onBack: () => void;
  onShowId: (pet: OwnerPet) => void;
  onPhotoUpdated: (petId: string, photoUrl: string) => void;
  onRequest: (request: OwnerRequestInput) => Promise<boolean>;
}

export function PetDetail({ pet, onBack, onShowId, onPhotoUpdated, onRequest }: PetDetailProps) {
  const { vaccinations } = usePetVaccinations(pet.id);
  const [visitOpen, setVisitOpen] = useState(false);
  const [visitDate, setVisitDate] = useState("");
  const requestLock = useRef(false);
  const [savingRequest, setSavingRequest] = useState(false);
  const photoInput = useRef<HTMLInputElement>(null);
  const [uploadingPhoto, setUploadingPhoto] = useState(false);

  const changePhoto = async (event: ChangeEvent<HTMLInputElement>) => {
    const photo = event.currentTarget.files?.[0];
    event.currentTarget.value = "";
    if (!photo || uploadingPhoto) return;
    if (!photo.size || !photoTypes.includes(photo.type)) {
      toast.error("Choose a JPG, PNG, or WebP image.");
      return;
    }
    if (photo.size > 5 * 1024 * 1024) {
      toast.error("The pet photo must be 5 MB or smaller.");
      return;
    }

    const body = new FormData();
    body.set("petId", pet.id);
    body.set("photo", photo);
    setUploadingPhoto(true);
    try {
      const { data, error } = await supabase.functions.invoke<{ photoUrl: string }>("owner-pet-photo", { body });
      if (error) {
        const details = error instanceof FunctionsHttpError ? await error.context.json().catch(() => null) : null;
        throw new Error(typeof details?.error === "string" ? details.error : error.message);
      }
      if (!data?.photoUrl) throw new Error("The server did not confirm the photo update.");
      onPhotoUpdated(pet.id, data.photoUrl);
      toast.success(`${pet.name}'s photo updated.`);
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "Unable to change the pet photo.");
    } finally {
      setUploadingPhoto(false);
    }
  };

  const submitVisitRequest = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    if (requestLock.current) return;
    if (visitDate < getPhilippineDateKey()) {
      toast.error("Choose today or a future date.");
      return;
    }
    requestLock.current = true;
    setSavingRequest(true);
    try {
      if (await onRequest({ type: "visit", preferredDate: visitDate, petId: pet.id })) {
        setVisitOpen(false);
        setVisitDate("");
        toast.success(`Request submitted for ${pet.name}.`);
      }
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "Unable to submit the request.");
    } finally {
      requestLock.current = false;
      setSavingRequest(false);
    }
  };

  const changeVisitDialog = (open: boolean) => {
    if (!requestLock.current) setVisitOpen(open);
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
        <Button
          type="button"
          size="sm"
          variant="outline"
          onClick={() => photoInput.current?.click()}
          disabled={uploadingPhoto}
          className="absolute right-4 top-4 h-9 rounded-full border-transparent bg-card/90 text-[11px] backdrop-blur hover:bg-card"
        >
          <span aria-hidden="true">📷</span>{uploadingPhoto ? "Uploading…" : "Change Photo"}
        </Button>
        <input ref={photoInput} type="file" accept={photoTypes.join(",")} onChange={(event) => void changePhoto(event)} hidden />
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

        <section aria-labelledby="pet-vaccination-history" className="mt-4 space-y-2 rounded-2xl border border-border bg-card p-3.5">
          <h2 id="pet-vaccination-history" className="flex items-center gap-1.5 text-[12px] font-extrabold text-foreground">
            <Syringe className="size-3.5 text-primary" aria-hidden="true" />
            Vaccination history
          </h2>
          {vaccinations.isPending ? <p role="status" className="text-[10.5px] text-muted-foreground">Loading vaccination records…</p> : null}
          {vaccinations.isError ? <p role="alert" className="text-[10.5px] text-destructive">Vaccination records are currently unavailable.</p> : null}
          {vaccinations.data?.length ? (
            <ul className="divide-y divide-border">
              {vaccinations.data.map((record) => (
                <li key={record.id} className="flex items-start justify-between gap-3 py-2 text-[11px]">
                  <span className="min-w-0 break-words font-semibold text-foreground">{record.vaccine_name}</span>
                  <time dateTime={record.administered_on} className="shrink-0 text-muted-foreground">{formatCalendarDate(record.administered_on)}</time>
                </li>
              ))}
            </ul>
          ) : vaccinations.isSuccess ? (
            <p className="text-[10.5px] text-muted-foreground">No vaccinations recorded.</p>
          ) : null}
        </section>

        <Button
          onClick={() => onShowId(pet)}
          disabled={pet.registrationStatus !== "approved"}
          className="mt-4 h-11 w-full rounded-xl text-[12px] font-bold shadow-glow"
        >
          <IdCard className="size-4" />
          {pet.registrationStatus === "approved" ? "Show digital pet ID" : "Digital ID after approval"}
        </Button>
      </div>

      <Dialog open={visitOpen} onOpenChange={changeVisitDialog}>
        <DialogContent className="rounded-xl border-border bg-card sm:max-w-[420px]">
          <DialogHeader><DialogTitle>Book a vet visit</DialogTitle><DialogDescription>Submit a preferred appointment date for {pet.name} for review.</DialogDescription></DialogHeader>
          <form onSubmit={(event) => void submitVisitRequest(event)} className="space-y-3">
            <div className="space-y-1.5"><Label htmlFor="visit-date">Preferred date</Label><Input id="visit-date" type="date" min={getPhilippineDateKey()} value={visitDate} onChange={(event) => setVisitDate(event.target.value)} required /></div>
            <div className="flex justify-end gap-2"><Button type="button" variant="outline" disabled={savingRequest} onClick={() => setVisitOpen(false)}>Cancel</Button><Button type="submit" disabled={savingRequest}>{savingRequest ? "Submitting…" : "Submit request"}</Button></div>
          </form>
        </DialogContent>
      </Dialog>
    </div>
  );
}
