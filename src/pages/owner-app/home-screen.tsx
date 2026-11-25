import { useEffect, useRef, useState } from "react";
import {
  Bell,
  ChevronRight,
  IdCard,
  MapPin,
  PawPrint,
  Plus,
  ShieldCheck,
  Syringe,
} from "lucide-react";
import { toast } from "sonner";
import { PetPhoto } from "@/components/owner-app/pet-photo";
import { AccountAvatar } from "@/components/veticare/account-avatar";
import { type AdoptablePet, type OwnerPet } from "@/data/owner-app";
import type { AppTab } from "@/pages/owner-app/app-tab";
import { PHILIPPINE_TIME_ZONE } from "@/lib/philippine-date";

interface HomeScreenProps {
  onOpenTab: (tab: AppTab) => void;
  pets: OwnerPet[];
  ownerName: string;
  ownerPhotoUrl?: string;
  onAddPet: () => void;
  onOpenPet: (pet: OwnerPet) => void;
  onOpenId: (pet: OwnerPet) => void;
  onOpenAdoptable: (pet: AdoptablePet) => void;
  adoptablePets: AdoptablePet[];
  adoptablesLoading: boolean;
  adoptablesError: string | null;
  unreadNotifications: number;
}

const quickActions = [
  { id: "register", label: "Register", icon: Plus },
] as const;

