/**
 * Platform-specific Firebase Auth bridge.
 * Web and mobile implement this; @mytask/auth stays Firebase-free.
 */
export type AuthUserRef = {
  uid: string;
  email?: string | null;
};

export type AuthAdapter = {
  getCurrentUser: () => AuthUserRef | null;
  getIdToken: (forceRefresh?: boolean) => Promise<string | null>;
  /**
   * Subscribe to ID token changes (including refresh).
   * Returns unsubscribe.
   */
  subscribeIdToken: (
    listener: (token: string | null, user: AuthUserRef | null) => void,
  ) => () => void;
  /**
   * Subscribe to auth state (signed in / out).
   * Returns unsubscribe.
   */
  subscribeAuthState: (
    listener: (user: AuthUserRef | null) => void,
  ) => () => void;
  signOut: () => Promise<void>;
};
