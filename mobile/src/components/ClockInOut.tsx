import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { StyleSheet, Text, View } from 'react-native';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { timesheetActivityApi } from '@mytask/api';
import { STORAGE_KEYS } from '@mytask/constants';
import { spacing } from '@mytask/theme';
import { useAuthStore } from '../store/authStore';
import { useOrganisationStore } from '../store/organisationStore';
import { useThemeStore } from '../store/themeStore';
import { useToastStore } from '../store/toastStore';
import backgroundGeolocation from '../services/backgroundGeolocation';
import {
  blockOrgSwitch,
  clearTrackingSession,
  getTrackingOrganisationCode,
  setTrackingSession,
} from '../services/trackingSession';
import { Button, Card, ClockIcon } from '../ui';

type TimerState = 'stop' | 'running' | 'pause';

function formatElapsed(totalSeconds: number): string {
  const h = String(Math.floor(totalSeconds / 3600)).padStart(2, '0');
  const m = String(Math.floor((totalSeconds % 3600) / 60)).padStart(2, '0');
  const s = String(totalSeconds % 60).padStart(2, '0');
  return `${h}h ${m}m ${s}s`;
}

function roleCode(role: unknown): string | undefined {
  if (typeof role === 'string') {
    return role;
  }
  if (role && typeof role === 'object' && 'code' in role) {
    const code = (role as { code?: unknown }).code;
    return typeof code === 'string' ? code : undefined;
  }
  return undefined;
}

