import { initializeApp, getApps, type FirebaseApp } from "firebase/app";
import {
  getAuth,
  initializeAuth,
  // @ts-expect-error Firebase RN entry exports this; browser typings omit it.
  getReactNativePersistence,
  type Auth,
} from "firebase/auth";
import ReactNativeAsyncStorage from "@react-native-async-storage/async-storage";
import { ENV, isFirebaseConfigured } from "../../config/env";

let app: FirebaseApp | null = null;
let auth: Auth | null = null;

export function getFirebaseNativeConfig() {
  return {
    apiKey: ENV.FIREBASE_API_KEY,
    authDomain: ENV.FIREBASE_AUTH_DOMAIN,
    projectId: ENV.FIREBASE_PROJECT_ID,
    storageBucket: ENV.FIREBASE_STORAGE_BUCKET,
    messagingSenderId: ENV.FIREBASE_MESSAGING_SENDER_ID,
    appId: ENV.FIREBASE_APP_ID,
  };
}

/**
 * Firebase Auth with official React Native persistence
 * (`getReactNativePersistence`). This is Firebase's built-in session
 * restoration — not a custom token store.
 */
export function initFirebase(): Auth {
  if (auth) return auth;
  if (!isFirebaseConfigured()) {
    throw new Error(
      "Firebase is not configured. Set FIREBASE_* values in mobile/src/config/env.local.ts.",
    );
  }

  const config = getFirebaseNativeConfig();
  if (getApps().length) {
    app = getApps()[0]!;
    try {
      auth = initializeAuth(app, {
        persistence: getReactNativePersistence(ReactNativeAsyncStorage),
      });
    } catch {
      // Already initialized in this JS runtime (Fast Refresh / HMR).
      auth = getAuth(app);
    }
  } else {
    app = initializeApp(config);
    auth = initializeAuth(app, {
      persistence: getReactNativePersistence(ReactNativeAsyncStorage),
    });
  }
  return auth;
}

export function getFirebaseAuth(): Auth {
  if (!auth) return initFirebase();
  return auth;
}

export function getFirebaseApp(): FirebaseApp {
  initFirebase();
  return app!;
}
