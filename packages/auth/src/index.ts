import { AuthTokenManager, sharedAuthTokenManager } from "./tokenManager.ts";
import { decodeJwtExp, isTokenExpiringSoon } from "./jwt.ts";

export type { AuthAdapter, AuthUserRef } from "./types.ts";
export type { TokenUpdatedListener } from "./tokenManager.ts";
export {
  AuthTokenManager,
  sharedAuthTokenManager,
  decodeJwtExp,
  isTokenExpiringSoon,
};

/** Simple single-flight test without Firebase. */
export async function __testSingleFlight(
  manager: AuthTokenManager,
  fetchToken: () => Promise<string>,
): Promise<[string | null, string | null]> {
  // Internal test helper — not for production adapters
  let calls = 0;
  const adapter = {
    getCurrentUser: () => ({ uid: "u1" }),
    getIdToken: async () => {
      calls += 1;
      await new Promise((r) => setTimeout(r, 20));
      return fetchToken();
    },
    subscribeIdToken: () => () => undefined,
    subscribeAuthState: (listener: (user: { uid: string } | null) => void) => {
      listener({ uid: "u1" });
      return () => undefined;
    },
    signOut: async () => undefined,
  };
  manager.configure(adapter);

  const [a, b] = await Promise.all([
    manager.getValidIdToken({ force: true }),
    manager.getValidIdToken({ force: true }),
  ]);
  if (calls !== 1) {
    throw new Error(`Expected 1 refresh, got ${calls}`);
  }
  return [a, b];
}
