import { useState } from "react";
import { PawPrint } from "lucide-react";
import { cn } from "@/lib/utils";

interface PetPhotoProps {
  src?: string;
  alt: string;
  species: "Dog" | "Cat";
  className?: string;
}

export function PetPhoto({ src, alt, species, className }: PetPhotoProps) {
  const [failed, setFailed] = useState(false);
  const showImage = Boolean(src) && !failed;

  return (
    <div className={cn("relative overflow-hidden bg-secondary", className)}>
      {showImage ? (
        <img
          src={src}
          alt={alt}
          crossOrigin="anonymous"
          loading="lazy"
          onError={() => setFailed(true)}
          className="size-full object-cover"
        />
      ) : (
        <div
          className={cn(
            "flex size-full items-center justify-center bg-gradient-to-br",
            species === "Dog"
              ? "from-primary-soft via-accent to-secondary"
              : "from-warning/15 via-primary-soft to-secondary",
          )}
          aria-label={alt}
          role="img"
        >
          <PawPrint className="size-7 text-primary/30" strokeWidth={1.6} />
        </div>
      )}
    </div>
  );
}
