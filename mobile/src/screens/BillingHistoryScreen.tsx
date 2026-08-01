import { FlatList, Linking, StyleSheet, Text, View } from "react-native";
import { useBillingHistory, useSyncSubscription } from "@mytask/hooks";
import { spacing } from "@mytask/theme";
import { getErrorMessage } from "@mytask/utils";
import type { BillingHistoryItem } from "@mytask/types";
import { SkeletonList } from "../components/Skeleton";
import { useThemeStore } from "../store/themeStore";
import { useToastStore } from "../store/toastStore";
import {
  Button,
  Card,
  EmptyState,
  ErrorState,
  ScreenHeader,
  WalletIcon,
} from "../ui";

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
      <View style={{ flex: 1, backgroundColor: c.bg }}>
        <ErrorState
          title="Failed to load billing history"
          onRetry={() => refetch()}
        />
      </View>
    );
  }

  return (
    <View style={[styles.container, { backgroundColor: c.bg }]}>
      <View style={styles.header}>
        <ScreenHeader title="Billing history" subtitle="Invoices and receipts" />
        <Button
          title={sync.isPending ? "Syncing…" : "Sync invoices from Stripe"}
          loading={sync.isPending}
          onPress={async () => {
            try {
              await sync.mutateAsync();
              toast.success("Invoices synced");
              void refetch();
            } catch (err) {
              toast.error("Sync failed", getErrorMessage(err));
            }
          }}
        />
      </View>

      <FlatList
        data={rows}
        keyExtractor={(item) => String(item.id)}
        showsHorizontalScrollIndicator={false}
        contentContainerStyle={styles.list}
        ListEmptyComponent={
          <EmptyState
            icon={<WalletIcon color={c.primary} size={28} />}
            title="No invoices yet"
            description="Tap sync if you already paid."
          />
        }
        renderItem={({ item }) => (
          <Card style={styles.card}>
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
              <Button
                title="Download PDF"
                variant="soft"
                onPress={() => void Linking.openURL(item.invoice_pdf_url!)}
                style={styles.download}
              />
            ) : null}
            {item.hosted_invoice_url ? (
              <Button
                title="View invoice"
                variant="ghost"
                onPress={() => void Linking.openURL(item.hosted_invoice_url!)}
                style={styles.viewLink}
              />
            ) : null}
          </Card>
        )}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1 },
  header: {
    paddingHorizontal: spacing.lg,
    paddingTop: spacing.md,
    gap: spacing.sm,
  },
  list: { padding: spacing.lg, paddingTop: spacing.sm, paddingBottom: 40 },
  card: { marginBottom: spacing.sm },
  download: { marginTop: 10 },
  viewLink: { marginTop: 4, alignSelf: "flex-start", paddingHorizontal: 0 },
});
