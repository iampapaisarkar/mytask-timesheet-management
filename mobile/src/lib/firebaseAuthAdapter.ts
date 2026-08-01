import {
  onAuthStateChanged,
  onIdTokenChanged,
  type User,
} from "firebase/auth";
import type { AuthAdapter, AuthUserRef } from "@mytask/auth";
import {
  getFirebaseAuth,
  initFirebase,
  signOutUser,
} from "../services/firebase";
import { isFirebaseConfigured } from "../config/env";

function toRef(user: User | null): AuthUserRef | null {
  if (!user) return null;
  return { uid: user.uid, email: user.email };
}

function ensureAuth() {
  if (!isFirebaseConfigured()) {
    throw new Error(
      "Firebase is not configured. Set FIREBASE_* values in mobile/src/config/env.ts.",
    );
  }
  return initFirebase();
}

/** Firebase Auth adapter for React Native (JS SDK + RN persistence). */
export function createMobileFirebaseAuthAdapter(): AuthAdapter {
  return {
    getCurrentUser: () => {
      try {
        return toRef(ensureAuth().currentUser);
      } catch {
        return null;
      }
    },
    getIdToken: async (forceRefresh = false) => {
      const user = ensureAuth().currentUser;
      if (!user) return null;
      return user.getIdToken(forceRefresh);
    },
    subscribeIdToken: (listener) => {
      const auth = ensureAuth();
      return onIdTokenChanged(auth, async (user) => {
        if (!user) {
          listener(null, null);
          return;
        }
        try {
          const token = await user.getIdToken(false);
          listener(token, toRef(user));
        } catch {
          listener(null, toRef(user));
        }
      });
    },
    subscribeAuthState: (listener) => {
      const auth = ensureAuth();
      return onAuthStateChanged(auth, (user) => {
        listener(toRef(user));
      });
    },
    signOut: async () => {
      await signOutUser();
    },
  };
}

export { getFirebaseAuth };