export function HomeScreen({
  onOpenTab,
  pets,
  ownerName,
  ownerPhotoUrl,
  onAddPet,
  onOpenPet,
  onOpenId,
  onOpenAdoptable,
  adoptablePets,
  adoptablesLoading,
  adoptablesError,
  unreadNotifications,
}: HomeScreenProps) {
  const scrollerRef = useRef<HTMLDivElement>(null);
  const [activePet, setActivePet] = useState(0);
  const [now, setNow] = useState(() => new Date());

  useEffect(() => {
    const timer = window.setInterval(() => setNow(new Date()), 60_000);
    return () => window.clearInterval(timer);
  }, []);

  const philippineHour = Number(new Intl.DateTimeFormat("en-PH", {
    hour: "numeric",
    hourCycle: "h23",
    timeZone: PHILIPPINE_TIME_ZONE,
  }).format(now));
  const greeting = philippineHour < 12 ? "Good morning" : philippineHour < 18 ? "Good afternoon" : "Good evening";
  const philippineDateTime = now.toLocaleString("en-PH", {
    month: "short",
    day: "numeric",
    hour: "numeric",
    minute: "2-digit",
    timeZone: PHILIPPINE_TIME_ZONE,
  });

  const handleQuickAction = (id: string) => {
    if (id === "register") {
      onAddPet();
    }
  };

  const handleScroll = () => {
    const scroller = scrollerRef.current;
    if (!scroller) return;
    const firstCard = scroller.firstElementChild as HTMLElement | null;
    if (!firstCard) return;
    const step = firstCard.offsetWidth + 10;
    const next = Math.round(scroller.scrollLeft / step);
    setActivePet(Math.max(0, Math.min(pets.length - 1, next)));
  };

  const goToPet = (index: number) => {
    const scroller = scrollerRef.current;
    if (!scroller) return;
    const firstCard = scroller.firstElementChild as HTMLElement | null;
    if (!firstCard) return;
    scroller.scrollTo({ left: index * (firstCard.offsetWidth + 10), behavior: "smooth" });
  };

  return (
    <div className="pb-6">
      <header className="flex items-center gap-3 px-5 pt-5">
        <AccountAvatar name={ownerName} photoUrl={ownerPhotoUrl} />
        <div className="min-w-0 flex-1">
          <p className="text-[9.5px] font-medium text-muted-foreground">{greeting} · {philippineDateTime} PHT</p>
          <p className="truncate text-[15px] font-extrabold tracking-[-0.02em] text-foreground">
            {ownerName}
          </p>
        </div>
        <button
          type="button"
          onClick={() => onOpenTab("notifications")}
          className="relative grid size-9 place-items-center rounded-xl border border-border bg-card text-foreground transition-colors hover:bg-secondary"
          aria-label={unreadNotifications ? `${unreadNotifications} unread notifications` : "Notifications"}
        >
          <Bell className="size-4" />
          {unreadNotifications ? <span className="absolute -right-1 -top-1 grid min-h-4 min-w-4 place-items-center rounded-full bg-destructive px-1 text-[8px] font-bold text-destructive-foreground">{unreadNotifications > 9 ? "9+" : unreadNotifications}</span> : null}
        </button>
      </header>

      <section className="mt-4">
        <div className="flex items-center justify-between px-5">
          <div>
            <h2 className="flex items-center gap-1.5 text-[14px] font-extrabold tracking-[-0.02em] text-foreground">
              <PawPrint className="size-4 text-primary" />
              My pets
              <span className="num text-[11px] font-semibold text-muted-foreground">
                {pets.length}
              </span>
            </h2>
            <p className="mt-0.5 text-[10px] text-muted-foreground">
              Swipe to see each registered pet
            </p>
          </div>
          <div className="flex items-center gap-1.5">
            <button
              type="button"
              onClick={onAddPet}
              aria-label="Add a pet"
              className="grid size-7 place-items-center rounded-lg border border-border bg-card text-muted-foreground transition-colors hover:text-primary"
            >
              <Plus className="size-3.5" />
            </button>
            <button
              type="button"
              onClick={() => onOpenTab("pets")}
              className="flex items-center gap-0.5 text-[10.5px] font-bold text-primary"
            >
              See all
              <ChevronRight className="size-3" />
            </button>
          </div>
        </div>

        {pets.length === 0 ? (
          <div className="mx-5 mt-3 rounded-2xl border border-dashed border-border px-4 py-5 text-center">
            <p className="text-[12px] font-bold text-foreground">No pets on your account yet</p>
            <p className="mt-1 text-[10px] text-muted-foreground">Register a pet to start your household record.</p>
            <button type="button" onClick={onAddPet} className="mt-3 text-[10.5px] font-bold text-primary hover:underline">
              Add new pet
            </button>
          </div>
        ) : null}

        <div
          ref={scrollerRef}
          onScroll={handleScroll}
          className="scroll-slim mt-2.5 flex snap-x snap-mandatory gap-2.5 overflow-x-auto px-5 pb-1"
        >
          {pets.map((pet) => (
            <article
              key={pet.id}
              className="w-[88%] shrink-0 snap-center overflow-hidden rounded-2xl border border-border bg-card shadow-card"
            >
              <div className="relative">
                <PetPhoto
                  src={pet.photoUrl}
                  alt={pet.name}
                  species={pet.species}
                  className="h-[142px] w-full"
                />
                <div
                  className="pointer-events-none absolute inset-0 bg-gradient-to-t from-foreground/75 via-foreground/5 to-foreground/10"
                  aria-hidden
                />
                <button
                  type="button"
                  onClick={() => onOpenPet(pet)}
                  className="absolute right-2.5 top-2.5 rounded-lg bg-card/95 px-2.5 py-1 text-[9px] font-bold text-primary shadow-sm backdrop-blur transition-colors hover:bg-card"
                >
                  View details
                </button>
                <div className="absolute inset-x-3 bottom-2.5">
                  <div className="flex items-center gap-1.5">
                    <p className="truncate text-[20px] font-extrabold leading-none tracking-[-0.03em] text-primary-foreground">
                      {pet.name}
                    </p>
                    <span className="flex shrink-0 items-center gap-1 rounded-full bg-card/95 px-1.5 py-0.5 text-[8px] font-bold uppercase tracking-wide text-success">
                      <ShieldCheck className="size-2.5" />
                      {pet.registrationStatus === "pending" ? "Pending" : pet.registrationStatus === "rejected" ? "Needs update" : "Registered"}
                    </span>
                  </div>
                  <p className="mt-1 truncate text-[10px] font-medium text-primary-foreground/85">
                    {pet.breed} • {pet.age} • {pet.sex}
                  </p>
                </div>
              </div>

              <div className="p-3">
                <div className="flex items-start justify-between gap-2">
                  <div className="min-w-0">
                    <p className="text-[8.5px] font-bold uppercase tracking-[0.12em] text-muted-foreground/80">
                      Pet ID
                    </p>
                    <p className="num truncate text-[12px] font-extrabold text-foreground">
                      {pet.petId}
                    </p>
                  </div>
                  <div className="shrink-0 text-right">
                    <p className="text-[8.5px] font-bold uppercase tracking-[0.12em] text-muted-foreground/80">Health records</p>
                    <p className="text-[10px] font-semibold text-muted-foreground">{pet.vaccinationsUnavailable ? "Unavailable" : pet.vaccines.length ? "Vaccinated" : "Not vaccinated"}</p>
                  </div>
                </div>

                <div className={`mt-2 flex items-center gap-2 rounded-xl px-2.5 py-1.5 ${pet.registrationStatus === "pending" ? "bg-warning/10" : "bg-secondary"}`}>
                  <Syringe className={`size-3 shrink-0 ${pet.registrationStatus === "pending" ? "text-warning" : "text-muted-foreground"}`} />
                  <p className={`min-w-0 flex-1 truncate text-[9.5px] font-semibold ${pet.registrationStatus === "pending" ? "text-warning" : "text-muted-foreground"}`}>
                    {pet.vaccinationsUnavailable ? "Vaccination records unavailable" : pet.vaccines[0]?.name ?? "No vaccinations recorded"}
                  </p>
                </div>

                <div className="mt-2.5 flex items-center gap-1.5">
                  <button
                    type="button"
                    onClick={() => {
                      if (pet.registrationStatus !== "approved") {
                        toast.info("Digital pet ID is issued after registration approval.");
                        return;
                      }
                      onOpenId(pet);
                    }}
                    disabled={pet.registrationStatus !== "approved"}
                    className="flex h-8 flex-1 items-center justify-center gap-1.5 rounded-lg bg-primary text-[10.5px] font-bold text-primary-foreground transition-colors hover:bg-primary/90 disabled:cursor-not-allowed disabled:opacity-50"
                  >
                    <IdCard className="size-3.5" />
                    {pet.registrationStatus === "approved" ? "Show pet ID" : "ID after approval"}
                  </button>
                  <button
                    type="button"
                    onClick={() => onOpenPet(pet)}
                    className="flex h-8 flex-1 items-center justify-center gap-1.5 rounded-lg border border-border bg-card text-[10.5px] font-semibold text-foreground/85 transition-colors hover:bg-secondary"
                  >
                    <Syringe className="size-3.5" />
                    Health record
                  </button>
                </div>
              </div>
            </article>
          ))}
        </div>

        <div className="mt-2 flex items-center justify-center gap-1.5">
          {pets.map((pet, index) => (
            <button
              key={pet.id}
              type="button"
              onClick={() => goToPet(index)}
              aria-label={`Show ${pet.name}`}
              aria-current={activePet === index}
              className={
                activePet === index
                  ? "h-1.5 w-4 rounded-full bg-primary transition-all"
                  : "size-1.5 rounded-full bg-muted-foreground/30 transition-all hover:bg-muted-foreground/50"
              }
            />
          ))}
        </div>
      </section>

      <section className="mt-4 px-5">
        {quickActions.map((action) => {
          const Icon = action.icon;
          return (
            <button
              key={action.id}
              type="button"
              onClick={() => handleQuickAction(action.id)}
              className="flex min-h-11 w-full items-center justify-center gap-2 rounded-xl bg-primary px-4 py-2.5 text-[12px] font-bold text-primary-foreground shadow-glow transition-colors hover:bg-primary/90"
            >
              <Icon className="size-4" strokeWidth={2.1} />
              <span>Register a pet</span>
            </button>
          );
        })}
      </section>

      <section className="mt-5">
        <div className="flex items-center justify-between px-5">
          <div>
            <h2 className="text-[14px] font-extrabold tracking-[-0.02em] text-foreground">
              Adopt a friend
            </h2>
            <p className="text-[10px] text-muted-foreground">Available at OCVAS</p>
          </div>
          <button
            type="button"
            onClick={() => onOpenTab("adopt")}
            className="flex items-center gap-0.5 text-[10.5px] font-bold text-primary"
          >
            Browse
            <ChevronRight className="size-3" />
          </button>
        </div>

        {adoptablesLoading ? <p className="px-5 py-3 text-[10px] text-muted-foreground">Loading available pets…</p> : null}
        {adoptablesError ? <p className="mx-5 mt-2 rounded-lg border border-warning/25 bg-warning/10 p-2 text-[9.5px] text-foreground">{adoptablesError}</p> : null}
        {!adoptablesLoading && !adoptablesError && adoptablePets.length === 0 ? <p className="px-5 py-3 text-[10px] text-muted-foreground">No animals are available for adoption right now.</p> : null}
        {!adoptablesLoading && !adoptablesError && adoptablePets.length ? <div className="scroll-slim mt-2.5 flex gap-2.5 overflow-x-auto px-5 pb-1">
          {adoptablePets.slice(0, 3).map((pet) => (
            <button
              key={pet.id}
              type="button"
              onClick={() => onOpenAdoptable(pet)}
              className="relative w-[150px] shrink-0 overflow-hidden rounded-2xl border border-border bg-card text-left shadow-card transition-transform hover:-translate-y-0.5"
            >
              <div className="relative">
                <PetPhoto
                  src={pet.photoUrl}
                  alt={pet.name}
                  species={pet.species}
                  className="h-[96px] w-full"
                />
                <span className="absolute left-1.5 top-1.5 rounded-full bg-card/90 px-1.5 py-0.5 text-[8px] font-bold text-foreground backdrop-blur">
                  {pet.age}
                </span>
              </div>
              <div className="p-2.5">
                <p className="truncate text-[12.5px] font-bold text-foreground">{pet.name}</p>
                <p className="mt-0.5 truncate text-[9.5px] text-muted-foreground">{pet.breed}</p>
                <p className="mt-1 flex items-center gap-0.5 text-[9px] font-medium text-primary">
                  <MapPin className="size-2.5" />
                  {pet.shelter}
                </p>
              </div>
            </button>
          ))}
        </div> : null}
      </section>
    </div>
  );
}
