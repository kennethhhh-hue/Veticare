import { Clock3, Mail, MapPin, Phone } from "lucide-react";

const contactRows = [
  {
    label: "Address",
    value: "OCVAS Compound, Sang Virgen St., Brgy. Bolbok, Batangas City, 4200 Batangas",
    href: "https://maps.google.com/?q=OCVAS+Compound+Sang+Virgen+St+Bolbok+Batangas+City",
    icon: MapPin,
  },
  {
    label: "Telephone",
    value: "(043) 984-0217 / (043) 984-1648",
    href: "tel:+63439840217",
    icon: Phone,
  },
  {
    label: "Email",
    value: "ocvasbatangas@yahoo.com",
    href: "mailto:ocvasbatangas@yahoo.com",
    icon: Mail,
  },
  {
    label: "Office hours",
    value: "Monday–Friday, 8:00 AM–5:00 PM",
    icon: Clock3,
  },
] as const;

export function OcvasContactInfo({ compact = false }: { compact?: boolean }) {
  return (
    <section
      aria-label="Office of the City Veterinarian and Agricultural Services contact information"
      className={compact ? "rounded-xl border border-border bg-card p-3.5" : "w-full border-t border-border/70 bg-card/45 px-4 py-5 sm:px-6 lg:px-8"}
    >
      <div className={compact ? "flex flex-wrap items-baseline justify-between gap-x-3 gap-y-0.5" : "mx-auto max-w-[1080px]"}>
        <div className="flex flex-wrap items-baseline justify-between gap-x-3 gap-y-0.5">
          <h2 className="text-[11px] font-bold leading-snug text-foreground">
            Office of the City Veterinarian and Agricultural Services
          </h2>
          <span className="text-[9px] font-semibold text-primary">OCVAS · Batangas City</span>
        </div>
        <ul className={`mt-3 grid gap-x-5 gap-y-2.5 ${compact ? "grid-cols-1" : "grid-cols-2 lg:grid-cols-4"}`}>
          {contactRows.map((row) => {
            const Icon = row.icon;
            const content = (
              <>
                <Icon className="mt-0.5 size-3.5 shrink-0 text-primary" />
                <span className="min-w-0">
                  <span className="block text-[8px] font-bold uppercase tracking-[0.1em] text-muted-foreground">{row.label}</span>
                  <span className="block break-words text-[9.5px] font-medium leading-snug text-foreground">{row.value}</span>
                </span>
              </>
            );
            return (
              <li key={row.label} className={row.label === "Address" && !compact ? "col-span-2 lg:col-span-1" : undefined}>
                {"href" in row ? (
                  <a href={row.href} target={row.href.startsWith("https:") ? "_blank" : undefined} rel={row.href.startsWith("https:") ? "noreferrer" : undefined} className="flex items-start gap-2 rounded-md focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary">
                    {content}
                  </a>
                ) : (
                  <div className="flex items-start gap-2">{content}</div>
                )}
              </li>
            );
          })}
        </ul>
      </div>
    </section>
  );
}
