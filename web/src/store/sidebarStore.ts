import { create } from "zustand";

const KEY = "mytask.sidebarCollapsed";

interface SidebarState {
  collapsed: boolean;
  hydrated: boolean;
  setCollapsed: (collapsed: boolean) => void;
  toggle: () => void;
  hydrate: () => void;
}

export const useSidebarStore = create<SidebarState>((set, get) => ({
  collapsed: false,
  hydrated: false,
  setCollapsed: (collapsed) => {
    localStorage.setItem(KEY, collapsed ? "1" : "0");
    set({ collapsed });
  },
  toggle: () => get().setCollapsed(!get().collapsed),
  hydrate: () => {
    set({
      collapsed: localStorage.getItem(KEY) === "1",
      hydrated: true,
    });
  },
}));
