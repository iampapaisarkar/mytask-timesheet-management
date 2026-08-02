import { create } from 'zustand';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { STORAGE_KEYS } from '@mytask/constants';
import type { UserProfile } from '@mytask/types';
import { clearTrackingToken } from '../services/trackingAuthToken';

interface AuthState {
  token: string | null;
  user: UserProfile | null;
  setSession: (token: string, user: UserProfile) => Promise<void>;
  /** Mirror of last Firebase ID token (API auth uses TokenManager, not this alone). */
  setTokenMirror: (token: string | null) => Promise<void>;
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
  setTokenMirror: async (token) => {
    if (token) await AsyncStorage.setItem(STORAGE_KEYS.authToken, token);
    else await AsyncStorage.removeItem(STORAGE_KEYS.authToken);
    set({ token });
  },
  clearSession: async () => {
    await AsyncStorage.multiRemove([STORAGE_KEYS.authToken, STORAGE_KEYS.user]);
    await clearTrackingToken();
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
