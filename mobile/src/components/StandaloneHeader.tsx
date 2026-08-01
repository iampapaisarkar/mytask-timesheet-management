import type { ReactNode } from "react";
import { Pressable, StyleSheet, Text, View } from "react-native";
import { useNavigation } from "@react-navigation/native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { spacing, typography } from "@mytask/theme";
import { useThemeStore } from "../store/themeStore";
import { BackChevronIcon } from "../ui/icons";
import { touchTarget } from "../ui/tokens";
import { triggerHaptic } from "../utils/haptics";

type Props = {
  title: string;
  onBack?: () => void;
  /** Optional trailing accessory (e.g. actions). */
  right?: ReactNode;
};

/**
 * Minimal standalone chrome: ← Back + title.
 * Used when OrgHeader + tab bar are hidden (org stack detail screens).
 */
export function StandaloneHeader({ title, onBack, right }: Props) {
  const insets = useSafeAreaInsets();
  const navigation = useNavigation();
  const c = useThemeStore((s) => s.colors);

  function handleBack() {
    void triggerHaptic("selection");
    if (onBack) {
      onBack();
      return;
    }
    if (navigation.canGoBack()) {
      navigation.goBack();
    }
  }

  return (
    <View
      style={[
        styles.wrap,
        {
          paddingTop: Math.max(insets.top, spacing.sm),
          backgroundColor: c.surface,
          borderBottomColor: c.border,
        },
      ]}
    >
      <View style={styles.row}>
        <Pressable
          accessibilityRole="button"
          accessibilityLabel="Go back"
          onPress={handleBack}
          hitSlop={8}
          style={({ pressed }) => [
            styles.backBtn,
            { opacity: pressed ? 0.65 : 1 },
          ]}
        >
          <BackChevronIcon color={c.primary} size={20} />
          <Text style={[styles.backLabel, { color: c.primary }]}>Back</Text>
        </Pressable>

        <Text
          style={[styles.title, { color: c.text }]}
          numberOfLines={1}
          accessibilityRole="header"
        >
          {title}
        </Text>

        {right ? <View style={styles.right}>{right}</View> : null}
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  wrap: {
    borderBottomWidth: StyleSheet.hairlineWidth,
    paddingBottom: 10,
    paddingHorizontal: spacing.md,
  },
  row: {
    minHeight: touchTarget.min,
    flexDirection: "row",
    alignItems: "center",
    gap: 10,
  },
  backBtn: {
    flexDirection: "row",
    alignItems: "center",
    gap: 2,
    minHeight: touchTarget.min,
    paddingRight: 4,
  },
  backLabel: {
    fontSize: typography.sizes.md,
    fontWeight: "600",
  },
  title: {
    flex: 1,
    minWidth: 0,
    fontSize: typography.sizes.lg,
    fontWeight: "700",
    letterSpacing: -0.2,
  },
  right: {
    marginLeft: spacing.sm,
  },
});
