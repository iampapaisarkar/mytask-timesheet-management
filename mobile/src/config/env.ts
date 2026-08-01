/**
 * Mobile env config (React Native CLI).
 *
 * Committed defaults are empty / safe placeholders.
 * Real values live in `env.local.ts` (gitignored).
 * Copy from `env.local.ts.example` if that file is missing.
 */
import type { MobileEnv } from "./env.types";
import { ENV_LOCAL } from "./env.local";

export type { MobileEnv } from "./env.types";

const defaults: MobileEnv = {
  API_BASE_URL: "http://localhost:8080/api",
  FIREBASE_API_KEY: "",
  FIREBASE_AUTH_DOMAIN: "",
  FIREBASE_PROJECT_ID: "",
  FIREBASE_STORAGE_BUCKET: "",
  FIREBASE_MESSAGING_SENDER_ID: "",
  FIREBASE_APP_ID: "",
  GOOGLE_WEB_CLIENT_ID: "",
  GOOGLE_IOS_CLIENT_ID: "",
  STRIPE_PUBLISHABLE_KEY: "",
};

export const ENV: MobileEnv = {
  ...defaults,
  ...ENV_LOCAL,
};

export function isFirebaseConfigured(): boolean {
  return Boolean(
    ENV.FIREBASE_API_KEY &&
      ENV.FIREBASE_AUTH_DOMAIN &&
      ENV.FIREBASE_PROJECT_ID &&
      ENV.FIREBASE_APP_ID,
  );
}

export function isGoogleSignInConfigured(): boolean {
  return Boolean(ENV.GOOGLE_WEB_CLIENT_ID);
}
