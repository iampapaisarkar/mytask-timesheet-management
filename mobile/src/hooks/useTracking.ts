import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import {
  timesheetActivityApi,
  type TrackingActivityStatus,
  isApiError,
} from '@mytask/api';
import { useAuthStore } from '../store/authStore';
import { useOrganisationStore } from '../store/organisationStore';
import backgroundGeolocation, {
  BackgroundGeolocationUnavailableError,
} from '../services/backgroundGeolocation';
import {
  blockOrgSwitch,
  clearTrackingSession,
  getTrackingOrganisationCode,
  setTrackingSession,
} from '../services/trackingSession';
import {
  ensureTrackingToken,
  trackingAuthHeaders,
} from '../services/trackingAuthToken';

export type TimerState = 'stop' | 'running' | 'pause';

export type TrackingBusy = 'start' | 'pause' | 'resume' | 'stop' | null;

function apiMessage(err: unknown, fallback: string): string {
  if (isApiError(err)) {
    return err.message || fallback;
  }
  if (err instanceof Error && err.message) {
    return err.message;
  }
  if (err && typeof err === 'object' && 'response' in err) {
    const data = (err as { response?: { data?: { message?: string } } })
      .response?.data;
    if (data?.message) return data.message;
  }
  return fallback;
}

function formatElapsed(totalSeconds: number): string {
  const h = String(Math.floor(totalSeconds / 3600)).padStart(2, '0');
  const m = String(Math.floor((totalSeconds % 3600) / 60)).padStart(2, '0');
  const s = String(Math.floor(totalSeconds % 60)).padStart(2, '0');
  return `${h}:${m}:${s}`;
}

