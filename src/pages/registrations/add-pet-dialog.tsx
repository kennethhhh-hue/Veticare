import { useState, type FormEvent } from "react";
import { PawPrint } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import type { PetRegistration } from "@/data/admin-records";

export interface OwnerAccountOption {
  id: string;
  email: string | null;
  name: string;
  phone: string;
}

interface AddPetDialogProps {
  open: boolean;
  owners: OwnerAccountOption[];
  onOpenChange: (open: boolean) => void;
  onCreated: (registration: PetRegistration) => Promise<boolean> | boolean;
}

export function AddPetDialog({ open, owners, onOpenChange, onCreated }: AddPetDialogProps) {
  const [ownerId, setOwnerId] = useState("");
  const [name, setName] = useState("");
  const [species, setSpecies] = useState<"Dog" | "Cat">("Dog");
  const [breed, setBreed] = useState("");
  const [age, setAge] = useState("");
  const [sex, setSex] = useState<"Male" | "Female">("Male");
  const [weight, setWeight] = useState("");
  const [color, setColor] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);
  const [reviewRegistration, setReviewRegistration] = useState<PetRegistration | null>(null);

  const reset = () => {
    setOwnerId("");
    setName("");
    setSpecies("Dog");
    setBreed("");
    setAge("");
    setSex("Male");
    setWeight("");
    setColor("");
    setError(null);
    setReviewRegistration(null);
  };

  const handleOpenChange = (nextOpen: boolean) => {
    if (!nextOpen) reset();
    onOpenChange(nextOpen);
  };

  const handleSubmit = (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    if (!ownerId) {
      setError("Select a pet owner account first.");
      return;
    }

    setError(null);
    const owner = owners.find((item) => item.id === ownerId);
    if (!owner) {
      setError("Select a pet owner first.");
      return;
    }

    const registrationNumber = String(Date.now()).slice(-4);
    const registration: PetRegistration = {
      id: `PR-${registrationNumber}`,
      petId: `VC-${new Date().getFullYear()}-${registrationNumber}`,
      name: name.trim(),
      species,
      breed: breed.trim(),
      gender: sex,
      age: age.trim(),
      weight: weight.trim(),
      color: color.trim(),
      owner: owner.name,
      ownerId: owner.id,
      phone: owner.phone,
      microchip: null,
      registered: new Date().toLocaleDateString(undefined, { month: "short", day: "numeric", year: "numeric" }),
      registeredAt: new Date().toISOString().slice(0, 10),
      status: "pending",
    };
    setReviewRegistration(registration);
  };

  const confirmAdd = async () => {
    if (!reviewRegistration) return;
    setSaving(true);
    try {
      const created = await onCreated(reviewRegistration);
      if (!created) return;
      reset();
      onOpenChange(false);
    } finally {
      setSaving(false);
    }
  };

  const fieldClass = "h-9 rounded-lg border-border bg-background text-[12px]";

  return (
    <Dialog open={open} onOpenChange={handleOpenChange}>
      <DialogContent className="max-h-[90vh] overflow-y-auto rounded-xl border-border bg-card sm:max-w-[560px]">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2 text-base">
            <PawPrint className="size-4 text-primary" />
            {reviewRegistration ? "Review pet details" : "Add New Pet"}
          </DialogTitle>
          <DialogDescription className="text-xs">
            {reviewRegistration
              ? "Check the information and generated Pet ID before confirming this registration."
              : "Enter the pet details. You can review everything before adding it."}
          </DialogDescription>
        </DialogHeader>

        {reviewRegistration ? (
          <div className="space-y-3">
            <div className="rounded-xl border border-primary/20 bg-primary-soft/40 p-3">
              <p className="text-[9px] font-bold uppercase tracking-[0.12em] text-primary">Generated Pet ID</p>
              <p className="num mt-1 text-[19px] font-extrabold text-foreground">{reviewRegistration.petId}</p>
            </div>
            <dl className="grid grid-cols-2 gap-2 rounded-xl border border-border bg-background p-3">
              {[
                ["Pet name", reviewRegistration.name],
                ["Species", reviewRegistration.species],
                ["Breed", reviewRegistration.breed],
                ["Sex", reviewRegistration.gender],
                ["Age", age.trim()],
                ["Weight", weight.trim() || "Not provided"],
                ["Color / markings", color.trim() || "Not provided"],
                ["Owner", reviewRegistration.owner],
                ["Owner contact", reviewRegistration.phone],
                ["RFID / QR", "Assigned by admin after review"],
              ].map(([label, value]) => (
                <div key={label} className="min-w-0 rounded-lg bg-card px-2.5 py-2">
                  <dt className="text-[8px] font-bold uppercase tracking-[0.1em] text-muted-foreground">{label}</dt>
                  <dd className="mt-0.5 truncate text-[11px] font-semibold text-foreground">{value}</dd>
                </div>
              ))}
            </dl>
            <p className="rounded-lg border border-warning/25 bg-warning/10 p-2.5 text-[9.5px] leading-relaxed text-muted-foreground">
              Confirming adds this sample registration as pending. The assigned Pet ID is shown above; RFID and QR are assigned by the admin during approval.
            </p>
            <div className="flex justify-between gap-2 pt-1">
              <Button type="button" variant="outline" onClick={() => setReviewRegistration(null)}>Back to edit</Button>
              <Button type="button" onClick={confirmAdd} disabled={saving}>
                {saving ? "Adding pet…" : "Confirm and add pet"}
              </Button>
            </div>
          </div>
        ) : owners.length === 0 ? (
          <div className="rounded-lg border border-warning/30 bg-warning/10 p-3 text-xs leading-relaxed text-foreground">
            No pet-owner accounts were found. Create the owner account first, then return here to register the pet.
          </div>
        ) : (
          <form onSubmit={handleSubmit} className="space-y-3">
            <div className="space-y-1.5">
              <Label htmlFor="registration-owner">Pet owner account</Label>
              <select
                id="registration-owner"
                value={ownerId}
                onChange={(event) => setOwnerId(event.target.value)}
                required
                className={`${fieldClass} w-full rounded-md border px-3`}
              >
                <option value="">Select owner</option>
                {owners.map((owner) => (
                  <option key={owner.id} value={owner.id}>
                    {owner.name} {owner.email ? `(${owner.email})` : ""}
                  </option>
                ))}
              </select>
            </div>

            <div className="grid grid-cols-2 gap-3">
              <div className="col-span-2 space-y-1.5">
                <Label htmlFor="registration-pet-name">Pet name</Label>
                <Input id="registration-pet-name" value={name} onChange={(event) => setName(event.target.value)} required maxLength={80} className={fieldClass} />
              </div>
              <div className="space-y-1.5">
                <Label htmlFor="registration-species">Species</Label>
                <select id="registration-species" value={species} onChange={(event) => setSpecies(event.target.value as "Dog" | "Cat")} className={`${fieldClass} w-full rounded-md border px-3`}>
                  <option value="Dog">Dog</option>
                  <option value="Cat">Cat</option>
                </select>
              </div>
              <div className="space-y-1.5">
                <Label htmlFor="registration-sex">Sex</Label>
                <select id="registration-sex" value={sex} onChange={(event) => setSex(event.target.value as "Male" | "Female")} className={`${fieldClass} w-full rounded-md border px-3`}>
                  <option value="Male">Male</option>
                  <option value="Female">Female</option>
                </select>
              </div>
              <div className="col-span-2 space-y-1.5">
                <Label htmlFor="registration-breed">Breed</Label>
                <Input id="registration-breed" value={breed} onChange={(event) => setBreed(event.target.value)} required maxLength={100} className={fieldClass} />
              </div>
              <div className="space-y-1.5">
                <Label htmlFor="registration-age">Age</Label>
                <Input id="registration-age" value={age} onChange={(event) => setAge(event.target.value)} required maxLength={40} placeholder="e.g. 2 years" className={fieldClass} />
              </div>
              <div className="space-y-1.5">
                <Label htmlFor="registration-weight">Weight</Label>
                <Input id="registration-weight" value={weight} onChange={(event) => setWeight(event.target.value)} maxLength={30} placeholder="e.g. 8 kg" className={fieldClass} />
              </div>
              <div className="col-span-2 space-y-1.5">
                <Label htmlFor="registration-color">Color / markings</Label>
                <Input id="registration-color" value={color} onChange={(event) => setColor(event.target.value)} maxLength={80} className={fieldClass} />
              </div>
            </div>

            {error ? <p className="text-xs text-destructive" role="alert">{error}</p> : null}

            <div className="flex justify-end gap-2 pt-1">
              <Button type="button" variant="outline" onClick={() => handleOpenChange(false)}>Cancel</Button>
              <Button type="submit">Review details</Button>
            </div>
          </form>
        )}
      </DialogContent>
    </Dialog>
  );
}
