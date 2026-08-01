import type { ReactNode } from "react";
import { Pressable, StyleSheet, View } from "react-native";
import Animated, {
  useAnimatedStyle,
  useSharedValue,
  withSpring,
} from "react-native-reanimated";
import { useThemeStore } from "../../store/themeStore";
import { triggerHaptic } from "../../utils/haptics";
import { motion, touchTarget } from "../tokens";

type Props = {
  icon: ReactNode;
  onPress?: () => void;
  accessibilityLabel: string;
  soft?: boolean;
  size?: number;
  disabled?: boolean;
};

const AnimatedPressable = Animated.createAnimatedComponent(Pressable);

export function IconButton({
  icon,
  onPress,
  accessibilityLabel,
  soft = false,
  size = touchTarget.min,
  disabled = false,
}: Props) {
  const c = useThemeStore((s) => s.colors);
  const scale = useSharedValue(1);
  const animStyle = useAnimatedStyle(() => ({
    transform: [{ scale: scale.value }],
  }));

  return (
    <AnimatedPressable
      accessibilityRole="button"
      accessibilityLabel={accessibilityLabel}
      disabled={disabled}
      onPress={() => {
        void triggerHaptic("selection");
        onPress?.();
      }}
      onPressIn={() => {
        scale.value = withSpring(0.92, motion.spring.snappy);
      }}
      onPressOut={() => {
        scale.value = withSpring(1, motion.spring.snappy);
      }}
      style={[
        styles.btn,
        {
          width: size,
          height: size,
          borderRadius: size / 2,
          backgroundColor: soft ? c.bgMuted : "transparent",
          opacity: disabled ? 0.4 : 1,
        },
        animStyle,
      ]}
      hitSlop={6}
    >
      <View>{icon}</View>
    </AnimatedPressable>
  );
}

const styles = StyleSheet.create({
  btn: {
    alignItems: "center",
    justifyContent: "center",
  },
});
