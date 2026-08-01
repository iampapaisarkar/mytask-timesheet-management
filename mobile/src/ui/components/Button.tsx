import { type ReactNode, useCallback } from "react";
import {
  ActivityIndicator,
  Pressable,
  StyleSheet,
  Text,
  View,
  type StyleProp,
  type ViewStyle,
} from "react-native";
import Animated, {
  useAnimatedStyle,
  useSharedValue,
  withSpring,
} from "react-native-reanimated";
import { radii, spacing, typography } from "@mytask/theme";
import { useThemeStore } from "../../store/themeStore";
import { triggerHaptic } from "../../utils/haptics";
import { elevation, motion, opacity, touchTarget } from "../tokens";

export type ButtonVariant =
  | "primary"
  | "secondary"
  | "outline"
  | "ghost"
  | "danger"
  | "soft";

export type ButtonSize = "sm" | "md" | "lg";

type Props = {
  title: string;
  onPress?: () => void;
  variant?: ButtonVariant;
  size?: ButtonSize;
  loading?: boolean;
  disabled?: boolean;
  leftIcon?: ReactNode;
  rightIcon?: ReactNode;
  fullWidth?: boolean;
  haptic?: boolean;
  accessibilityLabel?: string;
  style?: StyleProp<ViewStyle>;
};

const AnimatedPressable = Animated.createAnimatedComponent(Pressable);

export function Button({
  title,
  onPress,
  variant = "primary",
  size = "md",
  loading = false,
  disabled = false,
  leftIcon,
  rightIcon,
  fullWidth = true,
  haptic = true,
  accessibilityLabel,
  style,
}: Props) {
  const c = useThemeStore((s) => s.colors);
  const scale = useSharedValue(1);
  const isDisabled = disabled || loading;

  const palette = (() => {
    switch (variant) {
      case "secondary":
        return {
          bg: c.secondary,
          text: c.white,
          border: c.secondary,
        };
      case "outline":
        return {
          bg: "transparent",
          text: c.text,
          border: c.borderStrong,
        };
      case "ghost":
        return {
          bg: "transparent",
          text: c.primary,
          border: "transparent",
        };
      case "danger":
        return {
          bg: c.negative,
          text: c.white,
          border: c.negative,
        };
      case "soft":
        return {
          bg: c.primarySoft,
          text: c.secondary,
          border: "transparent",
        };
      default:
        return {
          bg: c.primary,
          text: c.white,
          border: c.primary,
        };
    }
  })();

  const pad =
    size === "sm"
      ? { py: 10, px: 14, font: typography.sizes.sm }
      : size === "lg"
        ? { py: 16, px: 20, font: typography.sizes.lg }
        : { py: 14, px: 18, font: typography.sizes.md };

  const animStyle = useAnimatedStyle(() => ({
    transform: [{ scale: scale.value }],
  }));

  const handlePressIn = useCallback(() => {
    scale.value = withSpring(0.97, motion.spring.snappy);
  }, [scale]);

  const handlePressOut = useCallback(() => {
    scale.value = withSpring(1, motion.spring.snappy);
  }, [scale]);

  return (
    <AnimatedPressable
      accessibilityRole="button"
      accessibilityLabel={accessibilityLabel || title}
      accessibilityState={{ disabled: isDisabled, busy: loading }}
      disabled={isDisabled}
      onPress={() => {
        if (haptic) void triggerHaptic("light");
        onPress?.();
      }}
      onPressIn={handlePressIn}
      onPressOut={handlePressOut}
      style={[
        styles.base,
        elevation.soft,
        {
          backgroundColor: palette.bg,
          borderColor: palette.border,
          paddingVertical: pad.py,
          paddingHorizontal: pad.px,
          opacity: isDisabled ? opacity.disabled : 1,
          alignSelf: fullWidth ? "stretch" : "flex-start",
        },
        animStyle,
        style,
      ]}
    >
      {loading ? (
        <ActivityIndicator color={palette.text} />
      ) : (
        <View style={styles.row}>
          {leftIcon}
          <Text
            style={[
              styles.label,
              { color: palette.text, fontSize: pad.font },
            ]}
          >
            {title}
          </Text>
          {rightIcon}
        </View>
      )}
    </AnimatedPressable>
  );
}

const styles = StyleSheet.create({
  base: {
    minHeight: touchTarget.min,
    borderRadius: radii.lg,
    borderWidth: StyleSheet.hairlineWidth,
    alignItems: "center",
    justifyContent: "center",
  },
  row: {
    flexDirection: "row",
    alignItems: "center",
    gap: spacing.sm,
  },
  label: {
    fontWeight: "700",
    letterSpacing: 0.2,
  },
});
