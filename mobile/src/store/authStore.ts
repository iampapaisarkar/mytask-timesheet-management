import { create } from 'zustand';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { STORAGE_KEYS } from '@mysheet/constants';
import type { UserProfile } from '@mysheet/types';

interface AuthState {
  token: string | null;
  user: UserProfile | null;
  setSession: (token: string, user: UserProfile) => Promise<void>;
  clearSession: () => Promise<void>;
  hydrate: () => Promise<void>;
}

export const useAuthStore = create<AuthState>((set) => ({
  token: null,
  user: null,
  setSession: async (token, user) => {
    await AsyncStorage.setItem(STORAGE_KEYS.authToken, token);
    await AsyncStorage.setItem(STORAGE_KEYS.user, JSON.stringify(user));
    set({ token, user });
  },
  clearSession: async () => {
    await AsyncStorage.multiRemove([STORAGE_KEYS.authToken, STORAGE_KEYS.user]);
    set({ token: null, user: null });
  },
  hydrate: async () => {
    const [[, token], [, raw]] = await AsyncStorage.multiGet([
      STORAGE_KEYS.authToken,
      STORAGE_KEYS.user,
    ]);
    let user: UserProfile | null = null;
    if (raw) {
      try {
        user = JSON.parse(raw) as UserProfile;
      } catch {
        user = null;
      }
    }
    set({ token, user });
  },
}));
