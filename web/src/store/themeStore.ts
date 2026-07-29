import { create } from "zustand";

type ThemeMode = "light" | "dark";

const KEY = "mytask.theme";

function applyTheme(mode: ThemeMode) {
  const root = document.documentElement;
  if (mode === "dark") root.classList.add("dark");
  else root.classList.remove("dark");
}

interface ThemeState {
  mode: ThemeMode;
  hydrated: boolean;
  setMode: (mode: ThemeMode) => void;
  toggle: () => void;
  hydrate: () => void;
}

export const useThemeStore = create<ThemeState>((set, get) => ({
  mode: "light",
  hydrated: false,
  setMode: (mode) => {
    localStorage.setItem(KEY, mode);
    applyTheme(mode);
    set({ mode });
  },
  toggle: () => {
    const next = get().mode === "light" ? "dark" : "light";
    get().setMode(next);
  },
  hydrate: () => {
    const stored = localStorage.getItem(KEY) as ThemeMode | null;
    const mode =
      stored === "dark" || stored === "light"
        ? stored
        : window.matchMedia("(prefers-color-scheme: dark)").matches
          ? "dark"
          : "light";
    applyTheme(mode);
    set({ mode, hydrated: true });
  },
}));
