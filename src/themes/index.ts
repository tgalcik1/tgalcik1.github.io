import { coolTheme } from "./cool";
import { defaultTheme } from "./default";
import { mossTheme } from "./moss";
import { orangeTheme } from "./orange";
import { sunsetTheme } from "./sunset";
import type { Theme } from "./types";

export const themes = {
  default: defaultTheme,
  orange: orangeTheme,
  cool: coolTheme,
  moss: mossTheme,
  sunset: sunsetTheme,
} as const;

export const activeThemeName: keyof typeof themes = "default";
export const activeTheme: Theme = themes[activeThemeName] ?? defaultTheme;

export function themeStyle(theme: Theme) {
  return Object.entries(theme.cssVars)
    .map(([key, value]) => `${key}: ${value}`)
    .join("; ");
}
