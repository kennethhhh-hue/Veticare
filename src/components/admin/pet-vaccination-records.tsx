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
  const [editingRecordId, setEditingRecordId] = useState<string | null>(null);
  const [name, setName] = useState("");
  const [date, setDate] = useState(getPhilippineDateKey);
  const [nextDue, setNextDue] = useState("");
  const save = useMutation({
    mutationFn: async () => {
      if (nextDue && nextDue <= date) throw new Error("The next due date must be after the date administered.");
      if (editingRecordId) {
        const { error } = await supabase.from("pet_vaccinations").update({ next_due_on: nextDue || null })
          .eq("id", editingRecordId).eq("pet_record_id", petId).select("id").single();
        if (error) throw new Error(error.message);
        return;
      }
      const vaccineName = name.trim();
      if (!vaccineName || vaccineName.length > 120) throw new Error("Enter a vaccine name up to 120 characters.");
      if (!date || date > getPhilippineDateKey()) throw new Error("Choose the date the vaccine was given.");
      const { error } = await supabase.from("pet_vaccinations").insert({
        pet_record_id: petId,
        vaccine_name: vaccineName,
        administered_on: date,
        next_due_on: nextDue || null,
      });
      if (error?.code === "23505") throw new Error("This vaccine is already recorded for that date.");
      if (error) throw new Error(error.message);
    },
    onSuccess: () => {
      setEditing(false);
      void queryClient.invalidateQueries({ queryKey });
      toast.success(editingRecordId ? "Next due date updated." : "Vaccination recorded.");
    },
  });

  const openEditor = (record?: NonNullable<typeof vaccinations.data>[number]) => {
    save.reset();
    setEditingRecordId(record?.id ?? null);
    setName(record?.vaccine_name ?? "");
    setDate(record?.administered_on ?? getPhilippineDateKey());
    setNextDue(record?.next_due_on ?? "");
    setEditing(true);
  };

  const submit = (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    if (!save.isPending) save.mutate();
  };

  return (
    <section className="space-y-2 rounded-xl border border-border p-3">
      <div className="flex flex-wrap items-center justify-between gap-2">
        <h3 className="text-[11px] font-bold uppercase tracking-wide text-muted-foreground">Vaccination history</h3>
        {!editing && vaccinations.isSuccess ? (
          <Button type="button" size="sm" variant="outline" onClick={() => openEditor()}>Record vaccination</Button>
        ) : null}
      </div>
      {vaccinations.isPending ? <p className="text-xs text-muted-foreground">Loading vaccination records…</p> : null}
      {vaccinations.isError ? <p role="alert" className="text-xs text-destructive">Vaccination records are currently unavailable.</p> : null}
      {vaccinations.data?.length ? (
        <ul className="divide-y divide-border">
          {vaccinations.data.map((row) => (
            <li key={row.id} className="flex items-start justify-between gap-2 py-1.5 text-xs">
              <div className="min-w-0 space-y-0.5">
                <p className="break-words font-semibold">{row.vaccine_name}</p>
                <p className="text-muted-foreground">Given {formatCalendarDate(row.administered_on)}</p>
                {row.next_due_on ? <p className="text-muted-foreground">Next due {formatCalendarDate(row.next_due_on)}</p> : null}
              </div>
              {!editing ? <Button type="button" size="sm" variant="ghost" onClick={() => openEditor(row)}>{row.next_due_on ? "Edit due date" : "Set due date"}</Button> : null}
            </li>
          ))}
        </ul>
      ) : vaccinations.isSuccess ? <p className="text-xs text-muted-foreground">No vaccinations recorded.</p> : null}
      {editing ? (
        <form onSubmit={submit} className="space-y-2 border-t border-border pt-2">
          <div className="space-y-1">
            <Label htmlFor="admin-vaccine-name">Vaccine name</Label>
            <Input id="admin-vaccine-name" value={name} onChange={(event) => setName(event.target.value)} required maxLength={120} disabled={save.isPending || !!editingRecordId} />
          </div>
          <div className="space-y-1">
            <Label htmlFor="admin-vaccine-date">Date administered</Label>
            <Input id="admin-vaccine-date" type="date" value={date} onChange={(event) => setDate(event.target.value)}
              min="0001-01-01" max={getPhilippineDateKey()} required disabled={save.isPending || !!editingRecordId} />
          </div>
          <div className="space-y-1">
            <Label htmlFor="admin-vaccine-due-date">Next due date</Label>
            <Input id="admin-vaccine-due-date" type="date" value={nextDue} onChange={(event) => setNextDue(event.target.value)}
              min={date} max="9999-12-31" disabled={save.isPending} />
            <p className="text-xs text-muted-foreground">The owner can receive email reminders when a due date is set.</p>
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
