import { cn } from "@/lib/utils";

export function ImpoundClaimBadge({ className }: { className?: string }) {
  return (
    <span className={cn("inline-flex w-fit items-center whitespace-nowrap rounded-full bg-primary-soft px-2 py-1 text-[9px] font-bold text-primary", className)}>
      Impound Claimed
    </span>
  );
}
