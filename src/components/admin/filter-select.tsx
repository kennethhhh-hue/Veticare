import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { cn } from "@/lib/utils";

interface FilterSelectProps {
  label: string;
  value: string;
  onChange: (value: string) => void;
  options: { value: string; label: string }[];
  className?: string;
}

export function FilterSelect({ label, value, onChange, options, className }: FilterSelectProps) {
  return (
    <div
      className={cn(
        "flex flex-col items-start gap-1 sm:flex-row sm:items-center sm:gap-2",
        className,
      )}
    >
      <span className="text-[9.5px] font-bold uppercase tracking-[0.1em] text-muted-foreground sm:text-[10px]">
        {label}
      </span>
      <Select value={value} onValueChange={onChange}>
        <SelectTrigger className="h-9 w-full rounded-xl border-border bg-background text-[11.5px] font-semibold focus:ring-primary/20 sm:w-[118px]">
          <SelectValue />
        </SelectTrigger>
        <SelectContent className="rounded-xl border-border">
          {options.map((option) => (
            <SelectItem key={option.value} value={option.value} className="text-[12px]">
              {option.label}
            </SelectItem>
          ))}
        </SelectContent>
      </Select>
    </div>
  );
}
