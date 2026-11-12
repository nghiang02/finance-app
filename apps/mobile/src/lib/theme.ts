import { DarkTheme, DefaultTheme, type Theme } from "expo-router";
import { useColorScheme } from "react-native";

/**
 * Same design tokens as the web app (apps/web/src/app/globals.css), so both apps look alike.
 * Screens read colors from `useAppTheme()` instead of hard-coding them, so dark mode works.
 */
export const BRAND = {
  50: "#ECFBF0",
  500: "#2DB84C",
  600: "#22A043",
  700: "#1B8236",
} as const;

/** Money colors: income blue, expense red. */
export const INCOME_COLOR = "#2F80ED";
export const EXPENSE_COLOR = "#EB5757";

const LIGHT = {
  canvas: "#F2F4F7",
  surface: "#FFFFFF",
  field: "#F2F4F7",
  line: "#E7EAEF",
  ink: "#101828",
  muted: "#667085",
};

const DARK: typeof LIGHT = {
  canvas: "#0B0D11",
  surface: "#15181E",
  field: "#1E222A",
  line: "#262B34",
  ink: "#F2F4F7",
  muted: "#98A2B3",
};

export type Palette = typeof LIGHT & {
  dark: boolean;
  brand: string;
  brandSoft: string;
  income: string;
  expense: string;
};

function palette(dark: boolean): Palette {
  return {
    ...(dark ? DARK : LIGHT),
    dark,
    brand: BRAND[500],
    brandSoft: dark ? "#123A1E" : BRAND[50],
    income: INCOME_COLOR,
    expense: EXPENSE_COLOR,
  };
}

export function useAppTheme(): Palette {
  return palette(useColorScheme() === "dark");
}

/** Navigation theme (headers, tab bar, screen background) built from the same tokens. */
export function navigationTheme(dark: boolean): Theme {
  const colors = palette(dark);
  const base = dark ? DarkTheme : DefaultTheme;
  return {
    ...base,
    colors: {
      ...base.colors,
      primary: colors.brand,
      background: colors.canvas,
      card: colors.surface,
      text: colors.ink,
      border: colors.line,
    },
  };
}

/** "#2DB84C" + opacity as 8-digit hex, for tinted icon backgrounds. */
export function tint(hex: string, alpha = 0.15): string {
  return `${hex}${Math.round(alpha * 255)
    .toString(16)
    .padStart(2, "0")}`;
}
