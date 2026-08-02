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

/**
 * Blinking primary-color cue that clock-in / background tracking is active.
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
          style={[styles.ring, { backgroundColor: c.primary }, ringStyle]}
        />
        <View style={[styles.dot, { backgroundColor: c.primary }]} />
      </View>
    );
  }

  return (
    <View
      style={[
        styles.badge,
        {
          backgroundColor: c.primarySoft,
          borderColor: c.primary,
        },
      ]}
      accessibilityRole="text"
      accessibilityLabel={label}
    >
      <View style={styles.compactWrap}>
        <Animated.View
          style={[styles.ring, { backgroundColor: c.primary }, ringStyle]}
        />
        <View style={[styles.dot, { backgroundColor: c.primary }]} />
      </View>
      <Text style={[styles.label, { color: c.primary }]}>{label}</Text>
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
    borderRadius: radii.full,
  },
  dot: {
    width: 8,
    height: 8,
    borderRadius: radii.full,
  },
  badge: {
    flexDirection: "row",
    alignItems: "center",
    gap: spacing.sm,
    alignSelf: "flex-start",
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.sm,
    borderRadius: radii.full,
    borderWidth: StyleSheet.hairlineWidth,
  },
  label: {
    ...typography.caption,
    fontWeight: "700",
    letterSpacing: 0.2,
  },
});
