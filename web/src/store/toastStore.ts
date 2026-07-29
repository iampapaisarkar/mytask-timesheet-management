import { create } from "zustand";

export type ToastTone = "success" | "error" | "warning" | "info";

export interface ToastItem {
  id: string;
  title: string;
  description?: string;
  tone: ToastTone;
}

interface ToastState {
  items: ToastItem[];
  push: (toast: Omit<ToastItem, "id"> & { id?: string }) => void;
  dismiss: (id: string) => void;
  success: (title: string, description?: string) => void;
  error: (title: string, description?: string) => void;
  warning: (title: string, description?: string) => void;
  info: (title: string, description?: string) => void;
}

export const useToastStore = create<ToastState>((set, get) => ({
  items: [],
  push: (toast) => {
    const id = toast.id || crypto.randomUUID();
    set((s) => ({ items: [...s.items, { ...toast, id }] }));
    window.setTimeout(() => get().dismiss(id), 4200);
  },
  dismiss: (id) => set((s) => ({ items: s.items.filter((t) => t.id !== id) })),
  success: (title, description) =>
    get().push({ title, description, tone: "success" }),
  error: (title, description) =>
    get().push({ title, description, tone: "error" }),
  warning: (title, description) =>
    get().push({ title, description, tone: "warning" }),
  info: (title, description) =>
    get().push({ title, description, tone: "info" }),
}));
