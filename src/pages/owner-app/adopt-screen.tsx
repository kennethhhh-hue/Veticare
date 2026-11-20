import { useState } from "react";
import {
  ArrowLeft,
  Heart,
  MapPin,
  MessageCircle,
  PawPrint,
  Search,
  ShieldCheck,
} from "lucide-react";
import { toast } from "sonner";
import { PetPhoto } from "@/components/owner-app/pet-photo";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { cn } from "@/lib/utils";
import type { AdoptablePet } from "@/data/owner-app";
import type { AdoptionRequest, OwnerProfile } from "@/lib/owner-preview-store";

type Filter = "all" | "Dog" | "Cat";

const filters: { key: Filter; label: string }[] = [
  { key: "all", label: "All pets" },
  { key: "Dog", label: "Dogs" },
  { key: "Cat", label: "Cats" },
];

function AdoptDetail({
  pet,
  onBack,
  requested,
  onRequest,
  requestSaving,
}: {
  pet: AdoptablePet;
  onBack: () => void;
  requested: boolean;
  onRequest: (pet: AdoptablePet) => Promise<boolean>;
  requestSaving: boolean;
}) {
  const [requesting, setRequesting] = useState(false);

  const submitRequest = async () => {
    setRequesting(true);
    try {
      const submitted = await onRequest(pet);
      if (submitted) toast.success(`Adoption application for ${pet.name} submitted.`);
    } finally {
      setRequesting(false);
    }
  };

  return (
    <div className="pb-6">
      <div className="relative">
        <PetPhoto
          src={pet.photoUrl}
          alt={pet.name}
          species={pet.species}
          className="h-[232px] w-full"
        />
        <div
          className="pointer-events-none absolute inset-0 bg-gradient-to-t from-foreground/85 via-foreground/10 to-foreground/25"
          aria-hidden
        />
        <button
          type="button"
          onClick={onBack}
          className="absolute left-4 top-4 grid size-9 place-items-center rounded-full bg-card/90 text-foreground shadow-card backdrop-blur"
          aria-label="Back to adoptable pets"
        >
          <ArrowLeft className="size-4" />
        </button>
        <div className="absolute inset-x-5 bottom-4">
          <p className="text-[9px] font-bold uppercase tracking-[0.14em] text-primary-foreground/75">
            Looking for a home
          </p>
          <h1 className="mt-1 text-[26px] font-extrabold leading-none tracking-[-0.03em] text-primary-foreground">
            {pet.name}
          </h1>
          <p className="mt-1 flex items-center gap-1 text-[11px] text-primary-foreground/80">
            <MapPin className="size-3" />
            {pet.shelter} • {pet.distance}
          </p>
        </div>
      </div>

      <div className="px-5">
        <div className="mt-4 flex flex-wrap gap-1.5">
          {[pet.breed, pet.age, pet.sex, ...pet.tags].map((tag) => (
            <span
              key={tag}
              className="rounded-full border border-border bg-card px-2 py-1 text-[9px] font-semibold text-muted-foreground"
            >
              {tag}
            </span>
          ))}
        </div>

        {pet.story ? <div className="mt-3.5 rounded-2xl border border-border bg-card p-3.5">
          <h2 className="flex items-center gap-1.5 text-[11.5px] font-extrabold text-foreground">
            <PawPrint className="size-3.5 text-primary" />
            About {pet.name}
          </h2>
          <p className="mt-1.5 text-[10.5px] leading-relaxed text-muted-foreground">
            {pet.story}
          </p>
        </div> : null}

        <div className="mt-3 flex items-center gap-2 rounded-xl border border-success/20 bg-success/5 p-3">
          <ShieldCheck className="size-4 shrink-0 text-success" />
          <p className="text-[10px] leading-relaxed text-muted-foreground">
            The City Veterinary Office will review your application and coordinate the next steps.
          </p>
        </div>

        <Button
          onClick={() => void submitRequest()}
          disabled={requested || requestSaving || requesting}
          className="mt-4 h-11 w-full rounded-xl text-[12px] font-bold shadow-glow"
        >
          <Heart className="size-4" />
          {requested ? "Application submitted" : requesting || requestSaving ? "Submitting…" : `Request to adopt ${pet.name}`}
        </Button>
      </div>
    </div>
  );
}

