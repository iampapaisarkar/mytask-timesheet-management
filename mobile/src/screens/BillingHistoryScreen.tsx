import {
  ActivityIndicator,
  FlatList,
  Linking,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
} from "react-native";
import { useBillingHistory } from "@mytask/hooks";
import { spacing } from "@mytask/theme";
import type { BillingHistoryItem } from "@mytask/types";
import { useThemeStore } from "../store/themeStore";

export function BillingHistoryScreen() {
  const c = useThemeStore((s) => s.colors);
  const { data, isLoading, isError, refetch } = useBillingHistory({
    rows_per_page: 50,
  });
  const rows = (data?.data || []) as BillingHistoryItem[];

  if (isLoading) {
    return (
      <View style={[styles.center, { backgroundColor: c.bg }]}>
        <ActivityIndicator color={c.primary} />
      </View>
    );
  }

  if (isError) {
    return (
      <View style={[styles.center, { backgroundColor: c.bg }]}>
        <Text style={{ color: c.text }}>Failed to load billing history</Text>
        <TouchableOpacity onPress={() => refetch()}>
          <Text style={{ color: c.primary, marginTop: 8 }}>Try again</Text>
        </TouchableOpacity>
      </View>
    );
  }

  return (
    <View style={[styles.container, { backgroundColor: c.bg }]}>
      <FlatList
        data={rows}
        keyExtractor={(item) => String(item.id)}
        contentContainerStyle={{ padding: spacing.lg, paddingBottom: 40 }}
        ListEmptyComponent={
          <Text style={{ color: c.muted, textAlign: "center", marginTop: 40 }}>
            No invoices yet
          </Text>
        }
        renderItem={({ item }) => (
          <View
            style={[
              styles.card,
              { backgroundColor: c.surface, borderColor: c.border },
            ]}
          >
            <Text style={{ color: c.text, fontWeight: "700" }}>
              {item.invoice_number || `INV-${item.id}`}
            </Text>
            <Text style={{ color: c.muted, marginTop: 4 }}>
              {item.plan?.name || "—"} ·{" "}
              {new Intl.NumberFormat("en-US", {
                style: "currency",
                currency: (item.currency || "usd").toUpperCase(),
              }).format(item.amount_cents / 100)}
            </Text>
            <Text style={{ color: c.muted, marginTop: 2 }}>
              {item.status}
              {item.paid_at
                ? ` · ${new Date(item.paid_at).toLocaleDateString()}`
                : null}
            </Text>
            {item.hosted_invoice_url ? (
              <TouchableOpacity
                onPress={() => void Linking.openURL(item.hosted_invoice_url!)}
                style={{ marginTop: 8 }}
              >
                <Text style={{ color: c.primary, fontWeight: "600" }}>
                  Open invoice
                </Text>
              </TouchableOpacity>
            ) : null}
            {item.invoice_pdf_url ? (
              <TouchableOpacity
                onPress={() => void Linking.openURL(item.invoice_pdf_url!)}
                style={{ marginTop: 6 }}
              >
                <Text style={{ color: c.primary, fontWeight: "600" }}>
                  Download PDF
                </Text>
              </TouchableOpacity>
            ) : null}
          </View>
        )}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1 },
  center: { flex: 1, alignItems: "center", justifyContent: "center" },
  card: {
    borderRadius: 14,
    borderWidth: 1,
    padding: 14,
    marginBottom: 10,
  },
});
