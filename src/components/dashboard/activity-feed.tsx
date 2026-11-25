import {
  Activity,
  Check,
  Heart,
  PawPrint,
  Plus,
  X,
} from "lucide-react";
import { useNavigate } from "react-router-dom";
import { cn } from "@/lib/utils";
import type { FeedItem } from "@/data/veticare";

interface ActivityFeedProps {
  items: FeedItem[];
  loading: boolean;
  error: string | null;
}

const typeStyles: Record<
  FeedItem["type"],
  { icon: typeof Check; className: string }
> = {
  approve: { icon: Check, className: "bg-success/10 text-success" },
  reject: { icon: X, className: "bg-destructive/10 text-destructive" },
  register: { icon: Plus, className: "bg-primary-soft text-primary" },
  adopt: { icon: Heart, className: "bg-info/10 text-info" },
  impound: { icon: PawPrint, className: "bg-warning/12 text-warning" },
};

export function ActivityFeed({ items, loading, error }: ActivityFeedProps) {
  const navigate = useNavigate();
  const destinationByType = {
    approve: "/registrations",
    reject: "/registrations",
    register: "/registrations",
    adopt: "/adoptions",
    impound: "/impounded-dogs",
  } as const;

  return (
    <section className="surface-card fade-up rounded-2xl border border-border bg-card p-4">
      <div className="flex items-center justify-between">
        <div>
          <p className="flex items-center gap-1.5 text-[10.5px] font-bold uppercase tracking-[0.16em] text-primary">
            <Activity className="size-3.5" />
            Live
          </p>
          <h2 className="mt-1 text-[15px] font-extrabold tracking-[-0.02em] text-foreground">
            Recent activity
          </h2>
        </div>
      </div>

      <ul className="relative mt-3 space-y-3">
        <span
          className="absolute bottom-2 left-[13px] top-2 w-px bg-border"
          aria-hidden
        />
        {items.slice(0, 5).map((item) => {
          const style = typeStyles[item.type];
          const Icon = style.icon;
          return (
            <li key={item.id} className="relative">
              <button
                type="button"
                onClick={() => navigate(item.destination ?? destinationByType[item.type])}
                className="flex w-full gap-2.5 rounded-lg text-left transition-colors hover:bg-secondary/50 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary"
                aria-label={`Open ${item.type} record: ${item.target}`}
              >
              <span
                className={cn(
                  "relative z-10 grid size-[27px] shrink-0 place-items-center rounded-full ring-4 ring-card",
                  style.className,
                )}
              >
                <Icon className="size-3" strokeWidth={2.4} />
              </span>
              <div className="min-w-0 pt-0.5">
                <p className="text-[11.5px] leading-snug text-muted-foreground">
                  <span className="font-semibold text-foreground">{item.actor}</span>{" "}
                  {item.action}{" "}
                  <span className="font-semibold text-foreground">{item.target}</span>
                </p>
                <p className="mt-0.5 text-[10px] text-muted-foreground/70">{item.time}</p>
              </div>
              </button>
            </li>
          );
        })}
      </ul>
      {loading ? <p className="mt-3 text-center text-[10px] text-muted-foreground">Loading recent activity…</p> : null}
      {!loading && error ? <p className="mt-3 rounded-lg bg-warning/10 p-2 text-[9.5px] text-foreground">{error}</p> : null}
      {!loading && !error && items.length === 0 ? <p className="mt-3 text-center text-[10px] text-muted-foreground">No activity recorded yet.</p> : null}
    </section>
  );
}
