/**
 * Re-arm native Transistorsoft tracking after process death / iOS force-quit.
 *
 * iOS stops background location when the user force-closes the app. The server
 * session and local AsyncStorage session can still show "running", but native
 * `enabled` is false until something calls `start()` again. Without this
 * restore, the UI looks active while no GPS points are collected — even in
 * the foreground.
 */
import backgroundGeolocation from './backgroundGeolocation';
import {
  clearTrackingSession,
  getTrackingSession,
  setTrackingSession,
} from './trackingSession';
import { ensureTrackingToken } from './trackingAuthToken';

export type RestoreTrackingResult = {
  restored: boolean;
  reason:
    | 'started'
    | 'already_enabled'
    | 'no_session'
    | 'native_unavailable'
    | 'error';
  error?: string;
};

/**
 * If a local tracking session exists, ensure HTTP auth is configured and
 * native tracking is enabled. Safe to call on cold start and AppState active.
 */
export async function restoreNativeTrackingIfNeeded(): Promise<RestoreTrackingResult> {
  if (!backgroundGeolocation.isNativeBglAvailable()) {
    return { restored: false, reason: 'native_unavailable' };
  }

  const session = await getTrackingSession();
  if (!session) {
    return { restored: false, reason: 'no_session' };
  }

  try {
    await backgroundGeolocation.setup();
    const trackingToken = await ensureTrackingToken();
    await backgroundGeolocation.configureTrackingHttp({
      organisationCode: session.organisationCode,
      userId: session.userId,
      trackingToken,
    });

    const nativeEnabled =
      await backgroundGeolocation.refreshEnabledFromNative();

    if (!nativeEnabled) {
      await backgroundGeolocation.requestPermissions();
      await backgroundGeolocation.start();
      if (__DEV__) {
        console.log(
          '[restoreTracking] re-started native BGL after session restore',
          session.organisationCode,
        );
      }
      return { restored: true, reason: 'started' };
    }

    // Flush any locations persisted while the JS bridge was down.
    await backgroundGeolocation.sync();
    return { restored: false, reason: 'already_enabled' };
  } catch (err) {
    const message =
      err instanceof Error ? err.message : 'Failed to restore tracking';
    console.warn('[restoreTracking] failed', err);
    return { restored: false, reason: 'error', error: message };
  }
}

/**
 * Align local session + native plugin with server timer for the current org.
 * - Server running/pause + missing session → recreate session and start native
 * - Server stop + matching session → clear session and stop native
 */
export async function alignTrackingWithServerStatus(params: {
  organisationCode: string | null | undefined;
  userId: string | number | null | undefined;
  timer: 'stop' | 'running' | 'pause' | string | null | undefined;
}): Promise<RestoreTrackingResult | null> {
  const { organisationCode, userId, timer } = params;
  if (!organisationCode || userId == null) {
    return null;
  }

  const session = await getTrackingSession();
  const sessionMatches =
    session != null && session.organisationCode === organisationCode;

  if (timer === 'running' || timer === 'pause') {
    if (!sessionMatches) {
      await setTrackingSession(organisationCode, userId);
    }
    return restoreNativeTrackingIfNeeded();
  }

  if (timer === 'stop' && sessionMatches) {
    await clearTrackingSession();
    try {
      await backgroundGeolocation.stop();
    } catch {
      /* ignore */
    }
  }

  return null;
}
