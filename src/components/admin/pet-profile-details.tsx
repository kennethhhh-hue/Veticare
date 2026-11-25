import { QRCodeSVG } from "qrcode.react";
import { PetVaccinationRecords } from "@/components/admin/pet-vaccination-records";
import { StatusPill } from "@/components/admin/status-pill";
import { PetPhoto } from "@/components/owner-app/pet-photo";
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { ImpoundClaimBadge } from "@/components/veticare/impound-claim-badge";
import type { PetRegistration } from "@/data/admin-records";

type PetProfile = Pick<
  PetRegistration,
  "id" | "name" | "species" | "breed" | "gender" | "age" | "weight" | "color" |
  "photoUrl" | "status" | "impoundClaimed" | "owner" | "phone" | "registered" | "petId" | "qrCode"
>;

export function PetProfileDetails({ pet }: { pet: PetProfile }) {
  const photoUrl = pet.photoUrl?.trim() || undefined;

  return (
    <>
      <div className="flex items-center gap-3">
        <div className="relative shrink-0">
          <PetPhoto src={photoUrl} alt={pet.name} species={pet.species} className="size-20 rounded-xl" />
          {photoUrl ? (
            <Dialog>
              <DialogTrigger asChild>
                <button type="button" aria-label={`Enlarge ${pet.name}'s photo`} className="absolute inset-0 cursor-zoom-in rounded-xl hover:ring-2 hover:ring-primary/40 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary" />
              </DialogTrigger>
              <DialogContent className="max-h-[calc(100dvh-2rem)] w-[calc(100%-2rem)] max-w-[560px] overflow-y-auto rounded-xl border-border bg-card">
                <DialogHeader className="pr-6 text-left">
                  <DialogTitle>{pet.name}'s photo</DialogTitle>
                  <DialogDescription>Full-size pet photo preview.</DialogDescription>
                </DialogHeader>
                <PetPhoto
                  src={photoUrl}
                  alt={pet.name}
                  species={pet.species}
                  className="min-h-24 w-full rounded-xl [&_img]:h-auto [&_img]:max-h-[70dvh] [&_img]:object-contain"
                />
              </DialogContent>
            </Dialog>
          ) : null}
        </div>
        <div className="min-w-0">
          <p className="truncate text-lg font-bold text-foreground">{pet.name}</p>
          <p className="text-xs text-muted-foreground">{pet.breed} · {pet.species} · {pet.gender}</p>
          <div className="mt-2 flex flex-wrap items-center gap-1.5">
            <StatusPill status={pet.status} />
            {pet.impoundClaimed ? <ImpoundClaimBadge /> : null}
          </div>
        </div>
      </div>
      <dl className="grid grid-cols-2 gap-2">
        {[
          ["Age", pet.age || "Not provided"],
          ["Weight", pet.weight || "Not provided"],
          ["Color / markings", pet.color || "Not provided"],
          ["Owner", pet.owner],
          ["Contact", pet.phone],
          ["Submitted", pet.registered],
          ["Pet ID", pet.petId || "Assigned on approval"],
        ].map(([label, value]) => (
          <div key={label} className="min-w-0 rounded-lg bg-secondary/60 p-2.5">
            <dt className="text-[9px] font-bold uppercase text-muted-foreground">{label}</dt>
            <dd className="mt-1 break-words text-[11px] font-semibold text-foreground">{value}</dd>
          </div>
        ))}
      </dl>
      <div className="flex items-center justify-between gap-3 rounded-xl border border-border bg-card p-3">
        <div className="min-w-0">
          <p className="text-[9px] font-bold uppercase text-muted-foreground">QR code</p>
          <p className="mt-1 break-all text-[10px] font-semibold text-foreground">{pet.qrCode || "Available after approval"}</p>
        </div>
        {pet.qrCode ? (
          <Dialog>
            <DialogTrigger asChild>
              <button type="button" aria-label={`Enlarge ${pet.name}'s QR code`} className="shrink-0 cursor-zoom-in rounded-md bg-white p-1 hover:ring-2 hover:ring-primary/40 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary">
                <QRCodeSVG value={pet.qrCode} size={88} level="M" marginSize={1} aria-hidden="true" />
              </button>
            </DialogTrigger>
            <DialogContent className="max-h-[calc(100dvh-2rem)] w-[calc(100%-2rem)] max-w-[400px] overflow-y-auto rounded-xl border-border bg-card">
              <DialogHeader className="pr-6 text-left">
                <DialogTitle>{pet.name}'s QR code</DialogTitle>
                {pet.petId ? <DialogDescription>Pet ID: {pet.petId}</DialogDescription> : <DialogDescription>Scan this QR code to look up the pet record.</DialogDescription>}
              </DialogHeader>
              <QRCodeSVG value={pet.qrCode} size={320} level="M" marginSize={4} className="mx-auto h-auto w-full max-w-[320px] rounded-xl bg-white" title={`QR code for ${pet.petId ?? pet.name}`} />
            </DialogContent>
          </Dialog>
        ) : null}
      </div>
      <PetVaccinationRecords key={pet.id} petId={pet.id} />
    </>
  );
}
