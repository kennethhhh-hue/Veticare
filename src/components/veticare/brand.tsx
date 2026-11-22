import { cn } from "@/lib/utils";
interface BrandProps {
  className?: string;
  compact?: boolean;
}
export function Brand({
  className,
  compact = false,
}: BrandProps) {
  return (
    <div className={cn("flex min-w-0 items-center gap-0", compact && "w-full", className)}>
      <img src="/images/Veticare%20Logo.png" alt="" aria-hidden="true" className={cn("shrink-0 object-cover", compact ? "size-[64px]" : "size-[160px]")} />
      <div className="min-w-0 leading-none">
        <p className={cn("whitespace-nowrap font-extrabold leading-none tracking-[-0.04em] text-foreground", compact ? "text-[23px]" : "text-[34px]")}>
          Veti<span className="text-primary font-[Montserrat]">care</span>
        </p>
        <p className={cn("mt-2 font-semibold uppercase tracking-[0.16em] text-muted-foreground", compact ? "text-[7px]" : "text-[10px]")}>
          care, protect, unite
        </p>
      </div>
    </div>
  );
}