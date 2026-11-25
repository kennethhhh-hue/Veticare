import { useEffect, useState, type FormEvent } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { supabase } from "@/integrations/supabase/client";
import type { Database } from "@/integrations/supabase/types";

type ClaimPet = Database["public"]["Functions"]["find_impound_claim_pets"]["Returns"][number];

interface ImpoundClaimFormProps {
  impoundId: string;
  saving: boolean;
  onCancel: () => void;
  onConfirm: (petRecordId: string) => void;
}

export function ImpoundClaimForm({ impoundId, saving, onCancel, onConfirm }: ImpoundClaimFormProps) {
  const [query, setQuery] = useState("");
  const [pets, setPets] = useState<ClaimPet[]>([]);
  const [petId, setPetId] = useState("");
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    let active = true;
    const timeout = window.setTimeout(async () => {
      const { data, error } = await supabase.rpc("find_impound_claim_pets", { p_impound_id: impoundId, p_search: query.trim() });
      if (!active) return;
      setPets(data ?? []);
      setError(error?.message ?? null);
      setLoading(false);
    }, query.trim() ? 250 : 0);

    return () => {
      active = false;
      window.clearTimeout(timeout);
    };
  }, [impoundId, query]);

  const submit = (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    if (!saving && !loading && pets.some((pet) => pet.pet_record_id === petId)) onConfirm(petId);
  };

  return (
    <form onSubmit={submit} className="space-y-3 rounded-xl border border-border p-3">
      <div className="space-y-1.5">
        <Label htmlFor="impound-claim-search">Find the owner’s pet profile</Label>
        <Input
          id="impound-claim-search"
          placeholder="Owner name, email, or pet name"
          value={query}
          disabled={saving}
          onChange={(event) => {
            setQuery(event.target.value);
            setPetId("");
            setPets([]);
            setError(null);
            setLoading(true);
          }}
        />
      </div>
      {loading ? <p role="status" className="text-xs text-muted-foreground">Searching pet profiles…</p> : null}
      {error ? <p role="alert" className="text-xs text-destructive">{error}</p> : null}
      {!loading && !error && pets.length === 0 ? (
        <p className="text-xs text-muted-foreground">
          {query.trim().length < 2 ? "Enter at least two characters to find the pet without a collar or tag." : "No matching pet profiles. Check the owner or pet name, or register the pet before recording the claim."}
        </p>
      ) : null}
      {pets.length > 0 ? (
        <fieldset disabled={saving} className="popup-scroll max-h-44 min-w-0 space-y-1 overflow-y-auto">
          <legend className="sr-only">Matching pet profiles</legend>
          {pets.map((pet) => (
            <label key={pet.pet_record_id} className="flex cursor-pointer items-center gap-2 rounded-lg border border-border px-2 py-1.5 text-xs">
              <input type="radio" name="claimed-pet" checked={petId === pet.pet_record_id} onChange={() => setPetId(pet.pet_record_id)} />
              <span className="min-w-0 break-words">
                <span className="block font-semibold">{pet.pet_name} · {pet.breed}{pet.pet_id ? ` · ${pet.pet_id}` : ""}</span>
                <span className="block text-muted-foreground">{[pet.owner_name, pet.owner_email, pet.barangay].filter(Boolean).join(" · ")}</span>
              </span>
            </label>
          ))}
        </fieldset>
      ) : null}
      <p className="text-xs text-muted-foreground">Confirm ownership before recording the claim. Any active adoption application will be closed.</p>
      <div className="flex justify-end gap-2">
        <Button type="button" size="sm" variant="outline" disabled={saving} onClick={onCancel}>Cancel</Button>
        <Button type="submit" size="sm" disabled={saving || loading || !petId}>{saving ? "Saving…" : "Confirm claim"}</Button>
      </div>
    </form>
  );
}
