import { useEffect, useId, useRef, useState } from "react";
import { ImagePlus, X } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Dialog, DialogClose, DialogContent, DialogDescription, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Label } from "@/components/ui/label";
import { PetPhotoPreview } from "@/components/veticare/pet-photo-preview";
import { cn } from "@/lib/utils";
import { getPetPhotoError, petPhotoTypes } from "@/lib/pet-photo";

interface PetPhotoPickerProps {
  photo: File | null;
  onPhotoChange: (photo: File | null) => void;
  savedPhoto?: { url: string; name: string; species: "Dog" | "Cat" };
  disabled?: boolean;
}

const pickerCardClass = "flex w-full items-center gap-3 rounded-xl border border-dashed border-border bg-card p-3 text-left";
const acceptedFormats = "JPG, PNG, or WebP, up to 5 MB";

export function PetPhotoPicker({ photo, onPhotoChange, savedPhoto, disabled }: PetPhotoPickerProps) {
  const id = useId();
  const input = useRef<HTMLInputElement>(null);
  const [preview, setPreview] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const url = photo ? URL.createObjectURL(photo) : null;
    setPreview(url);
    return () => {
      if (url) URL.revokeObjectURL(url);
    };
  }, [photo]);

  return (
    <div className="space-y-1.5">
      <Label htmlFor={id}>Pet photo (optional)</Label>
      {(photo && preview) || savedPhoto ? (
        <div className={pickerCardClass}>
          {photo && preview ? (
            <Dialog>
              <DialogTrigger asChild>
                <button type="button" className="shrink-0 cursor-zoom-in rounded-lg focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary" aria-label="Preview selected pet photo">
                  <img src={preview} alt="" className="size-16 rounded-lg object-cover" />
                </button>
              </DialogTrigger>
              <DialogContent className="max-w-[min(92vw,560px)] overflow-hidden rounded-2xl p-3">
                <DialogHeader className="sr-only">
                  <DialogTitle>Pet photo preview</DialogTitle>
                  <DialogDescription>Preview of the selected pet photo.</DialogDescription>
                </DialogHeader>
                <img src={preview} alt="Selected pet" className="max-h-[75vh] w-full rounded-xl object-contain" />
                <DialogClose asChild>
                  <Button type="button" variant="outline" className="w-full"><X className="size-4" />Close preview</Button>
                </DialogClose>
              </DialogContent>
            </Dialog>
          ) : savedPhoto ? (
            <PetPhotoPreview src={savedPhoto.url} name={savedPhoto.name} species={savedPhoto.species} className="size-16 rounded-lg" />
          ) : null}
          <span className="min-w-0 flex-1">
            <span className="block truncate text-[12px] font-semibold text-foreground">{photo?.name ?? "Current pet photo"}</span>
            <span className="mt-0.5 block text-[10px] text-muted-foreground">{acceptedFormats}</span>
          </span>
          <Button id={id} type="button" variant="outline" size="sm" disabled={disabled} onClick={() => input.current?.click()} aria-label="Change pet photo">
            Change
          </Button>
        </div>
      ) : (
        <button id={id} type="button" disabled={disabled} onClick={() => input.current?.click()} className={cn(pickerCardClass, "cursor-pointer hover:border-primary/60 hover:bg-secondary/40 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary disabled:cursor-not-allowed")} aria-label="Choose a pet photo">
          <span className="grid size-16 shrink-0 place-items-center rounded-lg bg-secondary text-muted-foreground"><ImagePlus className="size-5" /></span>
          <span className="min-w-0">
            <span className="block text-[12px] font-semibold text-foreground">Choose a pet photo</span>
            <span className="mt-0.5 block text-[10px] text-muted-foreground">{acceptedFormats}</span>
          </span>
        </button>
      )}
      <input
        ref={input}
        type="file"
        accept={petPhotoTypes.join(",")}
        disabled={disabled}
        hidden
        onChange={(event) => {
          const file = event.currentTarget.files?.[0];
          event.currentTarget.value = "";
          if (!file) return;
          const validationError = getPetPhotoError(file);
          setError(validationError);
          onPhotoChange(validationError ? null : file);
        }}
      />
      {error ? <p className="text-xs text-destructive" role="alert">{error}</p> : null}
    </div>
  );
}
