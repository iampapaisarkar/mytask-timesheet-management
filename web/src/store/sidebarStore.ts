import { create } from "zustand";

const KEY = "mytask.sidebarCollapsed";

interface SidebarState {
  /** Desktop: icon-only rail when true */
  collapsed: boolean;
  /** Mobile: overlay drawer open when true */
  mobileOpen: boolean;
  hydrated: boolean;
  setCollapsed: (collapsed: boolean) => void;
  toggle: () => void;
  setMobileOpen: (open: boolean) => void;
  toggleMobile: () => void;
  hydrate: () => void;
}

export const useSidebarStore = create<SidebarState>((set, get) => ({
  collapsed: false,
  mobileOpen: false,
  hydrated: false,
  setCollapsed: (collapsed) => {
    localStorage.setItem(KEY, collapsed ? "1" : "0");
    set({ collapsed });
  },
  toggle: () => get().setCollapsed(!get().collapsed),
  setMobileOpen: (mobileOpen) => set({ mobileOpen }),
  toggleMobile: () => set({ mobileOpen: !get().mobileOpen }),
  hydrate: () => {
    set({
      collapsed: localStorage.getItem(KEY) === "1",
      mobileOpen: false,
      hydrated: true,
    });
  },
}));
