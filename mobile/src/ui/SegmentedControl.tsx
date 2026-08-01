import { Pressable, StyleSheet, Text, View } from "react-native";
import { radii, spacing } from "@mytask/theme";
import { useThemeStore } from "../store/themeStore";
import { touchTarget } from "./tokens";

export type SegmentOption<T extends string> = {
  value: T;
  label: string;
};

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
        { backgroundColor: c.bg, borderColor: c.border },
      ]}
      accessibilityRole="tablist"
    >
      {options.map((opt) => {
        const active = opt.value === value;
        return (
          <Pressable
            key={opt.value}
            accessibilityRole="tab"
            accessibilityState={{ selected: active }}
            onPress={() => onChange(opt.value)}
            style={[
              styles.item,
              active && {
                backgroundColor: c.surface,
                borderColor: c.border,
              },
            ]}
          >
            <Text
              style={[
                styles.label,
                { color: active ? c.text : c.muted },
                active && styles.labelActive,
              ]}
            >
              {opt.label}
            </Text>
          </Pressable>
        );
      })}
    </View>
  );
}

const styles = StyleSheet.create({
  track: {
    flexDirection: "row",
    borderRadius: radii.md,
    borderWidth: StyleSheet.hairlineWidth,
    padding: 3,
    gap: 2,
  },
  item: {
    flex: 1,
    minHeight: touchTarget.min,
    alignItems: "center",
    justifyContent: "center",
    borderRadius: radii.sm,
    borderWidth: StyleSheet.hairlineWidth,
    borderColor: "transparent",
    paddingHorizontal: spacing.sm,
  },
  label: { fontSize: 13, fontWeight: "600" },
  labelActive: { fontWeight: "700" },
});
