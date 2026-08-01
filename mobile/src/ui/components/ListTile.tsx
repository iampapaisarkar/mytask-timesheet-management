import type { ReactNode } from "react";
import { Pressable, StyleSheet, Text, View } from "react-native";
import Animated, {
  useAnimatedStyle,
  useSharedValue,
  withSpring,
} from "react-native-reanimated";
import { radii, spacing, typography } from "@mytask/theme";
import { useThemeStore } from "../../store/themeStore";
import { ChevronIcon } from "../icons";
import { elevation, motion, touchTarget } from "../tokens";
import { triggerHaptic } from "../../utils/haptics";

type Props = {
  title: string;
  subtitle?: string;
  left?: ReactNode;
  right?: ReactNode;
  onPress?: () => void;
  showChevron?: boolean;
  destructive?: boolean;
};

const AnimatedPressable = Animated.createAnimatedComponent(Pressable);

/**
 * Settings / menu row with optional icon, chevron, and press feedback.
 */
export function ListTile({
  title,
  subtitle,
  left,
  right,
  onPress,
  showChevron = true,
  destructive = false,
}: Props) {
  const c = useThemeStore((s) => s.colors);
  const scale = useSharedValue(1);
  const animStyle = useAnimatedStyle(() => ({
    transform: [{ scale: scale.value }],
  }));

  return (
    <AnimatedPressable
      accessibilityRole={onPress ? "button" : "text"}
      accessibilityLabel={title}
      disabled={!onPress}
      onPress={() => {
        void triggerHaptic("selection");
        onPress?.();
      }}
      onPressIn={() => {
        scale.value = withSpring(0.985, motion.spring.snappy);
      }}
      onPressOut={() => {
        scale.value = withSpring(1, motion.spring.snappy);
      }}
      style={[
        styles.tile,
        elevation.soft,
        {
          backgroundColor: c.surface,
          borderColor: c.border,
        },
        animStyle,
      ]}
    >
      {left ? <View style={styles.left}>{left}</View> : null}
      <View style={styles.textCol}>
        <Text
          style={[
            styles.title,
            { color: destructive ? c.negative : c.text },
          ]}
          numberOfLines={1}
        >
          {title}
        </Text>
        {subtitle ? (
          <Text style={[styles.subtitle, { color: c.muted }]} numberOfLines={2}>
            {subtitle}
          </Text>
        ) : null}
      </View>
      {right}
      {showChevron && onPress ? <ChevronIcon color={c.subtle} /> : null}
    </AnimatedPressable>
  );
}

const styles = StyleSheet.create({
  tile: {
    minHeight: touchTarget.comfortable,
    borderRadius: radii.xl,
    borderWidth: StyleSheet.hairlineWidth,
    paddingHorizontal: spacing.md,
    paddingVertical: 14,
    flexDirection: "row",
    alignItems: "center",
    gap: spacing.sm,
    marginBottom: spacing.sm,
  },
  left: {
    width: 40,
    height: 40,
    borderRadius: radii.md,
    alignItems: "center",
    justifyContent: "center",
  },
  textCol: { flex: 1, minWidth: 0 },
  title: {
    fontSize: typography.sizes.md,
    fontWeight: "700",
  },
  subtitle: {
    marginTop: 3,
    fontSize: typography.sizes.xs,
    lineHeight: 16,
  },
});
