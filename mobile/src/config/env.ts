/**
 * Mobile env config (React Native CLI).
 *
 * Committed defaults are empty / safe placeholders.
 * Put real values in `env.local.ts` (gitignored) — see `env.local.ts.example`.
 */
export type MobileEnv = {
  API_BASE_URL: string;
  FIREBASE_API_KEY: string;
  FIREBASE_AUTH_DOMAIN: string;
  FIREBASE_PROJECT_ID: string;
  FIREBASE_STORAGE_BUCKET: string;
  FIREBASE_MESSAGING_SENDER_ID: string;
  FIREBASE_APP_ID: string;
  /** Web OAuth client ID — required for native Google ID tokens. */
  GOOGLE_WEB_CLIENT_ID: string;
  /** iOS OAuth client ID from GoogleService-Info.plist `CLIENT_ID`. */
  GOOGLE_IOS_CLIENT_ID: string;
  STRIPE_PUBLISHABLE_KEY: string;
};

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

function loadLocalOverrides(): Partial<MobileEnv> {
  try {
    // Optional — file is gitignored. Metro/Node throw if missing.
    // eslint-disable-next-line @typescript-eslint/no-require-imports
    const mod = require("./env.local") as {
      ENV_LOCAL?: Partial<MobileEnv>;
      default?: Partial<MobileEnv>;
    };
    return mod.ENV_LOCAL ?? mod.default ?? {};
  } catch {
    return {};
  }
}

export const ENV: MobileEnv = {
  ...defaults,
  ...loadLocalOverrides(),
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
