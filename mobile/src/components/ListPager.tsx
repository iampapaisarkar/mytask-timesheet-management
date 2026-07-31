import {
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
} from "react-native";
import { spacing } from "@mytask/theme";
import { useThemeStore } from "../store/themeStore";

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
      <Text style={{ color: c.muted, marginBottom: spacing.sm }}>
        Page {currentPage} of {totalPages}
      </Text>
      <View style={styles.pagerRow}>
        <TouchableOpacity
          disabled={currentPage <= 1 || isFetching}
          onPress={onPrev}
        >
          <Text
            style={[
              styles.link,
              {
                color: currentPage <= 1 ? c.muted : c.primary,
                opacity: currentPage <= 1 ? 0.5 : 1,
              },
            ]}
          >
            Previous
          </Text>
        </TouchableOpacity>
        <TouchableOpacity
          disabled={currentPage >= totalPages || isFetching}
          onPress={onNext}
        >
          <Text
            style={[
              styles.link,
              {
                color: currentPage >= totalPages ? c.muted : c.primary,
                opacity: currentPage >= totalPages ? 0.5 : 1,
              },
            ]}
          >
            Next
          </Text>
        </TouchableOpacity>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  pager: { alignItems: "center", paddingVertical: spacing.md },
  pagerRow: {
    flexDirection: "row",
    gap: 24,
    justifyContent: "center",
  },
  link: { fontWeight: "700", marginTop: 8 },
});
