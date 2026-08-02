import { useEffect } from "react";
import { StyleSheet, Text, View } from "react-native";
import Animated, {
  Easing,
  useAnimatedStyle,
  useSharedValue,
  withRepeat,
  withTiming,
} from "react-native-reanimated";
import { radii, spacing, typography } from "@mytask/theme";
import { useThemeStore } from "../store/themeStore";

type Props = {
  label?: string;
  /** Dot-only for dense chrome (org header). */
  compact?: boolean;
};

const LIVE_GREEN = "#22C55E";

/**
 * Blinking green cue that clock-in / background tracking is active.
 */
export function LiveTrackingIndicator({
  label = "Tracking live",
  compact = false,
}: Props) {
  const c = useThemeStore((s) => s.colors);
  const pulse = useSharedValue(0);

  useEffect(() => {
    pulse.value = withRepeat(
      withTiming(1, { duration: 1100, easing: Easing.inOut(Easing.ease) }),
      -1,
      true,
    );
  }, [pulse]);

  const ringStyle = useAnimatedStyle(() => ({
    opacity: 0.35 + pulse.value * 0.55,
    transform: [{ scale: 1 + pulse.value * 0.55 }],
  }));

  if (compact) {
    return (
      <View
        style={styles.compactWrap}
        accessibilityRole="text"
        accessibilityLabel={label}
      >
        <Animated.View
          style={[styles.ring, { backgroundColor: LIVE_GREEN }, ringStyle]}
        />
        <View style={[styles.dot, { backgroundColor: LIVE_GREEN }]} />
      </View>
    );
  }

  return (
    <View
      style={[
        styles.badge,
        {
          backgroundColor: "rgba(34,197,94,0.12)",
          borderColor: "rgba(34,197,94,0.35)",
        },
      ]}
      accessibilityRole="text"
      accessibilityLabel={label}
    >
      <View style={styles.compactWrap}>
        <Animated.View
          style={[styles.ring, { backgroundColor: LIVE_GREEN }, ringStyle]}
        />
        <View style={[styles.dot, { backgroundColor: LIVE_GREEN }]} />
      </View>
      <Text style={[styles.label, { color: c.text }]}>{label}</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  compactWrap: {
    width: 14,
    height: 14,
    alignItems: "center",
    justifyContent: "center",
  },
  ring: {
    position: "absolute",
    width: 12,
    height: 12,
    borderRadius: 6,
  },
  dot: {
    width: 8,
    height: 8,
    borderRadius: 4,
  },
  badge: {
    flexDirection: "row",
    alignItems: "center",
    gap: spacing.sm,
    alignSelf: "flex-start",
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.sm,
    borderRadius: radii.pill,
    borderWidth: StyleSheet.hairlineWidth,
  },
  label: {
    ...typography.caption,
    fontWeight: "700",
    letterSpacing: 0.2,
  },
});
