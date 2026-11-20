// Side-effect imports that must run before the app renders, e.g. the runtime an
// Enter feature skill installs (the enter_i18n skill adds `import "./i18n/config";`).
// Imported by src/main.tsx ahead of App; add imports here, never to src/main.tsx.

export type ThemePreference = "light" | "dark" | "system";

export const THEME_STORAGE_KEY = "veticare-theme";

export function isThemePreference(value: string | null): value is ThemePreference {
  return value === "light" || value === "dark" || value === "system";
}

export function applyTheme(theme: ThemePreference) {
  if (typeof window === "undefined") return;
  const prefersDark = window.matchMedia("(prefers-color-scheme: dark)").matches;
  const dark = theme === "dark" || (theme === "system" && prefersDark);
  document.documentElement.classList.toggle("dark", dark);
  document.documentElement.style.colorScheme = dark ? "dark" : "light";
}

if (typeof window !== "undefined") {
  const stored = window.localStorage.getItem(THEME_STORAGE_KEY);
  applyTheme(isThemePreference(stored) ? stored : "light");
}
