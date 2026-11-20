import {
  IdCard,
  Heart,
  PawPrint,
  Plus,
  ShieldCheck,
  UserPlus,
  Zap,
} from "lucide-react";
import { quickActions } from "@/data/veticare";

const icons = {
  plus: Plus,
  shield: ShieldCheck,
  "user-plus": UserPlus,
  paw: PawPrint,
  heart: Heart,
  id: IdCard,
} as const;

interface QuickActionsProps {
  onAction: (id: string) => void;
}

export function QuickActions({ onAction }: QuickActionsProps) {
  return (
    <section className="surface-card fade-up rounded-2xl border border-border bg-card p-4">
      <div className="flex items-center justify-between">
        <div>
          <p className="flex items-center gap-1.5 text-[10.5px] font-bold uppercase tracking-[0.16em] text-primary">
            <Zap className="size-3.5" />
            Shortcuts
          </p>
          <h2 className="mt-1 text-[15px] font-extrabold tracking-[-0.02em] text-foreground">
            Quick actions
          </h2>
        </div>
        <span className="rounded-md bg-secondary px-1.5 py-0.5 text-[9.5px] font-bold uppercase tracking-wide text-muted-foreground">
          6
        </span>
      </div>

      <div className="mt-3 grid grid-cols-3 gap-1.5">
        {quickActions.map((action) => {
          const Icon = icons[action.icon];
          return (
            <button
              key={action.id}
              type="button"
              onClick={() => onAction(action.id)}
              className="group flex flex-col items-center gap-1.5 rounded-xl border border-border/80 bg-background/50 px-1.5 py-2.5 text-center transition-all hover:-translate-y-0.5 hover:border-primary/30 hover:bg-primary-soft/40"
            >
              <span className="grid size-8 place-items-center rounded-lg bg-primary-soft text-primary transition-transform group-hover:scale-105">
                <Icon className="size-4" strokeWidth={2.1} />
              </span>
              <span className="text-[10.5px] font-semibold leading-tight text-foreground/90">
                {action.label}
              </span>
            </button>
          );
        })}
      </div>
    </section>
  );
}
