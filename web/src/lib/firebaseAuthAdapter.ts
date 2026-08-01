import {
  onAuthStateChanged,
  onIdTokenChanged,
  type User,
} from "firebase/auth";
import type { AuthAdapter, AuthUserRef } from "@mytask/auth";
import { getFirebaseAuth, signOutUser } from "@/services/firebase";

function toRef(user: User | null): AuthUserRef | null {
  if (!user) return null;
  return { uid: user.uid, email: user.email };
}

/** Firebase Auth adapter for the web app. */
export function createWebFirebaseAuthAdapter(): AuthAdapter {
  return {
    getCurrentUser: () => toRef(getFirebaseAuth().currentUser),
    getIdToken: async (forceRefresh = false) => {
      const user = getFirebaseAuth().currentUser;
      if (!user) return null;
      return user.getIdToken(forceRefresh);
    },
    subscribeIdToken: (listener) => {
      const auth = getFirebaseAuth();
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
      const auth = getFirebaseAuth();
      return onAuthStateChanged(auth, (user) => {
        listener(toRef(user));
      });
    },
    signOut: async () => {
      await signOutUser();
    },
  };
}
