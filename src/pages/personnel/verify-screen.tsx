import { useState } from "react";
import { ChevronRight, Search, ShieldCheck } from "lucide-react";
import { PetPhoto } from "@/components/owner-app/pet-photo";
import { Input } from "@/components/ui/input";
import { cn } from "@/lib/utils";
import { ScannerPetResult, type ScannerPetActions } from "./scanner-pet-result";
import { ImpoundClaimBadge } from "@/components/veticare/impound-claim-badge";
import {
  registrationLabels,
  type PersonnelPet,
  type RegistrationState,
} from "@/data/personnel";

const filters = [
  { key: "all", label: "All pets" },
  { key: "needs", label: "Needs review" },
  { key: "expired", label: "Expired" },
] as const;

type FilterKey = (typeof filters)[number]["key"];

const registrationTone: Record<RegistrationState, string> = {
  active: "bg-success/10 text-success",
  expiring: "bg-warning/12 text-warning",
  expired: "bg-destructive/10 text-destructive",
  unregistered: "bg-secondary text-muted-foreground",
};

export function VerifyScreen({
  verifiedIds,
  actions,
  onScanAnother,
  pets,
}: {
  pets: PersonnelPet[];
  verifiedIds: string[];
  actions: ScannerPetActions;
  onScanAnother: () => void;
}) {
  const [query, setQuery] = useState("");
  const [filter, setFilter] = useState<FilterKey>("all");
  const [selectedPet, setSelected] = useState<PersonnelPet | null>(null);
  const selected = selectedPet ? pets.find((pet) => pet.recordId === selectedPet.recordId) ?? selectedPet : null;

  if (selected) {
    return (
      <ScannerPetResult
        key={selected.recordId}
        pet={selected}
        onBack={() => setSelected(null)}
        onScanAnother={onScanAnother}
        actions={actions}
      />
    );
  }

  const search = query.trim().toLowerCase();
  const visible = pets.filter((pet) => {
    const matchesSearch =
      search.length === 0 ||
      `${pet.name} ${pet.id} ${pet.owner} ${pet.breed}`.toLowerCase().includes(search);
    const needsReview =
      pet.registration === "expired" ||
      pet.registration === "unregistered" ||
      pet.vaccination !== "complete";
    const matchesFilter =
      filter === "all" ||
      (filter === "needs" && needsReview) ||
      (filter === "expired" && pet.registration === "expired");
    return matchesSearch && matchesFilter;
  });

  return (
    <div className="pb-6">
      <header className="px-5 pt-5">
        <p className="text-[9.5px] font-bold uppercase tracking-[0.16em] text-primary">
          Field access
        </p>
        <div className="mt-1 flex items-start justify-between gap-2">
          <h1 className="text-[24px] font-extrabold leading-none tracking-[-0.03em] text-foreground">
            Verify
          </h1>
          <span className="mt-0.5 flex items-center gap-1 rounded-full bg-secondary px-2 py-1 text-[8px] font-bold uppercase tracking-wide text-muted-foreground">
            <ShieldCheck className="size-2.5 text-primary" />
            Issued Pet IDs
          </span>
        </div>
        <p className="mt-1.5 text-[11px] leading-relaxed text-muted-foreground">
          Confirm pet and owner details during annual registration — no admin edits.
        </p>
      </header>

      <div className="mt-4 px-5">
        <div className="flex items-center gap-2 rounded-xl border border-border bg-card px-3 py-1 transition-colors focus-within:border-primary/40">
          <Search className="size-3.5 shrink-0 text-muted-foreground" />
          <Input
            value={query}
            onChange={(event) => setQuery(event.target.value)}
            placeholder="Search pet, ID, or owner"
            aria-label="Search pet records"
            className="h-8 border-0 bg-transparent px-0 text-[11.5px] shadow-none focus-visible:ring-0 focus-visible:ring-offset-0"
          />
        </div>

        <div className="mt-2.5 flex items-center gap-1.5">
          {filters.map((item) => (
            <button
              key={item.key}
              type="button"
              onClick={() => setFilter(item.key)}
              className={cn(
                "rounded-full px-2.5 py-1.5 text-[10px] font-bold transition-colors",
                filter === item.key
                  ? "bg-primary text-primary-foreground shadow-glow"
                  : "border border-border bg-card text-muted-foreground hover:text-foreground",
              )}
            >
              {item.label}
            </button>
          ))}
        </div>

        <div className="mt-3 space-y-2">
          {visible.length === 0 ? (
            <div className="rounded-xl border border-border bg-card px-4 py-8 text-center">
              <p className="text-[11.5px] font-bold text-foreground">No matching pets</p>
              <p className="mt-1 text-[10px] text-muted-foreground">
                Try another name or clear the filter.
              </p>
            </div>
          ) : (
            visible.map((pet) => {
              const verified = verifiedIds.includes(pet.id);
              return (
                <button
                  key={pet.id}
                  type="button"
                  onClick={() => setSelected(pet)}
                  className="flex w-full items-center gap-2.5 rounded-xl border border-border bg-card p-2.5 text-left shadow-card transition-colors hover:border-primary/25"
                >
                  <PetPhoto
                    src={pet.photoUrl}
                    alt={pet.name}
                    species={pet.species}
                    className="size-[42px] shrink-0 rounded-lg ring-1 ring-border"
                  />
                  <span className="min-w-0 flex-1">
                    <span className="flex flex-wrap items-center gap-1.5">
                      <span className="truncate text-[12px] font-bold text-foreground">
                        {pet.name}
                      </span>
                      <span
                        className={cn(
                          "shrink-0 rounded-full px-1.5 py-0.5 text-[8px] font-bold",
                          registrationTone[pet.registration],
                        )}
                      >
                        {registrationLabels[pet.registration]}
                      </span>
                      {pet.impoundClaimed ? <ImpoundClaimBadge /> : null}
                    </span>
                    <span className="num mt-0.5 block truncate text-[9px] text-muted-foreground">
                      {pet.id} • {pet.owner}
                    </span>
                    {verified ? (
                      <span className="mt-0.5 block text-[8.5px] font-bold uppercase tracking-wide text-success">
                        Verified today
                      </span>
                    ) : null}
                  </span>
                  <ChevronRight className="size-3.5 shrink-0 text-muted-foreground" />
                </button>
              );
            })
          )}
        </div>
      </div>
    </div>
  );
}
