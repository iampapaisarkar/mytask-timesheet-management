import { create } from "zustand";
import AsyncStorage from "@react-native-async-storage/async-storage";
import { colors, dark, light } from "@mytask/theme";

type ThemeMode = "light" | "dark";

const KEY = "mytask.theme";

export type AppColors = {
  bg: string;
  bgMuted: string;
  bgSoft: string;
  surface: string;
  text: string;
  muted: string;
  subtle: string;
  border: string;
  borderStrong: string;
  primary: string;
  primaryHover: string;
  primarySoft: string;
  secondary: string;
  negative: string;
  negativeSoft: string;
  negativeText: string;
  positive: string;
  positiveSoft: string;
  positiveText: string;
  warning: string;
  warningSoft: string;
  warningText: string;
  info: string;
  infoSoft: string;
  infoText: string;
  neutral: string;
  neutralSoft: string;
  neutralText: string;
  white: string;
  overlay: string;
};

function palette(mode: ThemeMode): AppColors {
  const base = mode === "dark" ? dark : light;
  const softDark = mode === "dark";
  return {
    bg: base.bg,
    bgMuted: base.bgMuted,
    bgSoft: base.bgSoft,
    surface: base.bgElevated,
    text: base.text,
    muted: base.textMuted,
    subtle: base.textSubtle,
    border: base.border,
    borderStrong: base.borderStrong,
    primary: colors.primary,
    primaryHover: colors.primaryHover,
    primarySoft: softDark ? "rgba(4, 182, 177, 0.18)" : colors.primarySoft,
    secondary: colors.secondary,
    negative: colors.negative,
    negativeSoft: softDark ? "rgba(239, 68, 68, 0.18)" : colors.negativeSoft,
    negativeText: softDark ? "#FCA5A5" : colors.negativeText,
    positive: colors.positive,
    positiveSoft: softDark ? "rgba(16, 185, 129, 0.18)" : colors.positiveSoft,
    positiveText: softDark ? "#6EE7B7" : colors.positiveText,
    warning: colors.warning,
    warningSoft: softDark ? "rgba(245, 158, 11, 0.18)" : colors.warningSoft,
    warningText: softDark ? "#FCD34D" : colors.warningText,
    info: colors.info,
    infoSoft: softDark ? "rgba(99, 102, 241, 0.2)" : colors.infoSoft,
    infoText: softDark ? "#A5B4FC" : colors.infoText,
    neutral: colors.neutral,
    neutralSoft: softDark ? "rgba(148, 163, 184, 0.16)" : colors.neutralSoft,
    neutralText: softDark ? "#CBD5E1" : colors.neutralText,
    white: colors.white,
    overlay: base.overlay,
  };
}

interface ThemeState {
  mode: ThemeMode;
  colors: AppColors;
  setMode: (mode: ThemeMode) => Promise<void>;
  toggle: () => Promise<void>;
  hydrate: () => Promise<void>;
}

export const useThemeStore = create<ThemeState>((set, get) => ({
  mode: "light",
  colors: palette("light"),
  setMode: async (mode) => {
    await AsyncStorage.setItem(KEY, mode);
    set({ mode, colors: palette(mode) });
  },
  toggle: async () => {
    const next = get().mode === "light" ? "dark" : "light";
    await get().setMode(next);
  },
  hydrate: async () => {
    const stored = await AsyncStorage.getItem(KEY);
    const mode: ThemeMode = stored === "dark" ? "dark" : "light";
    set({ mode, colors: palette(mode) });
  },
}));