export function useTracking() {
  const organisation = useOrganisationStore((s) => s.organisation);
  const user = useAuthStore((s) => s.user);

  const [seconds, setSeconds] = useState(0);
  const [timer, setTimer] = useState<TimerState>('stop');
  const [statusLabel, setStatusLabel] = useState('Stopped');
  const [activityCode, setActivityCode] = useState<string | null>(null);
  const [busy, setBusy] = useState<TrackingBusy>(null);
  const [otherOrgMessage, setOtherOrgMessage] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [nativeAvailable, setNativeAvailable] = useState(
    backgroundGeolocation.isNativeBglAvailable(),
  );
  const intervalRef = useRef<ReturnType<typeof setInterval> | null>(null);

  const clearTick = useCallback(() => {
    if (intervalRef.current) {
      clearInterval(intervalRef.current);
      intervalRef.current = null;
    }
  }, []);

  const applyStatus = useCallback(
    (data: TrackingActivityStatus | null | undefined) => {
      const total = Number(data?.total_seconds ?? 0);
      const next = (data?.timer as TimerState) || 'stop';
      setSeconds(next === 'stop' ? 0 : total);
      setTimer(next);
      setStatusLabel(data?.status || (next === 'stop' ? 'Stopped' : '—'));
      setActivityCode(data?.current_activity?.code ?? null);
      clearTick();
      if (next === 'running') {
        intervalRef.current = setInterval(() => {
          setSeconds((v) => v + 1);
        }, 1000);
      }
    },
    [clearTick],
  );

  const refreshActivity = useCallback(async () => {
    try {
      const res = await timesheetActivityApi.list();
      applyStatus(res.data?.data ?? null);
    } catch (err) {
      console.warn('[useTracking] activity fetch failed', err);
    }
  }, [applyStatus]);

  const refreshOtherOrgBanner = useCallback(async () => {
    if (!organisation?.code) {
      setOtherOrgMessage(null);
      return;
    }
    const blocked = await blockOrgSwitch(organisation.code);
    if (!blocked) {
      setOtherOrgMessage(null);
      return;
    }
    const trackingCode = await getTrackingOrganisationCode();
    const orgName =
      user?.organisations?.find((o) => o.code === trackingCode)?.name ||
      trackingCode ||
      'another organisation';
    setOtherOrgMessage(
      `You already have an active tracker in another organisation (“${orgName}”).`,
    );
  }, [organisation?.code, user?.organisations]);

  useEffect(() => {
    setNativeAvailable(backgroundGeolocation.isNativeBglAvailable());
    void (async () => {
      try {
        await backgroundGeolocation.setup();
        await backgroundGeolocation.requestPermissions();
      } catch (err) {
        console.warn('[useTracking] setup failed', err);
      }
      await refreshActivity();
      await refreshOtherOrgBanner();
    })();
    return () => {
      clearTick();
    };
  }, [refreshActivity, refreshOtherOrgBanner, clearTick]);

  const withLocationStore = useCallback(
    async (
      type: 'start' | 'pause' | 'resume' | 'stop',
      organisationCode: string,
      userId: string | number,
      remarks?: string | null,
      trackingToken?: string,
    ) => {
      const token = trackingToken ?? (await ensureTrackingToken());
      const location = await backgroundGeolocation.getCurrentPosition();
      if (!location?.coords?.latitude) {
        throw new Error(
          'Location unavailable. Enable GPS and try again.',
        );
      }
      const res = await timesheetActivityApi.store(
        {
          location,
          type,
          organisationCode,
          userId,
          ...(remarks != null && remarks !== '' ? { remarks } : {}),
        },
        { headers: trackingAuthHeaders(token) },
      );
      applyStatus(res.data?.data ?? null);
      return res.data?.data;
    },
    [applyStatus],
  );

  const onStart = useCallback(async (): Promise<{
    ok: boolean;
    error?: string;
  }> => {
    if (!organisation?.code || !user?.id || busy) {
      return { ok: false, error: 'Not ready to start tracking.' };
    }
    setError(null);
    if (await blockOrgSwitch(organisation.code)) {
      const msg =
        'You already have an active tracker in another organisation.';
      setError(msg);
      await refreshOtherOrgBanner();
      return { ok: false, error: msg };
    }
    setBusy('start');
    try {
      await timesheetActivityApi.validate();
      if (!backgroundGeolocation.isNativeBglAvailable()) {
        throw new BackgroundGeolocationUnavailableError();
      }
      const trackingToken = await ensureTrackingToken();
      await backgroundGeolocation.requestPermissions();
      await setTrackingSession(organisation.code, user.id);
      await backgroundGeolocation.configureTrackingHttp({
        organisationCode: organisation.code,
        userId: user.id,
        trackingToken,
      });
      await backgroundGeolocation.start();
      await withLocationStore(
        'start',
        organisation.code,
        user.id,
        null,
        trackingToken,
      );
      await refreshOtherOrgBanner();
      // Prefer server snapshot after store; list confirms timer state
      await refreshActivity();
      return { ok: true };
    } catch (err) {
      console.warn('[useTracking] start failed', err);
      const message = apiMessage(err, 'Could not start tracking');
      setError(message);
      try {
        await clearTrackingSession();
        await backgroundGeolocation.stop();
      } catch {
        /* ignore cleanup */
      }
      return { ok: false, error: message };
    } finally {
      setBusy(null);
    }
  }, [
    organisation?.code,
    user?.id,
    busy,
    withLocationStore,
    refreshOtherOrgBanner,
    refreshActivity,
  ]);

  const onPause = useCallback(
    async (
      remarks?: string | null,
    ): Promise<{ ok: boolean; error?: string }> => {
      if (busy) return { ok: false };
      setBusy('pause');
      setError(null);
      try {
        const orgCode =
          (await getTrackingOrganisationCode()) || organisation?.code;
        const userId = user?.id;
        if (!orgCode || userId == null) {
          return { ok: false, error: 'Missing organisation session.' };
        }
        await withLocationStore('pause', orgCode, userId, remarks);
        return { ok: true };
      } catch (err) {
        console.warn('[useTracking] pause failed', err);
        const message = apiMessage(err, 'Could not pause tracking');
        setError(message);
        return { ok: false, error: message };
      } finally {
        setBusy(null);
      }
    },
    [busy, organisation?.code, user?.id, withLocationStore],
  );

  const onResume = useCallback(async (): Promise<{
    ok: boolean;
    error?: string;
  }> => {
    if (busy) return { ok: false };
    setBusy('resume');
    setError(null);
    try {
      const orgCode =
        (await getTrackingOrganisationCode()) || organisation?.code;
      const userId = user?.id;
      if (!orgCode || userId == null) {
        return { ok: false, error: 'Missing organisation session.' };
      }
      await withLocationStore('resume', orgCode, userId);
      return { ok: true };
    } catch (err) {
      console.warn('[useTracking] resume failed', err);
      const message = apiMessage(err, 'Could not resume tracking');
      setError(message);
      return { ok: false, error: message };
    } finally {
      setBusy(null);
    }
  }, [busy, organisation?.code, user?.id, withLocationStore]);

  const onStop = useCallback(async (): Promise<{
    ok: boolean;
    error?: string;
  }> => {
    if (busy) return { ok: false };
    setBusy('stop');
    setError(null);
    try {
      const orgCode =
        (await getTrackingOrganisationCode()) || organisation?.code;
      const userId = user?.id;
      if (orgCode && userId != null) {
        await withLocationStore('stop', orgCode, userId);
      }
      await clearTrackingSession();
      await backgroundGeolocation.stop();
      clearTick();
      setSeconds(0);
      setTimer('stop');
      setStatusLabel('Stopped');
      setActivityCode(null);
      await refreshOtherOrgBanner();
      return { ok: true };
    } catch (err) {
      console.warn('[useTracking] stop failed', err);
      const message = apiMessage(err, 'Could not stop tracking');
      setError(message);
      return { ok: false, error: message };
    } finally {
      setBusy(null);
    }
  }, [
    busy,
    organisation?.code,
    user?.id,
    withLocationStore,
    clearTick,
    refreshOtherOrgBanner,
  ]);

  const formatted = useMemo(() => formatElapsed(seconds), [seconds]);
  const running = timer === 'running';
  const paused = timer === 'pause';
  const showStart = !running && !paused;

  return {
    seconds,
    formatted,
    timer,
    statusLabel,
    activityCode,
    busy,
    error,
    otherOrgMessage,
    nativeAvailable,
    running,
    paused,
    showStart,
    canStop: running || paused || seconds > 0,
    onStart,
    onPause,
    onResume,
    onStop,
    refreshActivity,
    setError,
  };
}

export { formatElapsed };
