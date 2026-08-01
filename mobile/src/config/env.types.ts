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
  /**
   * Google Maps SDK key (Maps SDK for iOS + Android).
   * Must also be set in Info.plist `GMSApiKey` and Android `google_maps_api_key`.
   */
  GOOGLE_MAPS_API_KEY: string;
  STRIPE_PUBLISHABLE_KEY: string;
};
