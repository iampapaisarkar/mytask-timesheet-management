import { useEffect } from "react";
import {
  StyleSheet,
  View,
  type StyleProp,
  type ViewStyle,
} from "react-native";
import Animated, {
  useAnimatedStyle,
  useSharedValue,
  withRepeat,
  withTiming,
  Easing,
} from "react-native-reanimated";
import { radii, spacing } from "@mytask/theme";
import { useThemeStore } from "../store/themeStore";
import { elevation } from "../ui/tokens";

function Pulse({
  style,
  height = 14,
  width,
  radius = 8,
}: {
  style?: StyleProp<ViewStyle>;
  height?: number;
  width?: number | `${number}%`;
  radius?: number;
}) {
  const c = useThemeStore((s) => s.colors);
  const opacity = useSharedValue(0.35);

  useEffect(() => {
    opacity.value = withRepeat(
      withTiming(0.85, { duration: 750, easing: Easing.inOut(Easing.ease) }),
      -1,
      true,
    );
  }, [opacity]);

  const anim = useAnimatedStyle(() => ({ opacity: opacity.value }));

  return (
    <Animated.View
      style={[
        {
          height,
          width: width ?? "100%",
          borderRadius: radius,
          backgroundColor: c.border,
        },
        anim,
        style,
      ]}
    />
  );
}

export function SkeletonBlock(props: {
  height?: number;
  width?: number | `${number}%`;
  radius?: number;
  style?: StyleProp<ViewStyle>;
}) {
  return <Pulse {...props} />;
}

export function SkeletonList({
  rows = 6,
  rowHeight = 72,
}: {
  rows?: number;
  rowHeight?: number;
}) {
  const c = useThemeStore((s) => s.colors);
  return (
    <View style={styles.pad}>
      {Array.from({ length: rows }).map((_, i) => (
        <View
          key={i}
          style={[
            styles.card,
            elevation.card,
            {
              minHeight: rowHeight,
              backgroundColor: c.surface,
              borderColor: c.border,
            },
          ]}
        >
          <Pulse height={16} width="55%" />
          <Pulse height={12} width="35%" style={{ marginTop: 10 }} />
          <Pulse height={12} width="70%" style={{ marginTop: 8 }} />
        </View>
      ))}
    </View>
  );
}

export function SkeletonDashboard() {
  const c = useThemeStore((s) => s.colors);
  return (
    <View style={styles.pad}>
      <Pulse height={22} width="40%" />
      <Pulse height={12} width="55%" style={{ marginTop: 8, marginBottom: 16 }} />
      <View style={styles.grid}>
        {[0, 1, 2, 3].map((i) => (
          <View
            key={i}
            style={[
              styles.stat,
              elevation.card,
              { backgroundColor: c.surface, borderColor: c.border },
            ]}
          >
            <Pulse height={10} width="50%" />
            <Pulse height={24} width="40%" style={{ marginTop: 10 }} />
            <Pulse height={10} width="60%" style={{ marginTop: 8 }} />
          </View>
        ))}
      </View>
      <View
        style={[
          styles.chart,
          elevation.card,
          { backgroundColor: c.surface, borderColor: c.border },
        ]}
      >
        <Pulse height={14} width="35%" style={{ marginBottom: 16 }} />
        <View style={styles.bars}>
          {Array.from({ length: 7 }).map((_, i) => (
            <Pulse
              key={i}
              height={40 + (i % 3) * 18}
              width={18}
              radius={8}
            />
          ))}
        </View>
      </View>
    </View>
  );
}

export function SkeletonDetail() {
  const c = useThemeStore((s) => s.colors);
  return (
    <View style={styles.pad}>
      <Pulse height={22} width="50%" />
      <Pulse height={12} width="70%" style={{ marginTop: 10 }} />
      <View
        style={[
          styles.card,
          elevation.card,
          { backgroundColor: c.surface, borderColor: c.border, marginTop: 16 },
        ]}
      >
        {Array.from({ length: 5 }).map((_, i) => (
          <Pulse
            key={i}
            height={12}
            width={i % 2 === 0 ? "80%" : "55%"}
            style={{ marginBottom: 14 }}
          />
        ))}
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  pad: { padding: spacing.lg },
  card: {
    borderRadius: radii.xl,
    borderWidth: StyleSheet.hairlineWidth,
    padding: spacing.md,
    marginBottom: spacing.sm,
  },
  grid: { flexDirection: "row", flexWrap: "wrap", gap: 10 },
  stat: {
    width: "48%",
    flexGrow: 1,
    borderRadius: radii.xl,
    borderWidth: StyleSheet.hairlineWidth,
    padding: spacing.md,
  },
  chart: {
    marginTop: spacing.md,
    borderRadius: radii.xl,
    borderWidth: StyleSheet.hairlineWidth,
    padding: spacing.md,
  },
  bars: {
    flexDirection: "row",
    alignItems: "flex-end",
    justifyContent: "space-between",
    height: 120,
  },
});
