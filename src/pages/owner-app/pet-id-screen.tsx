import { ArrowLeft, Info, Share2, ShieldCheck } from "lucide-react";
import { toast } from "sonner";
import { PetIdCard } from "@/components/owner-app/pet-id-card";
import { Button } from "@/components/ui/button";
import type { OwnerPet } from "@/data/owner-app";

interface PetIdScreenProps {
  pet: OwnerPet;
  ownerName?: string;
  onBack: () => void;
}

export function PetIdScreen({ pet, ownerName, onBack }: PetIdScreenProps) {
  const sharePetId = async () => {
    const shareData = {
      title: `${pet.name}'s Veticare Pet ID`,
      text: `${pet.name} • ${pet.petId} • Veticare pet registry`,
      url: window.location.href,
    };

    try {
      if (navigator.share) {
        await navigator.share(shareData);
        toast.success("Pet ID shared.");
      } else {
        await navigator.clipboard.writeText(`${shareData.text} ${shareData.url}`);
        toast.success("Pet ID details copied to clipboard.");
      }
    } catch (error) {
      if (error instanceof Error && error.name === "AbortError") return;
      toast.error("Unable to share this Pet ID from this device.");
    }
  };

  return (
    <div className="pb-6">
      <header className="flex items-center gap-2 px-4 pb-3 pt-4">
        <button
          type="button"
          onClick={onBack}
          className="grid size-9 place-items-center rounded-full border border-border bg-card text-foreground transition-colors hover:bg-secondary"
          aria-label="Back"
        >
          <ArrowLeft className="size-4" />
        </button>
        <div className="min-w-0 flex-1">
          <p className="text-[9px] font-bold uppercase tracking-[0.16em] text-primary">
            Veticare
          </p>
          <h1 className="truncate text-[16px] font-extrabold tracking-[-0.02em] text-foreground">
            Digital pet ID
          </h1>
        </div>
        <span className={`flex items-center gap-1 rounded-full px-2 py-1 text-[8.5px] font-bold uppercase tracking-wide ${pet.registrationStatus === "approved" ? "bg-success/10 text-success" : "bg-warning/10 text-warning"}`}>
          <ShieldCheck className="size-3" />
          {pet.registrationStatus === "approved" ? "Approved" : "Pending"}
        </span>
      </header>

      <div className="px-4">
          <PetIdCard pet={pet} ownerName={ownerName} />

        <div className="mt-3 flex items-start gap-2 rounded-xl border border-info/20 bg-info/5 p-3">
          <Info className="mt-0.5 size-3.5 shrink-0 text-info" />
          <p className="text-[10px] leading-relaxed text-muted-foreground">
            {pet.registrationStatus === "approved"
              ? "Present this digital ID at the City Veterinary Office or during anti-rabies clinics. The QR code contains your approved Pet ID."
              : "Your scannable QR and final pet ID will be available after the registration is approved."}
          </p>
        </div>

        <Button
          onClick={sharePetId}
          variant="outline"
          className="mt-3 h-11 w-full rounded-xl border-border bg-card text-[11.5px] font-bold"
        >
          <Share2 className="size-3.5" />
          Share pet ID
        </Button>

        <p className="mt-3 text-center text-[9.5px] leading-relaxed text-muted-foreground/80">
          Lost pet? Report it to the City Veterinary Office so this ID can be flagged
          as missing.
        </p>
      </div>
    </div>
  );
}
