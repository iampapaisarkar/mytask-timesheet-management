import type { ReactNode } from "react";
import { Pressable, StyleSheet, Text, View } from "react-native";
import Animated, {
  useAnimatedStyle,
  useSharedValue,
  withSpring,
} from "react-native-reanimated";
import { radii, typography } from "@mytask/theme";
import { useThemeStore } from "../../store/themeStore";
import { triggerHaptic } from "../../utils/haptics";
import { elevation, motion } from "../tokens";

type Props = {
  label: string;
  icon: ReactNode;
  onPress?: () => void;
  tint?: string;
};

const AnimatedPressable = Animated.createAnimatedComponent(Pressable);

export function QuickAction({ label, icon, onPress, tint }: Props) {
  const c = useThemeStore((s) => s.colors);
  const color = tint || c.primary;
  const scale = useSharedValue(1);
  const animStyle = useAnimatedStyle(() => ({
    transform: [{ scale: scale.value }],
  }));

  return (
    <AnimatedPressable
      accessibilityRole="button"
      accessibilityLabel={label}
      onPress={() => {
        void triggerHaptic("light");
        onPress?.();
      }}
      onPressIn={() => {
        scale.value = withSpring(0.96, motion.spring.snappy);
      }}
      onPressOut={() => {
        scale.value = withSpring(1, motion.spring.snappy);
      }}
      style={[styles.wrap, animStyle]}
    >
      <View
        style={[
          styles.icon,
          elevation.soft,
          { backgroundColor: `${color}18` },
        ]}
      >
        {icon}
      </View>
      <Text style={[styles.label, { color: c.text }]} numberOfLines={2}>
        {label}
      </Text>
    </AnimatedPressable>
  );
}

const styles = StyleSheet.create({
  wrap: {
    width: "23%",
    minWidth: 72,
    alignItems: "center",
    gap: 8,
  },
  icon: {
    width: 52,
    height: 52,
    borderRadius: radii.lg,
    alignItems: "center",
    justifyContent: "center",
  },
  label: {
    fontSize: typography.sizes.xs,
    fontWeight: "600",
    textAlign: "center",
    lineHeight: 14,
  },
});
