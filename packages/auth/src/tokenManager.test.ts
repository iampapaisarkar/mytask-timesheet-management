import assert from "node:assert/strict";
import { describe, it } from "node:test";
import { decodeJwtExp, isTokenExpiringSoon } from "./jwt.ts";
import { AuthTokenManager } from "./tokenManager.ts";

function makeToken(expSecondsFromNow: number): string {
  const header = Buffer.from(JSON.stringify({ alg: "none" })).toString("base64url");
  const payload = Buffer.from(
    JSON.stringify({ exp: Math.floor(Date.now() / 1000) + expSecondsFromNow }),
  ).toString("base64url");
  return `${header}.${payload}.sig`;
}

describe("jwt helpers", () => {
  it("decodes exp", () => {
    const token = makeToken(3600);
    const exp = decodeJwtExp(token);
    assert.ok(exp != null);
    assert.ok(exp! > Math.floor(Date.now() / 1000));
  });

  it("detects near expiry", () => {
    assert.equal(isTokenExpiringSoon(makeToken(60), 300), true);
    assert.equal(isTokenExpiringSoon(makeToken(600), 300), false);
  });
});

describe("AuthTokenManager", () => {
  it("single-flights concurrent force refresh", async () => {
    let calls = 0;
    const manager = new AuthTokenManager();
    manager.configure({
      getCurrentUser: () => ({ uid: "u1" }),
      getIdToken: async () => {
        calls += 1;
        await new Promise((r) => setTimeout(r, 30));
        return makeToken(3600);
      },
      subscribeIdToken: () => () => undefined,
      subscribeAuthState: (listener) => {
        // Simulate Firebase auth ready
        queueMicrotask(() => listener({ uid: "u1" }));
        return () => undefined;
      },
      signOut: async () => undefined,
    });
    const [a, b, c] = await Promise.all([
      manager.getValidIdToken({ force: true }),
      manager.getValidIdToken({ force: true }),
      manager.getValidIdToken({ force: true }),
    ]);
    assert.equal(calls, 1);
    assert.ok(a && a === b && b === c);
  });

  it("waits for auth ready before returning null user", async () => {
    const manager = new AuthTokenManager();
    let resolveAuth: ((u: { uid: string } | null) => void) | null = null;
    manager.configure({
      getCurrentUser: () => ({ uid: "u1" }),
      getIdToken: async () => makeToken(3600),
      subscribeIdToken: () => () => undefined,
      subscribeAuthState: (listener) => {
        resolveAuth = listener;
        return () => undefined;
      },
      signOut: async () => undefined,
    });
    const pending = manager.getValidIdToken();
    assert.equal(manager.isReady(), false);
    resolveAuth?.({ uid: "u1" });
    const token = await pending;
    assert.equal(manager.isReady(), true);
    assert.ok(token);
  });
});
