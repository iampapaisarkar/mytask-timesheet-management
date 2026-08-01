import {
  FlatList,
  Linking,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
} from "react-native";
import { useBillingHistory, useSyncSubscription } from "@mytask/hooks";
import { spacing } from "@mytask/theme";
import { getErrorMessage } from "@mytask/utils";
import type { BillingHistoryItem } from "@mytask/types";
import { SkeletonList } from "../components/Skeleton";
import { useThemeStore } from "../store/themeStore";
import { useToastStore } from "../store/toastStore";

export function BillingHistoryScreen() {
  const c = useThemeStore((s) => s.colors);
  const toast = useToastStore();
  const sync = useSyncSubscription();
  const { data, isLoading, isError, refetch } = useBillingHistory({
    rows_per_page: 50,
  });
  const rows = (data?.data || []) as BillingHistoryItem[];

  if (isLoading) {
    return (
      <View style={{ flex: 1, backgroundColor: c.bg }}>
        <SkeletonList rows={6} />
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
      <TouchableOpacity
        style={[styles.syncBtn, { backgroundColor: c.primary }]}
        disabled={sync.isPending}
        onPress={async () => {
          try {
            await sync.mutateAsync();
            toast.success("Invoices synced");
            void refetch();
          } catch (err) {
            toast.error("Sync failed", getErrorMessage(err));
          }
        }}
      >
        <Text style={{ color: "#fff", fontWeight: "700", textAlign: "center" }}>
          {sync.isPending ? "Syncing…" : "Sync invoices from Stripe"}
        </Text>
      </TouchableOpacity>

      <FlatList
        data={rows}
        keyExtractor={(item) => String(item.id)}
        showsHorizontalScrollIndicator={false}
        contentContainerStyle={{ padding: spacing.lg, paddingBottom: 40 }}
        ListEmptyComponent={
          <Text style={{ color: c.muted, textAlign: "center", marginTop: 40 }}>
            No invoices yet. Tap sync if you already paid.
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
              {item.plan?.name || "Pro"} ·{" "}
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
            {item.invoice_pdf_url ? (
              <TouchableOpacity
                onPress={() => void Linking.openURL(item.invoice_pdf_url!)}
                style={[styles.download, { backgroundColor: c.primary }]}
              >
                <Text style={{ color: "#fff", fontWeight: "700" }}>
                  Download PDF
                </Text>
              </TouchableOpacity>
            ) : null}
            {item.hosted_invoice_url ? (
              <TouchableOpacity
                onPress={() => void Linking.openURL(item.hosted_invoice_url!)}
                style={{ marginTop: 8 }}
              >
                <Text style={{ color: c.primary, fontWeight: "600" }}>
                  View invoice
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
  syncBtn: {
    marginHorizontal: spacing.lg,
    marginTop: spacing.md,
    borderRadius: 12,
    paddingVertical: 12,
  },
  card: {
    borderRadius: 14,
    borderWidth: 1,
    padding: 14,
    marginBottom: 10,
  },
  download: {
    marginTop: 10,
    borderRadius: 10,
    paddingVertical: 10,
    alignItems: "center",
  },
});
