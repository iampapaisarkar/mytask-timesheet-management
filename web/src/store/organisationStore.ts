import { create } from "zustand";
import { STORAGE_KEYS } from "@mysheet/constants";
import type { OrganisationContext } from "@mysheet/types";

interface OrganisationState {
  organisation: OrganisationContext | null;
  setOrganisation: (org: OrganisationContext) => void;
  clear: () => void;
  hydrate: () => void;
}

export const useOrganisationStore = create<OrganisationState>((set) => ({
  organisation: null,
  setOrganisation: (organisation) => {
    localStorage.setItem(STORAGE_KEYS.organisation, JSON.stringify(organisation));
    set({ organisation });
  },
  clear: () => {
    localStorage.removeItem(STORAGE_KEYS.organisation);
    set({ organisation: null });
  },
  hydrate: () => {
    const raw = localStorage.getItem(STORAGE_KEYS.organisation);
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
