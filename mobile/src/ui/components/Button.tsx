import { type ReactNode, useCallback } from "react";
import {
  ActivityIndicator,
  Platform,
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

const FILLED_VARIANTS: ButtonVariant[] = [
  "primary",
  "secondary",
  "danger",
  "soft",
];

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
  const isFilled = FILLED_VARIANTS.includes(variant);

  const palette = (() => {
    switch (variant) {
      case "secondary":
        return {
          bg: c.secondary,
          text: c.white,
          border: c.secondary,
          borderWidth: StyleSheet.hairlineWidth,
        };
      case "outline":
        return {
          // Solid surface fill — Android elevation on transparent looks muddy
          bg: c.surface,
          text: c.text,
          border: c.borderStrong,
          borderWidth: Platform.OS === "android" ? 1 : StyleSheet.hairlineWidth,
        };
      case "ghost":
        return {
          bg: "transparent",
          text: c.primary,
          border: "transparent",
          borderWidth: 0,
        };
      case "danger":
        return {
          bg: c.negative,
          text: c.white,
          border: c.negative,
          borderWidth: StyleSheet.hairlineWidth,
        };
      case "soft":
        return {
          bg: c.primarySoft,
          text: c.secondary,
          border: "transparent",
          borderWidth: 0,
        };
      default:
        return {
          bg: c.primary,
          text: c.white,
          border: c.primary,
          borderWidth: StyleSheet.hairlineWidth,
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
        isFilled ? elevation.soft : elevation.none,
        {
          backgroundColor: palette.bg,
          borderColor: palette.border,
          borderWidth: palette.borderWidth,
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
          {leftIcon ? <View style={styles.iconSlot}>{leftIcon}</View> : null}
          <Text
            style={[
              styles.label,
              { color: palette.text, fontSize: pad.font },
            ]}
            numberOfLines={1}
            ellipsizeMode="tail"
          >
            {title}
          </Text>
          {rightIcon ? <View style={styles.iconSlot}>{rightIcon}</View> : null}
        </View>
      )}
    </AnimatedPressable>
  );
}

const styles = StyleSheet.create({
  base: {
    minHeight: touchTarget.min,
    borderRadius: radii.lg,
    alignItems: "center",
    justifyContent: "center",
    overflow: Platform.OS === "android" ? "hidden" : "visible",
  },
  row: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: spacing.sm,
    maxWidth: "100%",
  },
  iconSlot: {
    width: 20,
    height: 20,
    alignItems: "center",
    justifyContent: "center",
  },
  label: {
    flexShrink: 1,
    fontWeight: "700",
    letterSpacing: 0.2,
    textAlign: "center",
    includeFontPadding: false,
    textAlignVertical: "center",
  },
});
