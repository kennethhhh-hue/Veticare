import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { cn } from "@/lib/utils";

export function AccountAvatar({ name, photoUrl, className }: { name: string; photoUrl?: string; className?: string }) {
  const initials = name.trim().split(/\s+/).slice(0, 2).map((part) => part[0]).join("").toUpperCase() || "VC";

  return (
    <Avatar aria-hidden="true" className={cn("bg-primary text-xs font-bold text-primary-foreground", className)}>
      {photoUrl ? <AvatarImage src={photoUrl} alt="" className="object-cover" /> : null}
      <AvatarFallback className="bg-transparent">{initials}</AvatarFallback>
    </Avatar>
  );
}
