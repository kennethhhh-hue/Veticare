import { PetPhoto } from "@/components/owner-app/pet-photo";
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { cn } from "@/lib/utils";

interface PetPhotoPreviewProps {
  src?: string;
  name: string;
  species: "Dog" | "Cat";
  className?: string;
}

export function PetPhotoPreview({ src, name, species, className }: PetPhotoPreviewProps) {
  return (
    <div className={cn("relative shrink-0 rounded-xl", className)}>
      <PetPhoto src={src} alt={name} species={species} className="size-full rounded-[inherit]" />
      {src ? (
        <Dialog>
          <DialogTrigger asChild>
            <button type="button" aria-label={`Enlarge ${name}'s photo`} className="absolute inset-0 cursor-zoom-in rounded-[inherit] hover:ring-2 hover:ring-primary/40 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary" />
          </DialogTrigger>
          <DialogContent className="max-h-[calc(100dvh-2rem)] w-[calc(100%-2rem)] max-w-[560px] overflow-y-auto rounded-xl border-border bg-card">
            <DialogHeader className="pr-6 text-left">
              <DialogTitle>{name}'s photo</DialogTitle>
              <DialogDescription>Full-size pet photo preview.</DialogDescription>
            </DialogHeader>
            <PetPhoto src={src} alt={name} species={species} className="min-h-24 w-full rounded-xl [&_img]:h-auto [&_img]:max-h-[70dvh] [&_img]:object-contain" />
          </DialogContent>
        </Dialog>
      ) : null}
    </div>
  );
}
