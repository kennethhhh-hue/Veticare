import { Clock, Pencil, Plus } from "lucide-react";
import { PetPhoto } from "@/components/owner-app/pet-photo";
import type { OwnerPet } from "@/data/owner-app";
import { ImpoundClaimBadge } from "@/components/veticare/impound-claim-badge";

interface PetsScreenProps {
  pets: OwnerPet[];
  loading: boolean;
  onAddPet: () => void;
  onOpenPet: (pet: OwnerPet) => void;
  onEditPet: (pet: OwnerPet) => void;
}

export function PetsScreen({ pets, loading, onAddPet, onOpenPet, onEditPet }: PetsScreenProps) {
  return (
    <div className="pb-6">
      <header className="flex items-start justify-between gap-3 px-5 pt-5">
        <div>
          <p className="text-[9.5px] font-bold uppercase tracking-[0.16em] text-primary">
            Your household
          </p>
          <h1 className="mt-1 text-[24px] font-extrabold leading-none tracking-[-0.03em] text-foreground">
            My pets
          </h1>
          <p className="mt-1.5 text-[11px] text-muted-foreground">
            {pets.length} pet{pets.length === 1 ? "" : "s"} on your account
          </p>
        </div>
        <button
          type="button"
          onClick={onAddPet}
          className="grid size-9 shrink-0 place-items-center rounded-xl bg-primary text-primary-foreground shadow-glow"
          aria-label="Register a pet"
        >
          <Plus className="size-4" />
        </button>
      </header>

      <div className="mt-4 space-y-2.5 px-5">
        {loading ? (
          <p className="py-8 text-center text-[11px] text-muted-foreground">Loading your pets…</p>
        ) : pets.length === 0 ? (
          <div className="rounded-2xl border border-dashed border-border px-4 py-8 text-center">
            <p className="text-[13px] font-bold text-foreground">No pets registered yet</p>
            <p className="mt-1 text-[10.5px] text-muted-foreground">Add your first pet to submit it to the City Veterinary Office.</p>
            <button type="button" onClick={onAddPet} className="mt-4 inline-flex items-center gap-1.5 rounded-lg bg-primary px-3 py-2 text-[11px] font-bold text-primary-foreground">
              <Plus className="size-3.5" />
              Add new pet
            </button>
          </div>
        ) : pets.map((pet) => (
          <div key={pet.id} className="relative">
            <button
              type="button"
              onClick={() => onOpenPet(pet)}
              className="flex w-full items-center gap-3 rounded-2xl border border-border bg-card p-2.5 pr-12 text-left shadow-card transition-colors hover:border-primary/25"
            >
              <PetPhoto
                src={pet.photoUrl}
                alt={pet.name}
                species={pet.species}
                className="size-[76px] shrink-0 rounded-xl"
              />
              <div className="min-w-0 flex-1">
                <div className="flex items-center gap-1.5">
                  <p className="truncate text-[14px] font-extrabold tracking-[-0.01em] text-foreground">
                    {pet.name}
                  </p>
                  <span className="shrink-0 rounded bg-primary-soft px-1 py-0.5 text-[8px] font-bold text-primary">
                    {pet.species}
                  </span>
                </div>
                <p className="mt-0.5 truncate text-[10px] text-muted-foreground">
                  {pet.breed} • {pet.age} • {pet.sex}
                </p>
                <div className="mt-1 flex flex-wrap gap-1">
                  {pet.impoundClaimed ? <ImpoundClaimBadge /> : null}
                    {pet.tags.slice(0, 2).map((tag) => (
                    <span
                      key={tag}
                      className="rounded border border-border px-1 py-0.5 text-[8px] font-semibold text-muted-foreground"
                    >
                      {tag}
                    </span>
                  ))}
                </div>
                <p className="mt-1 flex items-center gap-1 text-[9px] font-semibold text-warning">
                  <Clock className="size-2.5" />
                  {pet.registrationStatus === "pending" ? "Awaiting city vet review" : pet.nextDue.title}
                </p>
              </div>
            </button>
            <button type="button" onClick={() => onEditPet(pet)} className="absolute right-2.5 top-2.5 grid size-8 place-items-center rounded-lg border border-border bg-card text-primary hover:bg-secondary" aria-label={`Edit ${pet.name}'s profile`} title="Edit pet profile">
              <Pencil className="size-3.5" />
            </button>
          </div>
        ))}

        {!loading && pets.length > 0 ? (
          <button
            type="button"
            onClick={onAddPet}
            className="flex w-full items-center justify-center gap-1.5 rounded-2xl border border-dashed border-border bg-card/50 py-3 text-[11px] font-semibold text-muted-foreground transition-colors hover:border-primary/40 hover:text-primary"
          >
            <Plus className="size-3.5" />
            Register another pet
          </button>
        ) : null}
      </div>

      <div className="mx-5 mt-4 rounded-xl border border-border bg-primary-soft/40 p-3">
        <p className="text-[10px] font-bold uppercase tracking-[0.12em] text-primary">
          Good to know
        </p>
        <p className="mt-1 text-[10.5px] leading-relaxed text-muted-foreground">
          Keep vaccination records updated so your pet&apos;s digital ID stays valid at
          checkpoints and clinics.
        </p>
      </div>
    </div>
  );
}
