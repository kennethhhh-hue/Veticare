export const PHILIPPINE_TIME_ZONE = "Asia/Manila";

export function formatCalendarDate(value: string): string {
  return new Date(`${value}T00:00:00Z`).toLocaleDateString("en-PH", { dateStyle: "medium", timeZone: "UTC" });
}

export function getPhilippineDateKey(date = new Date()): string {
  const parts = new Intl.DateTimeFormat("en-CA", {
    timeZone: PHILIPPINE_TIME_ZONE,
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
  }).formatToParts(date);
  const values = Object.fromEntries(parts.map((part) => [part.type, part.value]));
  return `${values.year}-${values.month}-${values.day}`;
}

export function addCalendarDays(dateKey: string, days: number): string {
  const [year, month, day] = dateKey.split("-").map(Number);
  const date = new Date(Date.UTC(year, month - 1, day));
  date.setUTCDate(date.getUTCDate() + days);
  return date.toISOString().slice(0, 10);
}

export function getPhilippineDayStartIso(dateKey: string): string {
  const [year, month, day] = dateKey.split("-").map(Number);
  return new Date(Date.UTC(year, month - 1, day) - 8 * 60 * 60 * 1000).toISOString();
}
