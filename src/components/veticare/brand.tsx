import { cn } from "@/lib/utils";
interface BrandProps {
  className?: string;
}
export function Brand({
  className
}: BrandProps) {
  return <div className={cn("leading-none", className)}>
      <p className="text-[26px] font-extrabold leading-none tracking-[-0.04em] text-foreground">
        Veti<span className="text-primary font-[Montserrat]">care</span>
      </p>
      <p className="mt-1.5 text-[9px] font-semibold uppercase tracking-[0.18em] text-muted-foreground">
        care, protect, unite
      </p>
    </div>;
}