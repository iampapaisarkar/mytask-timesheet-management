import { create } from "zustand";

export type ToastTone = "success" | "error" | "warning" | "info";

export type ToastItem = {
  id: string;
  tone: ToastTone;
  title: string;
  description?: string;
};

interface ToastState {
  items: ToastItem[];
  push: (tone: ToastTone, title: string, description?: string) => void;
  success: (title: string, description?: string) => void;
  error: (title: string, description?: string) => void;
  warning: (title: string, description?: string) => void;
  info: (title: string, description?: string) => void;
  dismiss: (id: string) => void;
  clear: () => void;
}

export const useToastStore = create<ToastState>((set, get) => ({
  items: [],
  push: (tone, title, description) => {
    const id = `${Date.now()}-${Math.random().toString(36).slice(2, 7)}`;
    set({ items: [...get().items, { id, tone, title, description }] });
    setTimeout(() => get().dismiss(id), 3500);
  },
  success: (title, description) => get().push("success", title, description),
  error: (title, description) => get().push("error", title, description),
  warning: (title, description) => get().push("warning", title, description),
  info: (title, description) => get().push("info", title, description),
  dismiss: (id) => set({ items: get().items.filter((t) => t.id !== id) }),
  clear: () => set({ items: [] }),
}));
