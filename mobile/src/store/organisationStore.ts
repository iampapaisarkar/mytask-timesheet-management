import { create } from 'zustand';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { STORAGE_KEYS } from '@mytask/constants';
import type { OrganisationContext } from '@mytask/types';

interface OrganisationState {
  organisation: OrganisationContext | null;
  setOrganisation: (org: OrganisationContext) => Promise<void>;
  clear: () => Promise<void>;
  hydrate: () => Promise<void>;
}

export const useOrganisationStore = create<OrganisationState>((set) => ({
  organisation: null,
  setOrganisation: async (organisation) => {
    await AsyncStorage.setItem(
      STORAGE_KEYS.organisation,
      JSON.stringify(organisation),
    );
    set({ organisation });
  },
  clear: async () => {
    await AsyncStorage.removeItem(STORAGE_KEYS.organisation);
    set({ organisation: null });
  },
  hydrate: async () => {
    const raw = await AsyncStorage.getItem(STORAGE_KEYS.organisation);
    if (!raw) {
      set({ organisation: null });
      return;
    }
    try {
      set({ organisation: JSON.parse(raw) as OrganisationContext });
    } catch {
      set({ organisation: null });
    }
  },
}));
