import { StyleSheet, Text, View } from "react-native";
import { spacing, typography } from "@mytask/theme";
import { useThemeStore } from "../store/themeStore";
import { Button } from "../ui";

type Props = {
  currentPage: number;
  totalPages: number;
  isFetching?: boolean;
  hasRows: boolean;
  onPrev: () => void;
  onNext: () => void;
};

export function ListPager({
  currentPage,
  totalPages,
  isFetching,
  hasRows,
  onPrev,
  onNext,
}: Props) {
  const c = useThemeStore((s) => s.colors);
  if (!hasRows) return null;

  return (
    <View style={styles.pager}>
      <Text style={[styles.label, { color: c.muted }]}>
        Page {currentPage} of {totalPages}
      </Text>
      <View style={styles.row}>
        <View style={styles.half}>
          <Button
            title="Previous"
            variant="outline"
            size="sm"
            disabled={currentPage <= 1 || isFetching}
            onPress={onPrev}
          />
        </View>
        <View style={styles.half}>
          <Button
            title="Next"
            variant="soft"
            size="sm"
            disabled={currentPage >= totalPages || isFetching}
            onPress={onNext}
          />
        </View>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  pager: { paddingVertical: spacing.md },
  label: {
    textAlign: "center",
    marginBottom: spacing.sm,
    fontSize: typography.sizes.xs,
    fontWeight: "600",
  },
  row: {
    flexDirection: "row",
    gap: spacing.sm,
  },
  half: { flex: 1 },
});
