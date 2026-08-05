import { Pressable, StyleSheet, Text, View } from "react-native";
import Animated, {
  useAnimatedStyle,
  useSharedValue,
  withSpring,
} from "react-native-reanimated";
import { radii, spacing } from "@mytask/theme";
import { useThemeStore } from "../store/themeStore";
import { triggerHaptic } from "../utils/haptics";
import { motion, touchTarget } from "./tokens";

export type SegmentOption<T extends string> = {
  value: T;
  label: string;
};

const AnimatedPressable = Animated.createAnimatedComponent(Pressable);

function SegmentItem<T extends string>({
  option,
  active,
  onPress,
}: {
  option: SegmentOption<T>;
  active: boolean;
  onPress: () => void;
}) {
  const c = useThemeStore((s) => s.colors);
  const scale = useSharedValue(1);
  const animStyle = useAnimatedStyle(() => ({
    transform: [{ scale: scale.value }],
  }));

  return (
    <AnimatedPressable
      accessibilityRole="tab"
      accessibilityState={{ selected: active }}
      accessibilityLabel={option.label}
      onPress={() => {
        void triggerHaptic("selection");
        onPress();
      }}
      onPressIn={() => {
        scale.value = withSpring(0.97, motion.spring.snappy);
      }}
      onPressOut={() => {
        scale.value = withSpring(1, motion.spring.snappy);
      }}
      style={[
        styles.item,
        {
          backgroundColor: active ? c.primary : "transparent",
        },
        animStyle,
      ]}
    >
      <Text
        style={[
          styles.label,
          { color: active ? c.white : c.muted },
          active && styles.labelActive,
        ]}
        numberOfLines={1}
        includeFontPadding={false}
      >
        {option.label}
      </Text>
    </AnimatedPressable>
  );
}

export function SegmentedControl<T extends string>({
  value,
  options,
  onChange,
}: {
  value: T;
  options: SegmentOption<T>[];
  onChange: (next: T) => void;
}) {
  const c = useThemeStore((s) => s.colors);

  return (
    <View
      style={[
        styles.track,
        {
          backgroundColor: c.bgMuted,
          borderColor: c.border,
        },
      ]}
      accessibilityRole="tablist"
    >
      {options.map((opt) => (
        <SegmentItem
          key={opt.value}
          option={opt}
          active={opt.value === value}
          onPress={() => onChange(opt.value)}
        />
      ))}
    </View>
  );
}

const styles = StyleSheet.create({
  track: {
    flexDirection: "row",
    borderRadius: radii.lg,
    padding: 4,
    gap: 4,
    borderWidth: StyleSheet.hairlineWidth,
  },
  item: {
    flex: 1,
    minHeight: touchTarget.min - 4,
    alignItems: "center",
    justifyContent: "center",
    borderRadius: radii.md,
    paddingHorizontal: spacing.sm,
    paddingVertical: 8,
  },
  label: {
    fontSize: 13,
    fontWeight: "600",
    textAlign: "center",
  },
  labelActive: { fontWeight: "700" },
});
