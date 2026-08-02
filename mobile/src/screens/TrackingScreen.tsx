import { useEffect, useMemo, useState } from 'react';
import {
  ActivityIndicator,
  Modal,
  Pressable,
  StyleSheet,
  Text,
  TextInput,
  View,
} from 'react-native';
import Animated, {
  Easing,
  interpolate,
  useAnimatedStyle,
  useSharedValue,
  withRepeat,
  withTiming,
} from 'react-native-reanimated';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import type { NativeStackScreenProps } from '@react-navigation/native-stack';
import { radii, spacing } from '@mytask/theme';
import { useTracking } from '../hooks/useTracking';
import type { OrgStackParamList } from '../navigation/types';
import { HeaderIconButton } from '../components/HeaderIconButton';
import { useThemeStore } from '../store/themeStore';
import { useToastStore } from '../store/toastStore';
import { Button, CloseIcon, elevation } from '../ui';

type Props = NativeStackScreenProps<OrgStackParamList, 'Tracking'>;

function TrackingPulse({ active, color }: { active: boolean; color: string }) {
  const progress = useSharedValue(0);

  useEffect(() => {
    if (active) {
      progress.value = withRepeat(
        withTiming(1, { duration: 1800, easing: Easing.out(Easing.cubic) }),
        -1,
        false,
      );
    } else {
      progress.value = withTiming(0, { duration: 300 });
    }
  }, [active, progress]);

  const ringStyle = useAnimatedStyle(() => ({
    opacity: interpolate(progress.value, [0, 1], [0.45, 0]),
    transform: [{ scale: interpolate(progress.value, [0, 1], [1, 1.35]) }],
  }));

  return (
    <View style={styles.pulseWrap}>
      {active ? (
        <Animated.View
          style={[
            styles.pulseRing,
            { borderColor: color },
            ringStyle,
          ]}
        />
      ) : null}
      <View style={[styles.pulseCore, { backgroundColor: color }]} />
    </View>
  );
}

export function TrackingScreen({ navigation }: Props) {
  const insets = useSafeAreaInsets();
  const c = useThemeStore((s) => s.colors);
  const toast = useToastStore();
  const tracking = useTracking();
  const [pauseOpen, setPauseOpen] = useState(false);
  const [remarks, setRemarks] = useState('');

  const accent = useMemo(() => {
    if (tracking.paused) return c.warning;
    if (tracking.running) return c.primary;
    return c.muted;
  }, [tracking.paused, tracking.running, c]);

  /** Pulse / live indicator always uses brand primary while tracking. */
  const indicatorColor = tracking.running || tracking.paused ? c.primary : c.muted;

  const dayProgress = useMemo(() => {
    // Soft visual of an 8h work day — decorative only
    return Math.min(1, tracking.seconds / (8 * 3600));
  }, [tracking.seconds]);

  async function handleStart() {
    const result = await tracking.onStart();
    if (result.ok) {
      toast.success('Tracking started');
    } else if (result.error) {
      toast.error(result.error);
    }
  }

  async function confirmPause(skipRemarks: boolean) {
    setPauseOpen(false);
    const result = await tracking.onPause(
      skipRemarks ? null : remarks.trim(),
    );
    setRemarks('');
    if (result.ok) {
      toast.success('Tracking paused');
    } else if (result.error) {
      toast.error(result.error);
    }
  }

  async function handleResume() {
    const result = await tracking.onResume();
    if (result.ok) {
      toast.success('Tracking resumed');
    } else if (result.error) {
      toast.error(result.error);
    }
  }

  async function handleStop() {
    const result = await tracking.onStop();
    if (result.ok) {
      toast.success('Tracking stopped');
    } else if (result.error) {
      toast.error(result.error);
    }
  }

  return (
    <View
      style={[
        styles.root,
        {
          backgroundColor: c.bg,
          paddingTop: insets.top + spacing.sm,
          paddingBottom: insets.bottom + spacing.lg,
        },
      ]}
    >
      <View style={styles.topBar}>
        <HeaderIconButton
          onPress={() => navigation.goBack()}
          accessibilityLabel="Close tracking"
          style={styles.closeBtn}
        >
          <CloseIcon color={c.text} size={20} />
        </HeaderIconButton>
        <Text style={[styles.title, { color: c.text }]}>Time tracking</Text>
        <View style={styles.closeSpacer} />
      </View>

      <View style={styles.center}>
        <TrackingPulse
          active={tracking.running}
          color={indicatorColor}
        />

        <Text style={[styles.timer, { color: c.text }]}>
          {tracking.formatted}
        </Text>
        <Text style={[styles.status, { color: accent }]}>
          {tracking.statusLabel}
        </Text>
        <Text style={[styles.hint, { color: c.muted }]}>
          {tracking.nativeAvailable
            ? 'Background location active'
            : 'Native background module not linked — rebuild required'}
        </Text>

        <View style={[styles.progressTrack, { backgroundColor: c.bgMuted }]}>
          <View
            style={[
              styles.progressFill,
              {
                width: `${Math.round(dayProgress * 100)}%`,
                backgroundColor: accent,
              },
            ]}
          />
        </View>

        {tracking.otherOrgMessage ? (
          <View
            style={[styles.banner, { backgroundColor: c.warningSoft }]}
          >
            <Text style={[styles.bannerText, { color: c.warningText }]}>
              {tracking.otherOrgMessage}
            </Text>
          </View>
        ) : null}

        {tracking.error ? (
          <Text style={[styles.error, { color: c.negative }]}>
            {tracking.error}
          </Text>
        ) : null}
      </View>

      <View style={styles.actions}>
        {tracking.showStart ? (
          <Pressable
            accessibilityRole="button"
            accessibilityLabel="Start tracking"
            disabled={
              tracking.busy != null || Boolean(tracking.otherOrgMessage)
            }
            onPress={() => void handleStart()}
            style={({ pressed }) => [
              styles.startBtn,
              elevation.fab,
              {
                backgroundColor: c.primary,
                opacity:
                  tracking.busy || tracking.otherOrgMessage
                    ? 0.5
                    : pressed
                      ? 0.9
                      : 1,
              },
            ]}
          >
            {tracking.busy === 'start' ? (
              <ActivityIndicator color="#fff" />
            ) : (
              <Text style={styles.startLabel}>Start</Text>
            )}
          </Pressable>
        ) : (
          <View style={styles.row}>
            {tracking.running ? (
              <Button
                title="Pause"
                loading={tracking.busy === 'pause'}
                disabled={tracking.busy != null}
                style={[styles.half, { backgroundColor: c.warning, borderColor: c.warning }]}
                onPress={() => setPauseOpen(true)}
              />
            ) : (
              <Button
                title="Resume"
                loading={tracking.busy === 'resume'}
                disabled={tracking.busy != null}
                style={styles.half}
                onPress={() => void handleResume()}
              />
            )}
            <Button
              title="Stop"
              variant="danger"
              loading={tracking.busy === 'stop'}
              disabled={tracking.busy != null || !tracking.canStop}
              style={styles.half}
              onPress={() => void handleStop()}
            />
          </View>
        )}
      </View>

      <Modal
        visible={pauseOpen}
        transparent
        animationType="fade"
        onRequestClose={() => setPauseOpen(false)}
      >
        <Pressable
          style={[styles.modalBackdrop, { backgroundColor: c.overlay }]}
          onPress={() => setPauseOpen(false)}
        >
          <Pressable
            style={[
              styles.modalCard,
              elevation.raised,
              { backgroundColor: c.surface },
            ]}
            onPress={(e) => e.stopPropagation()}
          >
            <Text style={[styles.modalTitle, { color: c.text }]}>
              Why are you taking a break?
            </Text>
            <Text style={[styles.modalHint, { color: c.muted }]}>
              Remarks are optional.
            </Text>
            <TextInput
              value={remarks}
              onChangeText={setRemarks}
              placeholder="Optional note"
              placeholderTextColor={c.muted}
              multiline
              style={[
                styles.remarks,
                {
                  color: c.text,
                  borderColor: c.border,
                  backgroundColor: c.bg,
                },
              ]}
            />
            <View style={styles.modalActions}>
              <View style={styles.half}>
                <Button
                  title="Skip"
                  variant="outline"
                  onPress={() => void confirmPause(true)}
                />
              </View>
              <View style={styles.half}>
                <Button
                  title="Submit"
                  onPress={() => void confirmPause(false)}
                />
              </View>
            </View>
          </Pressable>
        </Pressable>
      </Modal>
    </View>
  );
}

