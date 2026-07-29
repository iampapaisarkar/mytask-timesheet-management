import { create } from "zustand";
import AsyncStorage from "@react-native-async-storage/async-storage";
import { colors, dark, light } from "@mytask/theme";

type ThemeMode = "light" | "dark";

const KEY = "mytask.theme";

export type AppColors = {
  bg: string;
  surface: string;
  text: string;
  muted: string;
  border: string;
  primary: string;
  negative: string;
  positive: string;
  warning: string;
  info: string;
  white: string;
};

function palette(mode: ThemeMode): AppColors {
  const base = mode === "dark" ? dark : light;
  return {
    bg: base.bg,
    surface: base.bgElevated,
    text: base.text,
    muted: base.textMuted,
    border: base.border,
    primary: colors.primary,
    negative: colors.negative,
    positive: colors.positive,
    warning: colors.warning,
    info: colors.info,
    white: colors.white,
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
