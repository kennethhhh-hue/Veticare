import { PawPrint } from "lucide-react";
import { PetPhoto } from "@/components/owner-app/pet-photo";
import { IdPattern } from "@/components/veticare/id-pattern";
import type { OwnerPet } from "@/data/owner-app";

export function PetIdCard({ pet, ownerName }: { pet: OwnerPet; ownerName?: string }) {
  const qrValue = pet.registrationStatus === "pending" ? null : pet.qrCode ?? pet.petId;

  return (
    <div className="overflow-hidden rounded-2xl border border-border bg-card shadow-raised">
      <div className="relative flex items-center justify-between brand-gradient px-4 py-3 text-primary-foreground">
        <div className="flex items-center gap-2">
          <span className="grid size-6 place-items-center rounded-lg bg-primary-foreground/15">
            <PawPrint className="size-3.5" />
          </span>
          <span className="text-[12px] font-extrabold tracking-[-0.02em]">Veticare</span>
        </div>
        <span className="text-[8px] font-bold uppercase tracking-[0.2em] text-primary-foreground/80">
          Digital pet ID
        </span>
      </div>

      <div className="p-4">
        <div className="flex items-center gap-3">
          <PetPhoto
            src={pet.photoUrl}
            alt={pet.name}
            species={pet.species}
            className="size-16 shrink-0 rounded-xl ring-1 ring-border"
          />
          <div className="min-w-0">
            <p className="truncate text-[17px] font-extrabold leading-tight tracking-[-0.02em] text-foreground">
              {pet.name}
            </p>
            <p className="mt-0.5 truncate text-[11px] text-muted-foreground">
              {pet.breed} • {pet.sex}
            </p>
            <span className="num mt-1 inline-block rounded-md bg-primary-soft px-1.5 py-0.5 text-[9px] font-bold text-primary">
              {pet.petId}
            </span>
          </div>
        </div>

        <dl className="mt-3.5 grid grid-cols-2 gap-y-2 border-t border-border pt-3">
          {[
            { label: "Owner", value: ownerName ?? "Pet owner" },
            { label: "Collar RFID", value: pet.rfidTag ?? "Not linked" },
            { label: "Age", value: pet.age },
            { label: "Weight", value: pet.weight },
            { label: "Registered", value: pet.registered },
          ].map((row) => (
            <div key={row.label}>
              <dt className="text-[8px] font-bold uppercase tracking-[0.14em] text-muted-foreground/80">
                {row.label}
              </dt>
              <dd className="mt-0.5 truncate text-[10.5px] font-semibold text-foreground">
                {row.value}
              </dd>
            </div>
          ))}
        </dl>

        <div className="mt-3 flex items-end justify-between border-t border-border pt-3">
          <div>
            <p className="text-[8px] font-bold uppercase tracking-[0.14em] text-muted-foreground/80">
              Issued by
            </p>
            <p className="mt-0.5 text-[10px] font-bold leading-snug text-foreground">
              City Veterinary Office
            </p>
            <p className="text-[9px] text-muted-foreground">Valid through Dec 31, 2026</p>
            <span className="mt-1.5 inline-flex items-center gap-1 rounded-full bg-success/10 px-1.5 py-0.5 text-[8px] font-bold uppercase tracking-wide text-success">
              <span className="size-1 rounded-full bg-success" />
              Verified
            </span>
          </div>
          {qrValue ? (
            <IdPattern value={qrValue} />
          ) : (
            <span className="grid size-[66px] place-items-center rounded-md bg-secondary px-1 text-center text-[8px] font-semibold text-muted-foreground">
              QR after approval
            </span>
          )}
        </div>
      </div>

      <div className="flex items-center justify-between bg-secondary/70 px-4 py-2">
        <p className="text-[8px] font-medium tracking-wide text-muted-foreground">
          Bacoor City • Veticare pet registry
        </p>
        <p className="text-[8px] font-bold tracking-wide text-muted-foreground">
          {pet.registrationStatus === "approved" ? "OFFICIAL PET ID" : "PENDING APPROVAL"}
        </p>
      </div>
    </div>
  );
}
