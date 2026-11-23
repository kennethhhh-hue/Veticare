import { useState } from "react";
import { ChevronRight, Clock, History, QrCode } from "lucide-react";
import { cn } from "@/lib/utils";
import { PetRecord } from "@/pages/personnel/pet-record";
import {
  type PersonnelPet,
  scanResultLabels,
  type ScanEntry,
  type ScanResult,
} from "@/data/personnel";

const filters: { key: "all" | ScanResult; label: string }[] = [
  { key: "all", label: "All" },
  { key: "verified", label: "Verified" },
  { key: "flagged", label: "Flagged" },
  { key: "expired", label: "Expired" },
];

const resultTone: Record<ScanResult, string> = {
  verified: "bg-success/10 text-success",
  flagged: "bg-warning/12 text-warning",
  expired: "bg-destructive/10 text-destructive",
  unregistered: "bg-secondary text-muted-foreground",
};

interface HistoryScreenProps {
  scans: ScanEntry[];
  pets: PersonnelPet[];
}

export function HistoryScreen({ scans, pets }: HistoryScreenProps) {
  const [filter, setFilter] = useState<"all" | ScanResult>("all");
  const [selected, setSelected] = useState<ScanEntry | null>(null);

  const visible = scans.filter((scan) => filter === "all" || scan.result === filter);

  if (selected) {
    const pet = pets.find((item) => item.recordId === selected.petRecordId);
    return (
      <div className="pb-6">
        <header className="px-5 pt-5">
          <p className="text-[9.5px] font-bold uppercase tracking-[0.16em] text-primary">
            Scan {selected.id}
          </p>
          <h1 className="mt-1 text-[22px] font-extrabold leading-none tracking-[-0.03em] text-foreground">
            Scan detail
          </h1>
        </header>
        <div className="mt-4 space-y-3 px-5">
          {pet ? (
            <PetRecord pet={pet} mode="scan" onBack={() => setSelected(null)} />
          ) : (
            <button
              type="button"
              onClick={() => setSelected(null)}
              className="text-[10.5px] font-semibold text-primary"
            >
              Back to history
            </button>
          )}

          <div className="rounded-2xl border border-border bg-card p-3.5">
            <p className="text-[8.5px] font-bold uppercase tracking-[0.12em] text-muted-foreground">
              Scan log
            </p>
            <div className="mt-2 space-y-2">
              <div className="flex items-center justify-between gap-2">
                <span className="text-[9.5px] text-muted-foreground">Result</span>
                <span
                  className={cn(
                    "rounded-full px-1.5 py-0.5 text-[8.5px] font-bold",
                    resultTone[selected.result],
                  )}
                >
                  {scanResultLabels[selected.result]}
                </span>
              </div>
              <div className="flex items-center justify-between gap-2">
                <span className="text-[9.5px] text-muted-foreground">Scanned</span>
                <span className="num text-[10px] font-semibold text-foreground">
                  {selected.scannedAt}
                </span>
              </div>
              <div className="flex items-center justify-between gap-2">
                <span className="text-[9.5px] text-muted-foreground">Personnel</span>
                <span className="text-[10px] font-semibold text-foreground">
                  {selected.officer}
                </span>
              </div>
              <div className="flex items-start justify-between gap-2">
                <span className="text-[9.5px] text-muted-foreground">Note</span>
                <span className="max-w-[70%] text-right text-[9.5px] leading-relaxed text-foreground/85">
                  {selected.note}
                </span>
              </div>
            </div>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="pb-6">
      <header className="px-5 pt-5">
        <p className="text-[9.5px] font-bold uppercase tracking-[0.16em] text-primary">
          Accountability
        </p>
        <h1 className="mt-1 text-[24px] font-extrabold leading-none tracking-[-0.03em] text-foreground">
          Scan history
        </h1>
        <p className="mt-1.5 text-[11px] text-muted-foreground">
          {scans.length} scans logged by you.
        </p>
      </header>

      <div className="mt-3.5 flex items-center gap-1.5 overflow-x-auto px-5 pb-1">
        {filters.map((item) => (
          <button
            key={item.key}
            type="button"
            onClick={() => setFilter(item.key)}
            className={cn(
              "shrink-0 rounded-full px-2.5 py-1.5 text-[10px] font-bold transition-colors",
              filter === item.key
                ? "bg-primary text-primary-foreground shadow-glow"
                : "border border-border bg-card text-muted-foreground hover:text-foreground",
            )}
          >
            {item.label}
          </button>
        ))}
      </div>

      <div className="mt-3 space-y-2 px-5">
        {visible.length === 0 ? (
          <div className="rounded-xl border border-border bg-card px-4 py-8 text-center">
            <History className="mx-auto size-6 text-muted-foreground/60" />
            <p className="mt-2 text-[11.5px] font-bold text-foreground">No scans yet</p>
            <p className="mt-1 text-[10px] text-muted-foreground">
              Scans you record will appear here.
            </p>
          </div>
        ) : (
          visible.map((scan) => (
            <button
              key={scan.id}
              type="button"
              onClick={() => setSelected(scan)}
              className="flex w-full items-center gap-2.5 rounded-xl border border-border bg-card p-2.5 text-left shadow-card transition-colors hover:border-primary/25"
            >
              <span
                className={cn(
                  "grid size-9 shrink-0 place-items-center rounded-lg",
                  resultTone[scan.result],
                )}
              >
                <QrCode className="size-4" />
              </span>
              <span className="min-w-0 flex-1">
                <span className="flex items-center justify-between gap-2">
                  <span className="truncate text-[11.5px] font-bold text-foreground">
                    {scan.petName}
                  </span>
                  <span
                    className={cn(
                      "shrink-0 rounded-full px-1.5 py-0.5 text-[8px] font-bold",
                      resultTone[scan.result],
                    )}
                  >
                    {scanResultLabels[scan.result]}
                  </span>
                </span>
                <span className="num mt-0.5 block truncate text-[9px] text-muted-foreground">
                  {scan.petId} • {scan.officer}
                </span>
                <span className="mt-0.5 flex items-center gap-1 text-[8.5px] text-muted-foreground/80">
                  <Clock className="size-2.5" />
                  {scan.scannedAt}
                </span>
              </span>
              <ChevronRight className="size-3.5 shrink-0 text-muted-foreground" />
            </button>
          ))
        )}
      </div>
    </div>
  );
}
