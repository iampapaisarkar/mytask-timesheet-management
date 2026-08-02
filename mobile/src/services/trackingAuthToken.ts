import { Platform } from 'react-native';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { authApi } from '@mytask/api';
import { STORAGE_KEYS } from '@mytask/constants';

const NEAR_EXPIRY_MS = 7 * 24 * 60 * 60 * 1000; // re-issue if < 7 days left

export async function getTrackingToken(): Promise<string | null> {
  return AsyncStorage.getItem(STORAGE_KEYS.trackingToken);
}

export async function getTrackingTokenExpiresAt(): Promise<string | null> {
  return AsyncStorage.getItem(STORAGE_KEYS.trackingTokenExpiresAt);
}

export async function setTrackingToken(
  token: string,
  expiresAt?: string | null,
): Promise<void> {
  const pairs: [string, string][] = [[STORAGE_KEYS.trackingToken, token]];
  if (expiresAt) {
    pairs.push([STORAGE_KEYS.trackingTokenExpiresAt, expiresAt]);
  }
  await AsyncStorage.multiSet(pairs);
}

export async function clearTrackingToken(): Promise<void> {
  await AsyncStorage.multiRemove([
    STORAGE_KEYS.trackingToken,
    STORAGE_KEYS.trackingTokenExpiresAt,
  ]);
}

export async function persistTrackingTokenFromAuthResponse(body: {
  tracking_token?: string;
  tracking_token_expires_at?: string;
  [key: string]: unknown;
} | null | undefined): Promise<void> {
  if (!body?.tracking_token || typeof body.tracking_token !== 'string') return;
  await setTrackingToken(
    body.tracking_token,
    typeof body.tracking_token_expires_at === 'string'
      ? body.tracking_token_expires_at
      : null,
  );
}

function isNearExpiry(expiresAt: string | null): boolean {
  if (!expiresAt) return true;
  const t = Date.parse(expiresAt);
  if (!Number.isFinite(t)) return true;
  return t - Date.now() < NEAR_EXPIRY_MS;
}

/**
 * Ensure a valid tracking token exists. Uses Firebase session only while
 * foreground to call /auth/tracking-token when missing or near expiry.
 */
export async function ensureTrackingToken(): Promise<string> {
  const [existing, expiresAt] = await Promise.all([
    getTrackingToken(),
    getTrackingTokenExpiresAt(),
  ]);

  if (
    existing &&
    existing.startsWith('mttrk_') &&
    !isNearExpiry(expiresAt)
  ) {
    return existing;
  }

  const res = await authApi.issueTrackingToken({
    platform: Platform.OS,
  });
  const token = res.data?.data?.tracking_token;
  const exp = res.data?.data?.tracking_token_expires_at;
  if (!token) {
    throw new Error('Unable to issue tracking token. Please sign in again.');
  }
  await setTrackingToken(token, exp ?? null);
  return token;
}

export function trackingAuthHeaders(token: string): Record<string, string> {
  return { Authorization: `Bearer ${token}` };
}
