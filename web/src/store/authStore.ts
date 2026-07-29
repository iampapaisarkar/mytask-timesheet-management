import { create } from "zustand";
import { STORAGE_KEYS } from "@mysheet/constants";
import type { UserProfile } from "@mysheet/types";

interface AuthState {
  token: string | null;
  user: UserProfile | null;
  hydrated: boolean;
  setSession: (token: string, user: UserProfile) => void;
  setUser: (user: UserProfile) => void;
  clearSession: () => void;
  hydrate: () => void;
}

export const useAuthStore = create<AuthState>((set) => ({
  token: null,
  user: null,
  hydrated: false,
  setSession: (token, user) => {
    localStorage.setItem(STORAGE_KEYS.authToken, token);
    localStorage.setItem(STORAGE_KEYS.user, JSON.stringify(user));
    set({ token, user });
  },
  setUser: (user) => {
    localStorage.setItem(STORAGE_KEYS.user, JSON.stringify(user));
    set({ user });
  },
  clearSession: () => {
    localStorage.removeItem(STORAGE_KEYS.authToken);
    localStorage.removeItem(STORAGE_KEYS.user);
    set({ token: null, user: null });
  },
  hydrate: () => {
    const token = localStorage.getItem(STORAGE_KEYS.authToken);
    const raw = localStorage.getItem(STORAGE_KEYS.user);
    let user: UserProfile | null = null;
    if (raw) {
      try {
        user = JSON.parse(raw) as UserProfile;
      } catch {
        user = null;
      }
    }
    set({ token, user, hydrated: true });
  },
}));
