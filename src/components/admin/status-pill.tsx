import { cn } from "@/lib/utils";

type Status =
  | "approved"
  | "pending"
  | "rejected"
  | "active"
  | "inactive"
  | "completed"
  | "kennel"
  | "foster"
  | "reserved"
  | "expired"
  | "replaced"
  | "passed"
  | "scheduled"
  | "invited"
  | "ready"
  | "success"
  | "failed"
  | "warning";

const toneMap: Record<Status, { dot: string; chip: string; label: string }> = {
  approved: { dot: "bg-success", chip: "bg-success/10 text-success", label: "Approved" },
  pending: { dot: "bg-warning", chip: "bg-warning/12 text-warning", label: "Pending" },
  rejected: { dot: "bg-destructive", chip: "bg-destructive/10 text-destructive", label: "Rejected" },
  active: { dot: "bg-success", chip: "bg-success/10 text-success", label: "Active" },
  inactive: { dot: "bg-muted-foreground", chip: "bg-secondary text-muted-foreground", label: "Inactive" },
  completed: { dot: "bg-success", chip: "bg-success/10 text-success", label: "Completed" },
  kennel: { dot: "bg-info", chip: "bg-info/12 text-info", label: "In kennel" },
  foster: { dot: "bg-warning", chip: "bg-warning/12 text-warning", label: "Foster" },
  reserved: { dot: "bg-primary", chip: "bg-primary-soft text-primary", label: "Reserved" },
  expired: { dot: "bg-destructive", chip: "bg-destructive/10 text-destructive", label: "Expired" },
  replaced: { dot: "bg-muted-foreground", chip: "bg-secondary text-muted-foreground", label: "Replaced" },
  passed: { dot: "bg-success", chip: "bg-success/10 text-success", label: "Passed" },
  scheduled: { dot: "bg-info", chip: "bg-info/12 text-info", label: "Scheduled" },
  invited: { dot: "bg-info", chip: "bg-info/12 text-info", label: "Invited" },
  ready: { dot: "bg-success", chip: "bg-success/10 text-success", label: "Ready" },
  success: { dot: "bg-success", chip: "bg-success/10 text-success", label: "Success" },
  failed: { dot: "bg-destructive", chip: "bg-destructive/10 text-destructive", label: "Failed" },
  warning: { dot: "bg-warning", chip: "bg-warning/12 text-warning", label: "Warning" },
};

export function StatusPill({ status, className }: { status: Status | string; className?: string }) {
  const tone = toneMap[status as Status] ?? {
    dot: "bg-muted-foreground",
    chip: "bg-secondary text-muted-foreground",
    label: status ? status.replace(/[_-]+/g, " ").replace(/\b\w/g, (part) => part.toUpperCase()) : "Unknown",
  };
  return (
    <span
      className={cn(
        "inline-flex items-center gap-1.5 rounded-full px-2 py-1 text-[10px] font-bold",
        tone.chip,
        className,
      )}
    >
      <span className={cn("size-1.5 rounded-full", tone.dot)} />
      {tone.label}
    </span>
  );
}
