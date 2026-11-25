import { useState, type FormEvent } from "react";
import { ArrowLeft, PawPrint, UploadCloud } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { PetPhotoPicker } from "@/components/veticare/pet-photo-picker";
import type { OwnerPet } from "@/data/owner-app";
import { supabase } from "@/integrations/supabase/client";

interface PetRegistrationScreenProps {
  onBack: () => void;
  onCreated: (pet: OwnerPet) => void;
}

export function PetRegistrationScreen({ onBack, onCreated }: PetRegistrationScreenProps) {
  const [name, setName] = useState("");
  const [species, setSpecies] = useState<"Dog" | "Cat">("Dog");
  const [breed, setBreed] = useState("");
  const [age, setAge] = useState("");
  const [sex, setSex] = useState<"Male" | "Female">("Male");
  const [weight, setWeight] = useState("");
  const [color, setColor] = useState("");
  const [photo, setPhoto] = useState<File | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);
  const [uploadProgress, setUploadProgress] = useState<number | null>(null);
  const handlePhotoChange = (file: File | null) => {
    setError(null);
    setUploadProgress(null);
    setPhoto(file);
  };

  const handleSubmit = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    setError(null);
    setSaving(true);
    setUploadProgress(photo ? 0 : null);

    const { data: userData, error: userError } = await supabase.auth.getUser();
    if (userError || !userData.user) {
      setSaving(false);
      setUploadProgress(null);
      setError("Your session expired. Please sign in again.");
      return;
    }

    let photoUrl: string | null = null;
    let photoPath: string | null = null;
    if (photo) {
      const extension = photo.type === "image/jpeg" ? "jpg" : photo.type.split("/")[1];
      photoPath = `${userData.user.id}/${crypto.randomUUID()}.${extension}`;
      const { data: sessionData, error: sessionError } = await supabase.auth.getSession();
      if (sessionError || !sessionData.session) {
        setSaving(false);
        setUploadProgress(null);
        setError(sessionError?.message ?? "Your session expired. Please sign in again.");
        return;
      }
      const segments = photoPath.split("/").map(encodeURIComponent).join("/");
      const storageUrl = `${import.meta.env.VITE_SUPABASE_URL}/storage/v1/object/veticare-pet-photos/${segments}`;
      const uploadError = await new Promise<string | null>((resolve) => {
        const request = new XMLHttpRequest();
        request.open("POST", storageUrl);
        request.setRequestHeader("Authorization", `Bearer ${sessionData.session.access_token}`);
        request.setRequestHeader("apikey", import.meta.env.VITE_SUPABASE_PUBLISHABLE_KEY);
        request.setRequestHeader("Content-Type", photo.type);
        request.setRequestHeader("Cache-Control", "3600");
        request.setRequestHeader("x-upsert", "false");
        request.upload.onprogress = (progressEvent) => {
          if (progressEvent.lengthComputable) {
            setUploadProgress(Math.min(99, Math.round((progressEvent.loaded / progressEvent.total) * 100)));
          }
        };
        request.onload = () => {
          if (request.status >= 200 && request.status < 300) {
            setUploadProgress(100);
            resolve(null);
            return;
          }
          try {
            const response = JSON.parse(request.responseText) as { message?: string; error?: string };
            resolve(response.message ?? response.error ?? `Photo upload failed (${request.status}).`);
          } catch {
            resolve(`Photo upload failed (${request.status}).`);
          }
        };
        request.onerror = () => resolve("Network error while uploading the pet photo.");
        request.onabort = () => resolve("Photo upload was canceled.");
        request.send(photo);
      });
      if (uploadError) {
        setSaving(false);
        setUploadProgress(null);
        setError(uploadError);
        return;
      }
      photoUrl = supabase.storage.from("veticare-pet-photos").getPublicUrl(photoPath).data.publicUrl;
    }

    const { data, error: insertError } = await supabase.from("pets").insert({
      owner_id: userData.user.id,
      name: name.trim(),
      species,
      breed: breed.trim(),
      age: age.trim(),
      sex,
      weight: weight.trim(),
      color: color.trim(),
      photo_url: photoUrl,
      status: "pending",
    }).select().single();

    if (insertError) {
      if (photoPath) await supabase.storage.from("veticare-pet-photos").remove([photoPath]);
      setSaving(false);
      setUploadProgress(null);
      setError(insertError.message);
      return;
    }

    onCreated({
      id: data.id,
      name: data.name,
      species: data.species as "Dog" | "Cat",
      breed: data.breed,
      age: data.age,
      sex: data.sex as "Male" | "Female",
      weight: data.weight || "Not provided",
      color: data.color || "Not provided",
      photoUrl: data.photo_url ?? undefined,
      petId: data.pet_id ?? "Pending review",
      qrCode: data.qr_code,
      registered: "Pending review",
      registrationStatus: data.status as "pending" | "approved" | "rejected",
      tags: ["Pending review"],
      nextDue: { title: "Registration review", date: "Awaiting city vet review", days: 0 },
      vaccines: [],
    });
    setSaving(false);
    setUploadProgress(null);
  };

  const fieldClassName = "h-10 rounded-xl border-border bg-background text-[12px]";

  return (
    <div className="pb-6">
      <header className="flex items-center gap-3 border-b border-border px-5 py-4">
        <button
          type="button"
          onClick={onBack}
          className="grid size-9 shrink-0 place-items-center rounded-full border border-border bg-card text-foreground hover:bg-secondary"
          aria-label="Back to my pets"
        >
          <ArrowLeft className="size-4" />
        </button>
        <div>
          <p className="text-[9px] font-bold uppercase tracking-[0.16em] text-primary">Pet registration</p>
          <h1 className="text-[18px] font-extrabold text-foreground">Add a new pet</h1>
        </div>
      </header>

      <form onSubmit={handleSubmit} className="space-y-3.5 px-5 pt-4">
        <div className="grid grid-cols-2 gap-3">
          <div className="col-span-2 space-y-1.5">
            <PetPhotoPicker photo={photo} onPhotoChange={handlePhotoChange} disabled={saving} />
            {saving && uploadProgress !== null ? (
              <div className="space-y-1.5" role="status" aria-live="polite">
                <div className="flex items-center justify-between text-[10px] font-semibold text-muted-foreground">
                  <span className="flex items-center gap-1.5"><UploadCloud className="size-3.5" />Uploading photo</span>
                  <span>{uploadProgress}%</span>
                </div>
                <div className="h-1.5 overflow-hidden rounded-full bg-secondary" aria-valuemin={0} aria-valuemax={100} aria-valuenow={uploadProgress} role="progressbar">
                  <div className="h-full rounded-full bg-primary transition-[width] duration-150" style={{ width: `${uploadProgress}%` }} />
                </div>
              </div>
            ) : null}
          </div>
          <div className="col-span-2 space-y-1.5">
            <Label htmlFor="pet-name">Pet name</Label>
            <Input id="pet-name" value={name} onChange={(event) => setName(event.target.value)} required maxLength={80} className={fieldClassName} />
          </div>
          <div className="space-y-1.5">
            <Label htmlFor="pet-species">Species</Label>
            <select id="pet-species" value={species} onChange={(event) => setSpecies(event.target.value as "Dog" | "Cat")} className={`${fieldClassName} w-full rounded-md border px-3`}>
              <option value="Dog">Dog</option>
              <option value="Cat">Cat</option>
            </select>
          </div>
          <div className="space-y-1.5">
            <Label htmlFor="pet-sex">Sex</Label>
            <select id="pet-sex" value={sex} onChange={(event) => setSex(event.target.value as "Male" | "Female")} className={`${fieldClassName} w-full rounded-md border px-3`}>
              <option value="Male">Male</option>
              <option value="Female">Female</option>
            </select>
          </div>
          <div className="col-span-2 space-y-1.5">
            <Label htmlFor="pet-breed">Breed</Label>
            <Input id="pet-breed" value={breed} onChange={(event) => setBreed(event.target.value)} required maxLength={100} className={fieldClassName} />
          </div>
          <div className="space-y-1.5">
            <Label htmlFor="pet-age">Age</Label>
            <Input id="pet-age" value={age} onChange={(event) => setAge(event.target.value)} placeholder="e.g. 2 years" required maxLength={40} className={fieldClassName} />
          </div>
          <div className="space-y-1.5">
            <Label htmlFor="pet-weight">Weight</Label>
            <Input id="pet-weight" value={weight} onChange={(event) => setWeight(event.target.value)} placeholder="e.g. 8 kg" maxLength={30} className={fieldClassName} />
          </div>
          <div className="col-span-2 space-y-1.5">
            <Label htmlFor="pet-color">Color / markings</Label>
            <Input id="pet-color" value={color} onChange={(event) => setColor(event.target.value)} placeholder="e.g. Brown and white" maxLength={80} className={fieldClassName} />
          </div>
        </div>

        <div className="flex items-start gap-2 rounded-xl border border-info/20 bg-info/5 p-3">
          <PawPrint className="mt-0.5 size-4 shrink-0 text-info" />
          <p className="text-[10px] leading-relaxed text-muted-foreground">
            Your submission will be marked pending until reviewed by the City Veterinary Office.
          </p>
        </div>

        {error ? <p className="text-[11px] text-destructive" role="alert">{error}</p> : null}

        <Button type="submit" disabled={saving} className="h-11 w-full rounded-xl text-[12px] font-bold">
          {saving ? "Submitting…" : "Submit pet registration"}
        </Button>
      </form>
    </div>
  );
}
