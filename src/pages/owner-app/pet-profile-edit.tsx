import { useRef, useState, type FormEvent } from "react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import type { OwnerPet } from "@/data/owner-app";
import { supabase } from "@/integrations/supabase/client";

export type EditablePetProfile = Pick<OwnerPet, "name" | "species" | "breed" | "sex" | "age" | "weight" | "color">;

const textFields = [
  { field: "name", label: "Pet name", maxLength: 120, required: true },
  { field: "breed", label: "Breed", maxLength: 120, required: true },
  { field: "age", label: "Age", maxLength: 40, required: true },
  { field: "weight", label: "Weight", maxLength: 40, required: false },
  { field: "color", label: "Color", maxLength: 80, required: false },
] as const;

export function PetProfileEdit({ pet, onClose, onSaved }: { pet: OwnerPet; onClose: () => void; onSaved: (changes: EditablePetProfile) => void }) {
  const [draft, setDraft] = useState<EditablePetProfile>({
    name: pet.name, species: pet.species, breed: pet.breed, sex: pet.sex, age: pet.age,
    weight: pet.weight === "Not provided" ? "" : pet.weight,
    color: pet.color === "Not provided" ? "" : pet.color,
  });
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const lock = useRef(false);

  const saveProfile = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    if (lock.current) return;
    const changes = { ...draft, name: draft.name.trim(), breed: draft.breed.trim(), age: draft.age.trim(), weight: draft.weight.trim(), color: draft.color.trim() };
    if (!changes.name || !changes.breed || !changes.age) {
      setError("Enter the pet name, breed, and age.");
      return;
    }

    lock.current = true;
    setSaving(true);
    setError(null);
    try {
      const result = await supabase.rpc("update_owner_pet_profile", {
        p_pet_id: pet.id, p_name: changes.name, p_species: changes.species, p_breed: changes.breed,
        p_sex: changes.sex, p_age: changes.age, p_weight: changes.weight, p_color: changes.color,
      });
      if (result.error || !result.data) throw new Error(result.error?.message ?? "This pet profile is unavailable for editing.");
      onSaved({ ...changes, weight: changes.weight || "Not provided", color: changes.color || "Not provided" });
      toast.success("Pet profile updated.");
    } catch (error) {
      setError(error instanceof Error ? error.message : "Unable to update the pet profile.");
    } finally {
      setSaving(false);
      lock.current = false;
    }
  };

  return (
    <Dialog open onOpenChange={(open) => { if (!open && !lock.current) onClose(); }}>
      <DialogContent className="max-h-[88dvh] w-[calc(100%-2rem)] overflow-y-auto rounded-2xl sm:max-w-[440px]">
        <DialogHeader>
          <DialogTitle>Edit pet profile</DialogTitle>
          <DialogDescription>Update {pet.name}'s profile details.</DialogDescription>
        </DialogHeader>
        <form onSubmit={saveProfile} className="grid grid-cols-2 gap-3">
          {textFields.map(({ field, label, maxLength, required }) => (
            <div key={field} className={field === "name" || field === "breed" ? "col-span-2 space-y-1" : "space-y-1"}>
              <Label htmlFor={`edit-pet-${field}`}>{label}</Label>
              <Input id={`edit-pet-${field}`} value={draft[field]} maxLength={maxLength} required={required} disabled={saving}
                onChange={(event) => setDraft((current) => ({ ...current, [field]: event.target.value }))} />
            </div>
          ))}
          <div className="space-y-1">
            <Label htmlFor="edit-pet-species">Species</Label>
            <select id="edit-pet-species" value={draft.species} disabled={saving} className="h-10 w-full rounded-md border border-input bg-background px-2 text-sm"
              onChange={(event) => setDraft((current) => ({ ...current, species: event.target.value as OwnerPet["species"] }))}>
              <option>Dog</option><option>Cat</option>
            </select>
          </div>
          <div className="space-y-1">
            <Label htmlFor="edit-pet-sex">Sex</Label>
            <select id="edit-pet-sex" value={draft.sex} disabled={saving} className="h-10 w-full rounded-md border border-input bg-background px-2 text-sm"
              onChange={(event) => setDraft((current) => ({ ...current, sex: event.target.value as OwnerPet["sex"] }))}>
              <option>Male</option><option>Female</option>
            </select>
          </div>
          {error ? <p role="alert" className="col-span-2 text-xs text-destructive">{error}</p> : null}
          <div className="col-span-2 flex justify-end gap-2">
            <Button type="button" variant="outline" onClick={onClose} disabled={saving}>Cancel</Button>
            <Button type="submit" disabled={saving}>{saving ? "Saving…" : "Save changes"}</Button>
          </div>
        </form>
      </DialogContent>
    </Dialog>
  );
}