const styles = StyleSheet.create({
  root: {
    flex: 1,
    paddingHorizontal: spacing.lg,
  },
  topBar: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: spacing.lg,
  },
  closeBtn: {
    borderRadius: 22,
  },
  closeSpacer: { width: 44, height: 44 },
  title: {
    fontSize: 17,
    fontWeight: '700',
  },
  center: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    gap: spacing.sm,
  },
  pulseWrap: {
    width: 96,
    height: 96,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: spacing.md,
  },
  pulseRing: {
    position: 'absolute',
    width: 96,
    height: 96,
    borderRadius: 48,
    borderWidth: 3,
  },
  pulseCore: {
    width: 28,
    height: 28,
    borderRadius: 14,
  },
  timer: {
    fontSize: 52,
    fontWeight: '700',
    fontVariant: ['tabular-nums'],
    letterSpacing: 1,
  },
  status: {
    fontSize: 22,
    fontWeight: '700',
    marginTop: 4,
  },
  hint: {
    fontSize: 13,
    marginTop: 4,
    textAlign: 'center',
  },
  progressTrack: {
    marginTop: spacing.lg,
    width: '100%',
    maxWidth: 280,
    height: 8,
    borderRadius: radii.full,
    overflow: 'hidden',
  },
  progressFill: {
    height: '100%',
    borderRadius: radii.full,
  },
  banner: {
    marginTop: spacing.md,
    borderRadius: 12,
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.sm,
    alignSelf: 'stretch',
  },
  bannerText: {
    fontSize: 13,
    textAlign: 'center',
    lineHeight: 18,
  },
  error: {
    marginTop: spacing.sm,
    fontSize: 13,
    textAlign: 'center',
  },
  actions: {
    paddingTop: spacing.md,
  },
  startBtn: {
    height: 72,
    borderRadius: 36,
    alignItems: 'center',
    justifyContent: 'center',
  },
  startLabel: {
    color: '#fff',
    fontSize: 22,
    fontWeight: '700',
    letterSpacing: 0.4,
  },
  row: {
    flexDirection: 'row',
    gap: 12,
  },
  half: { flex: 1 },
  modalBackdrop: {
    flex: 1,
    justifyContent: 'center',
    padding: spacing.lg,
  },
  modalCard: {
    borderRadius: 20,
    padding: spacing.lg,
  },
  modalTitle: {
    fontSize: 18,
    fontWeight: '700',
  },
  modalHint: {
    fontSize: 13,
    marginTop: 6,
    marginBottom: spacing.md,
  },
  remarks: {
    minHeight: 96,
    borderWidth: StyleSheet.hairlineWidth,
    borderRadius: 14,
    padding: spacing.md,
    textAlignVertical: 'top',
    marginBottom: spacing.md,
  },
  modalActions: {
    flexDirection: 'row',
    gap: 10,
  },
});
