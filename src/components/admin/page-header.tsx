import type { ReactNode } from "react";

interface PageHeaderProps {
  eyebrow: string;
  title: string;
  description: string;
  actions?: ReactNode;
}

export function PageHeader({ eyebrow, title, description, actions }: PageHeaderProps) {
  return (
    <section className="fade-up flex flex-col gap-4 lg:flex-row lg:items-end lg:justify-between">
      <div>
        <div className="flex items-center gap-2 text-[10.5px] font-bold uppercase tracking-[0.16em] text-primary">
          <span className="h-px w-5 bg-primary/40" />
          {eyebrow}
        </div>
        <h1 className="mt-2 text-[30px] font-extrabold leading-[1.05] tracking-[-0.035em] text-foreground sm:text-[36px]">
          {title}
        </h1>
        <p className="mt-2 max-w-[560px] text-[13px] leading-relaxed text-muted-foreground">
          {description}
        </p>
      </div>
      {actions ? <div className="flex flex-wrap items-center gap-2">{actions}</div> : null}
    </section>
  );
}
