import { isTokenExpiringSoon } from "./jwt.ts";
import type { AuthAdapter, AuthUserRef } from "./types.ts";

export type TokenUpdatedListener = (
  token: string | null,
  user: AuthUserRef | null,
) => void;

const REFRESH_SKEW_SECONDS = 300; // 5 minutes

/**
 * Single-flight Firebase ID token manager.
 * All API / socket callers must obtain tokens through this class.
 */
export class AuthTokenManager {
  private adapter: AuthAdapter | null = null;
  private memoryToken: string | null = null;
  private refreshPromise: Promise<string | null> | null = null;
  private readonly listeners = new Set<TokenUpdatedListener>();
  private unsubIdToken: (() => void) | null = null;
  private unsubAuthState: (() => void) | null = null;
  private authReady = false;
  private authReadyPromise: Promise<void> = Promise.resolve();
  private resolveAuthReady: (() => void) | null = null;

  configure(adapter: AuthAdapter): void {
    this.teardown();
    this.adapter = adapter;
    this.authReady = false;
    this.authReadyPromise = new Promise<void>((resolve) => {
      this.resolveAuthReady = resolve;
    });

    // First onAuthStateChanged fires only after Firebase persistence restore.
    this.unsubAuthState = adapter.subscribeAuthState((user) => {
      if (!user) {
        this.memoryToken = null;
      }
      if (!this.authReady) {
        this.authReady = true;
        this.resolveAuthReady?.();
        this.resolveAuthReady = null;
      }
    });

    this.unsubIdToken = adapter.subscribeIdToken((token, user) => {
      this.memoryToken = token;
      this.emit(token, user);
    });
  }

  teardown(): void {
    this.unsubIdToken?.();
    this.unsubIdToken = null;
    this.unsubAuthState?.();
    this.unsubAuthState = null;
    this.adapter = null;
    this.memoryToken = null;
    this.refreshPromise = null;
    this.authReady = false;
    this.resolveAuthReady?.();
    this.resolveAuthReady = null;
    this.authReadyPromise = Promise.resolve();
  }

  /** Resolves after Firebase Auth finishes initial persistence restore. */
  async waitUntilReady(): Promise<void> {
    if (this.authReady || !this.adapter) return;
    await this.authReadyPromise;
  }

  isReady(): boolean {
    return this.authReady;
  }

  getCachedToken(): string | null {
    return this.memoryToken;
  }

  onTokenUpdated(listener: TokenUpdatedListener): () => void {
    this.listeners.add(listener);
    return () => {
      this.listeners.delete(listener);
    };
  }

  /**
   * Return a valid ID token, refreshing when expired/near-expiry or forced.
   * Concurrent callers share one refresh.
   * Waits for Firebase auth restore so refresh/boot does not return null early.
   */
  async getValidIdToken(options: { force?: boolean } = {}): Promise<string | null> {
    if (!this.adapter) return null;

    await this.waitUntilReady();

    const force = Boolean(options.force);
    const user = this.adapter.getCurrentUser();
    if (!user) {
      this.memoryToken = null;
      return null;
    }

    if (
      !force &&
      this.memoryToken &&
      !isTokenExpiringSoon(this.memoryToken, REFRESH_SKEW_SECONDS)
    ) {
      return this.memoryToken;
    }

    if (this.refreshPromise) {
      return this.refreshPromise;
    }

    this.refreshPromise = this.runRefresh(force)
      .catch(() => null)
      .finally(() => {
        this.refreshPromise = null;
      });

    return this.refreshPromise;
  }

  /** Axios / Socket getToken helper */
  createGetToken(): () => Promise<string | null> {
    return () => this.getValidIdToken();
  }

  /** Axios 401 force-refresh helper */
  createRefreshToken(): () => Promise<string | null> {
    return () => this.getValidIdToken({ force: true });
  }

  private async runRefresh(force: boolean): Promise<string | null> {
    if (!this.adapter) return null;
    const token = await this.adapter.getIdToken(force);
    this.memoryToken = token;
    this.emit(token, this.adapter.getCurrentUser());
    return token;
  }

  private emit(token: string | null, user: AuthUserRef | null): void {
    for (const listener of this.listeners) {
      try {
        listener(token, user);
      } catch {
        /* ignore listener errors */
      }
    }
  }
}

/** Process-wide singleton used by web and mobile. */
export const sharedAuthTokenManager = new AuthTokenManager();
