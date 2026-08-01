import type { ReactNode } from "react";
import {
  Pressable,
  StyleSheet,
  View,
  type StyleProp,
  type ViewStyle,
} from "react-native";
import Animated, {
  useAnimatedStyle,
  useSharedValue,
  withSpring,
} from "react-native-reanimated";
import { radii, spacing } from "@mytask/theme";
import { useThemeStore } from "../../store/themeStore";
import { elevation, motion } from "../tokens";

type Props = {
  children: ReactNode;
  onPress?: () => void;
  padded?: boolean;
  elevated?: boolean;
  accentBorder?: string;
  style?: StyleProp<ViewStyle>;
  accessibilityLabel?: string;
};

const AnimatedPressable = Animated.createAnimatedComponent(Pressable);

/**
 * Soft-elevated surface card. Prefer this over ad-hoc bordered Views.
 */
export function Card({
  children,
  onPress,
  padded = true,
  elevated = true,
  accentBorder,
  style,
  accessibilityLabel,
}: Props) {
  const c = useThemeStore((s) => s.colors);
  const scale = useSharedValue(1);
  const animStyle = useAnimatedStyle(() => ({
    transform: [{ scale: scale.value }],
  }));

  const content = (
    <View
      style={[
        styles.card,
        elevated && elevation.card,
        {
          backgroundColor: c.surface,
          borderColor: c.border,
          borderLeftWidth: accentBorder ? 3 : StyleSheet.hairlineWidth,
          borderLeftColor: accentBorder || c.border,
          padding: padded ? spacing.md : 0,
        },
        style,
      ]}
    >
      {children}
    </View>
  );

  if (!onPress) return content;

  return (
    <AnimatedPressable
      accessibilityRole="button"
      accessibilityLabel={accessibilityLabel}
      onPress={onPress}
      onPressIn={() => {
        scale.value = withSpring(0.985, motion.spring.snappy);
      }}
      onPressOut={() => {
        scale.value = withSpring(1, motion.spring.snappy);
      }}
      style={animStyle}
    >
      {content}
    </AnimatedPressable>
  );
}

const styles = StyleSheet.create({
  card: {
    borderRadius: radii.xl,
    borderWidth: StyleSheet.hairlineWidth,
    overflow: "hidden",
  },
});
