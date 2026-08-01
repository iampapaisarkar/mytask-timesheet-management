import { Pressable, ScrollView, StyleSheet, Text, View } from "react-native";
import { radii, spacing, typography } from "@mytask/theme";
import { useThemeStore } from "../../store/themeStore";
import { triggerHaptic } from "../../utils/haptics";
import { touchTarget } from "../tokens";

export type FilterChipOption<T extends string> = {
  value: T;
  label: string;
  count?: number;
};

type Props<T extends string> = {
  value: T;
  options: FilterChipOption<T>[];
  onChange: (next: T) => void;
  scrollable?: boolean;
};

export function FilterChips<T extends string>({
  value,
  options,
  onChange,
  scrollable = true,
}: Props<T>) {
  const c = useThemeStore((s) => s.colors);

  const content = options.map((opt) => {
    const active = opt.value === value;
    return (
      <Pressable
        key={opt.value}
        accessibilityRole="button"
        accessibilityState={{ selected: active }}
        accessibilityLabel={opt.label}
        onPress={() => {
          void triggerHaptic("selection");
          onChange(opt.value);
        }}
        style={[
          styles.chip,
          {
            backgroundColor: active ? c.primary : c.surface,
            borderColor: active ? c.primary : c.border,
          },
        ]}
      >
        <Text
          style={[
            styles.label,
            { color: active ? c.white : c.text },
          ]}
        >
          {opt.label}
          {opt.count != null ? ` (${opt.count})` : ""}
        </Text>
      </Pressable>
    );
  });

  if (!scrollable) {
    return <View style={styles.wrap}>{content}</View>;
  }

  return (
    <ScrollView
      horizontal
      showsHorizontalScrollIndicator={false}
      contentContainerStyle={styles.wrap}
    >
      {content}
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  wrap: {
    flexDirection: "row",
    gap: spacing.sm,
    paddingVertical: 2,
  },
  chip: {
    minHeight: touchTarget.min - 8,
    paddingHorizontal: 14,
    borderRadius: radii.full,
    borderWidth: StyleSheet.hairlineWidth,
    alignItems: "center",
    justifyContent: "center",
  },
  label: {
    fontSize: typography.sizes.sm,
    fontWeight: "700",
  },
});
