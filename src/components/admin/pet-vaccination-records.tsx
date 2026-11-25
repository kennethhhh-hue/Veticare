import { useState, type FormEvent } from "react";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { usePetVaccinations } from "@/hooks/use-pet-vaccinations";
import { supabase } from "@/integrations/supabase/client";
import { formatCalendarDate, getPhilippineDateKey } from "@/lib/philippine-date";

export function PetVaccinationRecords({ petId }: { petId: string }) {
  const queryClient = useQueryClient();
  const { vaccinations, queryKey } = usePetVaccinations(petId);
  const [editing, setEditing] = useState(false);
  const [name, setName] = useState("");
  const [date, setDate] = useState(getPhilippineDateKey);
  const save = useMutation({
    mutationFn: async () => {
      const vaccineName = name.trim();
      if (!vaccineName || vaccineName.length > 120) throw new Error("Enter a vaccine name up to 120 characters.");
      if (!date || date > getPhilippineDateKey()) throw new Error("Choose the date the vaccine was given.");
      const { error } = await supabase.from("pet_vaccinations").insert({
        pet_record_id: petId,
        vaccine_name: vaccineName,
        administered_on: date,
      });
      if (error?.code === "23505") throw new Error("This vaccine is already recorded for that date.");
      if (error) throw new Error(error.message);
    },
    onSuccess: () => {
      setEditing(false);
      setName("");
      setDate(getPhilippineDateKey());
      void queryClient.invalidateQueries({ queryKey });
      toast.success("Vaccination recorded.");
    },
  });

  const submit = (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    if (!save.isPending) save.mutate();
  };

  return (
    <section className="space-y-2 rounded-xl border border-border p-3">
      <div className="flex flex-wrap items-center justify-between gap-2">
        <h3 className="text-[11px] font-bold uppercase tracking-wide text-muted-foreground">Vaccination history</h3>
        {!editing && vaccinations.isSuccess ? (
          <Button type="button" size="sm" variant="outline" onClick={() => { save.reset(); setEditing(true); }}>Record vaccination</Button>
        ) : null}
      </div>
      {vaccinations.isPending ? <p className="text-xs text-muted-foreground">Loading vaccination records…</p> : null}
      {vaccinations.isError ? <p role="alert" className="text-xs text-destructive">Vaccination records are currently unavailable.</p> : null}
      {vaccinations.data?.length ? (
        <ul className="divide-y divide-border">
          {vaccinations.data.map((row) => (
            <li key={row.id} className="flex items-start justify-between gap-2 py-1.5 text-xs">
              <span className="min-w-0 break-words font-semibold">{row.vaccine_name}</span>
              <time dateTime={row.administered_on} className="shrink-0 text-muted-foreground">{formatCalendarDate(row.administered_on)}</time>
            </li>
          ))}
        </ul>
      ) : vaccinations.isSuccess ? <p className="text-xs text-muted-foreground">No vaccinations recorded.</p> : null}
      {editing ? (
        <form onSubmit={submit} className="space-y-2 border-t border-border pt-2">
          <div className="space-y-1">
            <Label htmlFor="admin-vaccine-name">Vaccine name</Label>
            <Input id="admin-vaccine-name" value={name} onChange={(event) => setName(event.target.value)} required maxLength={120} disabled={save.isPending} />
          </div>
          <div className="space-y-1">
            <Label htmlFor="admin-vaccine-date">Date administered</Label>
            <Input id="admin-vaccine-date" type="date" value={date} onChange={(event) => setDate(event.target.value)}
              min="0001-01-01" max={getPhilippineDateKey()} required disabled={save.isPending} />
          </div>
          {save.error ? <p role="alert" className="text-xs text-destructive">{save.error.message}</p> : null}
          <div className="flex justify-end gap-2">
            <Button type="button" size="sm" variant="outline" disabled={save.isPending} onClick={() => setEditing(false)}>Cancel</Button>
            <Button type="submit" size="sm" disabled={save.isPending}>{save.isPending ? "Saving…" : "Save record"}</Button>
          </div>
        </form>
      ) : null}
    </section>
  );
}
