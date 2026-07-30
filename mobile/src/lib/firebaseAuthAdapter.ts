import { initializeApp, getApps } from "firebase/app";
import {
  getAuth,
  onAuthStateChanged,
  onIdTokenChanged,
  signOut,
  type User,
} from "firebase/auth";
import type { AuthAdapter, AuthUserRef } from "@mytask/auth";
import { ENV } from "../config/env";

function getFirebaseAuth() {
  const config = {
    apiKey: ENV.FIREBASE_API_KEY,
    authDomain: ENV.FIREBASE_AUTH_DOMAIN,
    projectId: ENV.FIREBASE_PROJECT_ID,
    storageBucket: ENV.FIREBASE_STORAGE_BUCKET,
    messagingSenderId: ENV.FIREBASE_MESSAGING_SENDER_ID,
    appId: ENV.FIREBASE_APP_ID,
  };
  const app = getApps().length ? getApps()[0]! : initializeApp(config);
  return getAuth(app);
}

function toRef(user: User | null): AuthUserRef | null {
  if (!user) return null;
  return { uid: user.uid, email: user.email };
}

/** Firebase Auth adapter for React Native (JS SDK). */
export function createMobileFirebaseAuthAdapter(): AuthAdapter {
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
      await signOut(getFirebaseAuth());
    },
  };
}

export { getFirebaseAuth };