export function ClockInOut() {
  const organisation = useOrganisationStore((s) => s.organisation);
  const user = useAuthStore((s) => s.user);
  const c = useThemeStore((s) => s.colors);
  const toast = useToastStore();

  const [seconds, setSeconds] = useState(0);
  const [timer, setTimer] = useState<TimerState>('stop');
  const [busy, setBusy] = useState<'start' | 'pause' | 'resume' | 'stop' | null>(
    null,
  );
  const [otherOrgMessage, setOtherOrgMessage] = useState<string | null>(null);
  const intervalRef = useRef<ReturnType<typeof setInterval> | null>(null);

  const isOwner =
    roleCode(organisation?.role) === 'owner' ||
    organisation?.role_code === 'owner';

  const clearTick = useCallback(() => {
    if (intervalRef.current) {
      clearInterval(intervalRef.current);
      intervalRef.current = null;
    }
  }, []);

  const applyActivity = useCallback(
    (data: { total_seconds?: number; timer?: string } | null | undefined) => {
      const total = Number(data?.total_seconds ?? 0);
      const next = (data?.timer as TimerState) || 'stop';
      setSeconds(next === 'stop' ? 0 : total);
      setTimer(next);
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
      const data = (res.data as { data?: { total_seconds?: number; timer?: string } })
        ?.data;
      applyActivity(data);
    } catch (err) {
      console.warn('[ClockInOut] activity fetch failed', err);
    }
  }, [applyActivity]);

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
      `You’re currently tracking time for “${orgName}”. Stop that tracking before starting here.`,
    );
  }, [organisation?.code, user?.organisations]);

  useEffect(() => {
    if (isOwner) {
      return;
    }
    void (async () => {
      await backgroundGeolocation.setup();
      await backgroundGeolocation.requestPermissions();
      await refreshActivity();
      await refreshOtherOrgBanner();
    })();
    return () => {
      clearTick();
    };
  }, [
    isOwner,
    refreshActivity,
    refreshOtherOrgBanner,
    clearTick,
  ]);

  const running = timer === 'running';
  const paused = timer === 'pause';
  const showStart = !running && (timer === 'stop' || seconds === 0);
  const canStop = running || paused || seconds > 0;

  const formatted = useMemo(() => formatElapsed(seconds), [seconds]);

  async function withLocationStore(
    type: 'start' | 'pause' | 'resume' | 'stop',
    organisationCode: string,
    userId: string | number,
  ) {
    const fcmToken = await AsyncStorage.getItem(STORAGE_KEYS.fcmToken);
    const location = await backgroundGeolocation.getCurrentPosition();
    await timesheetActivityApi.store({
      location,
      type,
      organisationCode,
      userId,
      fcmToken,
    });
  }

  async function onStart() {
    if (!organisation?.code || !user?.id || busy) {
      return;
    }
    if (await blockOrgSwitch(organisation.code)) {
      toast.warning('Stop tracking the other organisation first');
      await refreshOtherOrgBanner();
      return;
    }
    setBusy('start');
    try {
      await timesheetActivityApi.validate();
      await backgroundGeolocation.start();
      await withLocationStore('start', organisation.code, user.id);
      await setTrackingSession(organisation.code, user.id);
      const fcmToken = await AsyncStorage.getItem(STORAGE_KEYS.fcmToken);
      await backgroundGeolocation.configureTrackingHttp({
        organisationCode: organisation.code,
        userId: user.id,
        fcmToken,
      });
      await refreshActivity();
      await refreshOtherOrgBanner();
      toast.success('Tracking started');
    } catch (err) {
      console.warn('[ClockInOut] start failed', err);
      toast.error('Could not start tracking');
    } finally {
      setBusy(null);
    }
  }

  async function onPause() {
    if (busy) {
      return;
    }
    setBusy('pause');
    try {
      const orgCode =
        (await getTrackingOrganisationCode()) || organisation?.code;
      const userId = user?.id;
      if (!orgCode || userId == null) {
        return;
      }
      await withLocationStore('pause', orgCode, userId);
      await refreshActivity();
    } catch (err) {
      console.warn('[ClockInOut] pause failed', err);
      toast.error('Could not pause tracking');
    } finally {
      setBusy(null);
    }
  }

  async function onResume() {
    if (busy) {
      return;
    }
    setBusy('resume');
    try {
      const orgCode =
        (await getTrackingOrganisationCode()) || organisation?.code;
      const userId = user?.id;
      if (!orgCode || userId == null) {
        return;
      }
      await withLocationStore('resume', orgCode, userId);
      await refreshActivity();
    } catch (err) {
      console.warn('[ClockInOut] resume failed', err);
      toast.error('Could not resume tracking');
    } finally {
      setBusy(null);
    }
  }

  async function onStop() {
    if (busy) {
      return;
    }
    setBusy('stop');
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
      await refreshActivity();
      await refreshOtherOrgBanner();
      toast.success('Tracking stopped');
    } catch (err) {
      console.warn('[ClockInOut] stop failed', err);
      toast.error('Could not stop tracking');
    } finally {
      setBusy(null);
    }
  }

  if (isOwner) {
    return null;
  }

  return (
    <Card style={styles.card}>
      <View style={styles.titleRow}>
        <View style={[styles.iconBadge, { backgroundColor: c.primarySoft }]}>
          <ClockIcon color={c.primary} size={18} />
        </View>
        <Text style={[styles.title, { color: c.text }]}>Log your time</Text>
      </View>
      {otherOrgMessage ? (
        <View style={[styles.bannerWrap, { backgroundColor: c.warningSoft }]}>
          <Text style={[styles.banner, { color: c.warningText }]}>
            {otherOrgMessage}
          </Text>
        </View>
      ) : null}

      <Text style={[styles.timer, { color: c.primary }]}>{formatted}</Text>
      <Text style={[styles.modeHint, { color: c.muted }]}>
        {backgroundGeolocation.isNativeBglAvailable()
          ? 'Background tracking'
          : 'Foreground tracking (fallback)'}
        {running ? ' · Running' : paused ? ' · Paused' : ' · Stopped'}
      </Text>

      <View style={styles.row}>
        {!running ? (
          <Button
            title={showStart ? 'Start' : 'Resume'}
            loading={busy === 'start' || busy === 'resume'}
            disabled={busy != null || Boolean(otherOrgMessage)}
            style={styles.actionBtn}
            onPress={() => {
              if (showStart) {
                void onStart();
              } else {
                void onResume();
              }
            }}
          />
        ) : (
          <Button
            title="Pause"
            style={[styles.actionBtn, { backgroundColor: c.warning, borderColor: c.warning }]}
            loading={busy === 'pause'}
            disabled={busy != null}
            onPress={() => void onPause()}
          />
        )}
        <Button
          title="Stop"
          variant="danger"
          style={styles.actionBtn}
          loading={busy === 'stop'}
          disabled={busy != null || !canStop}
          onPress={() => void onStop()}
        />
      </View>
    </Card>
  );
}

const styles = StyleSheet.create({
  card: {
    marginBottom: spacing.md,
    alignItems: 'center',
    paddingVertical: spacing.lg,
  },
  titleRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.sm,
    marginBottom: spacing.sm,
  },
  iconBadge: {
    width: 32,
    height: 32,
    borderRadius: 10,
    alignItems: 'center',
    justifyContent: 'center',
  },
  title: { fontSize: 16, fontWeight: '700' },
  bannerWrap: {
    borderRadius: 12,
    paddingHorizontal: spacing.sm,
    paddingVertical: 8,
    marginBottom: spacing.sm,
    alignSelf: 'stretch',
  },
  banner: {
    fontSize: 12,
    textAlign: 'center',
    lineHeight: 18,
  },
  timer: {
    fontSize: 28,
    fontWeight: '700',
    fontVariant: ['tabular-nums'],
    marginTop: spacing.sm,
  },
  modeHint: { fontSize: 12, marginTop: 6, marginBottom: spacing.md },
  row: {
    flexDirection: 'row',
    gap: 10,
    width: '100%',
  },
  actionBtn: { flex: 1 },
});
