/**
 * Mobile env config (React Native CLI).
 * Edit values here — never commit real production secrets to shared branches.
 */
export const ENV = {
  API_BASE_URL: "http://localhost:8080/api",

  // Firebase web-style config (JS SDK). Same project as web / Admin.
  FIREBASE_API_KEY: "",
  FIREBASE_AUTH_DOMAIN: "",
  FIREBASE_PROJECT_ID: "",
  FIREBASE_STORAGE_BUCKET: "",
  FIREBASE_MESSAGING_SENDER_ID: "",
  FIREBASE_APP_ID: "",

  /**
   * OAuth 2.0 Web Client ID from Google Cloud Console / Firebase
   * (Authentication → Sign-in method → Google → Web client ID).
   * Required for `@react-native-google-signin` to return an ID token.
   */
  GOOGLE_WEB_CLIENT_ID: "",

  /**
   * iOS OAuth client ID (optional if GoogleService-Info.plist is present).
   * From GoogleService-Info.plist `CLIENT_ID`.
   */
  GOOGLE_IOS_CLIENT_ID: "",

  STRIPE_PUBLISHABLE_KEY: "",
} as const;

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
