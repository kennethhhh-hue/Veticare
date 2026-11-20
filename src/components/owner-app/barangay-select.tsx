import { useState } from "react";
import { Check, ChevronsUpDown } from "lucide-react";
import { cn } from "@/lib/utils";
import { BATANGAS_CITY_BARANGAYS } from "@/data/batangas-city-barangays";
import { Button } from "@/components/ui/button";
import { Command, CommandEmpty, CommandGroup, CommandInput, CommandItem, CommandList } from "@/components/ui/command";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";

interface BarangaySelectProps {
  id?: string;
  value: string;
  onValueChange: (value: string) => void;
  placeholder?: string;
  required?: boolean;
  className?: string;
}

export function BarangaySelect({
  id,
  value,
  onValueChange,
  placeholder = "Select a Batangas City barangay",
  required,
  className,
}: BarangaySelectProps) {
  const [open, setOpen] = useState(false);

  return (
    <Popover open={open} onOpenChange={setOpen}>
      <PopoverTrigger asChild>
        <Button
          id={id}
          type="button"
          variant="outline"
          role="combobox"
          aria-expanded={open}
          aria-required={required}
          className={cn("h-11 w-full justify-between rounded-md border-input bg-background px-3 text-left text-sm font-normal", className)}
        >
          <span className={cn("truncate", !value && "text-muted-foreground")}>
            {value || placeholder}
          </span>
          <ChevronsUpDown className="ml-2 size-4 shrink-0 opacity-50" />
        </Button>
      </PopoverTrigger>
      <PopoverContent align="start" className="w-[var(--radix-popover-trigger-width)] min-w-[260px] p-0">
        <Command>
          <CommandInput placeholder="Search barangay…" aria-label="Search Batangas City barangays" />
          <CommandList>
            <CommandEmpty>No Batangas City barangay found.</CommandEmpty>
            <CommandGroup>
              {BATANGAS_CITY_BARANGAYS.map((barangay) => (
                <CommandItem
                  key={barangay}
                  value={barangay}
                  onSelect={() => {
                    onValueChange(barangay);
                    setOpen(false);
                  }}
                  className="text-sm"
                >
                  <Check className={cn("mr-2 size-4", value === barangay ? "opacity-100" : "opacity-0")} />
                  {barangay}
                </CommandItem>
              ))}
            </CommandGroup>
          </CommandList>
        </Command>
      </PopoverContent>
    </Popover>
  );
}