export function AdoptScreen({
  owner,
  pets,
  loading,
  loadError,
  requests,
  onRequest,
}: {
  owner: OwnerProfile;
  pets: AdoptablePet[];
  loading: boolean;
  loadError: string | null;
  requests: AdoptionRequest[];
  onRequest: (pet: AdoptablePet) => Promise<boolean>;
}) {
  const [filter, setFilter] = useState<Filter>("all");
  const [query, setQuery] = useState("");
  const [selected, setSelected] = useState<AdoptablePet | null>(null);
  const [requestSaving, setRequestSaving] = useState(false);

  if (selected) {
    const alreadyRequested = requests.some((request) => request.petId === selected.id);
    return (
      <AdoptDetail
        pet={selected}
        onBack={() => setSelected(null)}
        requested={alreadyRequested}
        requestSaving={requestSaving}
        onRequest={async (pet) => {
          setRequestSaving(true);
          try {
            return await onRequest(pet);
          } finally {
            setRequestSaving(false);
          }
        }}
      />
    );
  }

  const search = query.trim().toLowerCase();
  const visible = pets.filter((pet) => {
    const matchesFilter = filter === "all" || pet.species === filter;
    const matchesQuery =
      search.length === 0 ||
      `${pet.name} ${pet.breed} ${pet.shelter}`.toLowerCase().includes(search);
    return matchesFilter && matchesQuery;
  });

  return (
    <div className="pb-6">
      <header className="px-5 pt-5">
        <p className="text-[9.5px] font-bold uppercase tracking-[0.16em] text-primary">
          City Veterinary Office
        </p>
        <h1 className="mt-1 text-[24px] font-extrabold leading-none tracking-[-0.03em] text-foreground">
          Adopt a friend
        </h1>
        <p className="mt-1.5 text-[11px] text-muted-foreground">
          {pets.length} pets available for adoption
        </p>

        <div className="mt-3 flex items-center gap-2 rounded-xl border border-border bg-card px-3 py-1 transition-colors focus-within:border-primary/40">
          <Search className="size-3.5 shrink-0 text-muted-foreground" />
          <Input
            value={query}
            onChange={(event) => setQuery(event.target.value)}
            placeholder="Search by name or breed"
            aria-label="Search adoptable pets"
            className="h-8 border-0 bg-transparent px-0 text-[11px] shadow-none focus-visible:ring-0 focus-visible:ring-offset-0"
          />
        </div>

        <div className="mt-2.5 flex items-center gap-1.5">
          {filters.map((item) => (
            <button
              key={item.key}
              type="button"
              onClick={() => setFilter(item.key)}
              className={cn(
                "rounded-full px-3 py-1.5 text-[10.5px] font-semibold transition-colors",
                filter === item.key
                  ? "bg-primary text-primary-foreground shadow-glow"
                  : "border border-border bg-card text-muted-foreground hover:text-foreground",
              )}
            >
              {item.label}
            </button>
          ))}
        </div>
      </header>

      {requests.length ? (
        <section className="mx-5 mt-3 rounded-xl border border-border bg-card p-3">
          <div className="flex items-center justify-between">
            <h2 className="text-[11px] font-extrabold text-foreground">My adoption requests</h2>
            <span className="num rounded-full bg-secondary px-2 py-0.5 text-[9px] font-bold text-muted-foreground">{requests.length}</span>
          </div>
          <ul className="mt-2 space-y-1.5">
            {requests.map((request) => (
              <li key={request.id} className="flex items-center justify-between gap-2 rounded-lg bg-secondary/60 px-2.5 py-2">
                <span className="min-w-0"><span className="block truncate text-[10px] font-bold text-foreground">{request.petName}</span><span className="block text-[9px] text-muted-foreground">Submitted {new Date(request.submittedAt).toLocaleDateString()}</span></span>
                <span className={cn("shrink-0 rounded-full px-2 py-1 text-[8.5px] font-bold capitalize", request.status === "approved" || request.status === "completed" ? "bg-success/10 text-success" : request.status === "rejected" ? "bg-destructive/10 text-destructive" : "bg-warning/12 text-warning")}>{request.status}</span>
              </li>
            ))}
          </ul>
        </section>
      ) : null}

      {loading ? (
        <p className="mt-6 px-5 text-center text-[11px] text-muted-foreground">Loading available pets…</p>
      ) : loadError ? (
        <p className="mx-5 mt-4 rounded-lg border border-warning/25 bg-warning/10 p-3 text-[10px] text-foreground" role="alert">{loadError}</p>
      ) : visible.length === 0 ? (
        <div className="mt-6 flex flex-col items-center gap-1.5 px-5 text-center">
          <span className="grid size-10 place-items-center rounded-full bg-primary-soft text-primary">
            <PawPrint className="size-4" />
          </span>
          <p className="text-[11.5px] font-bold text-foreground">No pets match that search</p>
          <p className="text-[10px] text-muted-foreground">
            Try a different name or clear the filters.
          </p>
        </div>
      ) : (
      <div className="mt-3.5 grid grid-cols-2 gap-2.5 px-5">
        {visible.map((pet) => (
          <button
            key={pet.id}
            type="button"
            onClick={() => setSelected(pet)}
            className="overflow-hidden rounded-2xl border border-border bg-card text-left shadow-card transition-transform hover:-translate-y-0.5"
          >
            <div className="relative">
              <PetPhoto
                src={pet.photoUrl}
                alt={pet.name}
                species={pet.species}
                className="h-[104px] w-full"
              />
              <span className="absolute right-1.5 top-1.5 grid size-6 place-items-center rounded-full bg-card/90 text-destructive backdrop-blur">
                <Heart className="size-3" />
              </span>
              {requests.some((request) => request.petId === pet.id) ? (
                <span className="absolute left-1.5 top-1.5 rounded-full bg-warning/95 px-1.5 py-0.5 text-[8px] font-bold text-foreground">
                  Requested
                </span>
              ) : null}
            </div>
            <div className="p-2.5">
              <p className="truncate text-[12.5px] font-bold text-foreground">{pet.name}</p>
              <p className="mt-0.5 truncate text-[9.5px] text-muted-foreground">
                {pet.breed} • {pet.age}
              </p>
              <p className="mt-1 flex items-center gap-0.5 truncate text-[9px] font-medium text-primary">
                <MapPin className="size-2.5 shrink-0" />
                {pet.distance}
              </p>
            </div>
          </button>
        ))}
      </div>
      )}

      <div className="mx-5 mt-4 rounded-xl border border-info/20 bg-info/5 p-3">
        <p className="text-[10px] leading-relaxed text-muted-foreground">
          {owner.fullName}, submitted applications and status updates are saved to your account.
        </p>
      </div>
    </div>
  );
}
