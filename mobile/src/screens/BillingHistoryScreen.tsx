import { FlatList, Platform, Share, StyleSheet, Text, View } from "react-native";
import { useMutation } from "@tanstack/react-query";
import type { NativeStackScreenProps } from "@react-navigation/native-stack";
import { useBillingHistory, useSyncSubscription } from "@mytask/hooks";
import { subscriptionApi } from "@mytask/api";
import { radii, spacing, typography } from "@mytask/theme";
import { getErrorMessage } from "@mytask/utils";
import type { BillingHistoryItem } from "@mytask/types";
import { SkeletonList } from "../components/Skeleton";
import type { RootStackParamList } from "../navigation/types";
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

type Props = NativeStackScreenProps<RootStackParamList, "BillingHistory">;

function formatMoney(cents: number, currency = "usd") {
  return new Intl.NumberFormat("en-US", {
    style: "currency",
    currency: (currency || "usd").toUpperCase(),
  }).format(cents / 100);
}

function formatDate(iso?: string | null) {
  if (!iso) return "—";
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) return "—";
  return d.toLocaleDateString();
}

function bytesToBase64(bytes: Uint8Array): string {
  const chars =
    "ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789+/";
  let result = "";
  const len = bytes.length;
  for (let i = 0; i < len; i += 3) {
    const a = bytes[i];
    const b = i + 1 < len ? bytes[i + 1] : 0;
    const c = i + 2 < len ? bytes[i + 2] : 0;
    result += chars[a >> 2];
    result += chars[((a & 3) << 4) | (b >> 4)];
    result += i + 1 < len ? chars[((b & 15) << 2) | (c >> 6)] : "=";
    result += i + 2 < len ? chars[c & 63] : "=";
  }
  return result;
}

async function blobLikeToBase64(data: unknown): Promise<string> {
  if (data instanceof ArrayBuffer) {
    return bytesToBase64(new Uint8Array(data));
  }
  if (typeof Blob !== "undefined" && data instanceof Blob) {
    const buffer = await new Response(data).arrayBuffer();
    return bytesToBase64(new Uint8Array(buffer));
  }
  if (data && typeof data === "object" && "data" in (data as object)) {
    const nested = (data as { data?: unknown }).data;
    if (nested instanceof Uint8Array) return bytesToBase64(nested);
    if (Array.isArray(nested)) return bytesToBase64(Uint8Array.from(nested));
  }
  if (data instanceof Uint8Array) return bytesToBase64(data);
  throw new Error("Unsupported PDF response type");
}

function InvoiceActions({
  item,
  onView,
}: {
  item: BillingHistoryItem;
  onView: () => void;
}) {
  const toast = useToastStore();
  const downloadMutation = useMutation({
    mutationFn: async () => {
      const res = await subscriptionApi.downloadInvoicePdf(item.id);
      const base64 = await blobLikeToBase64(res.data);
      const url = `data:application/pdf;base64,${base64}`;
      const title = `${item.invoice_number || `INV-${item.id}`}.pdf`;
      await Share.share(
        Platform.OS === "ios"
          ? { url, title }
          : {
              message: `Invoice ${item.invoice_number || item.id} PDF ready.`,
              title,
              url,
            },
      );
    },
    onSuccess: () => toast.success("Share opened", "Invoice PDF ready"),
    onError: (err) => toast.error("Download failed", getErrorMessage(err)),
  });

  return (
    <View style={styles.actions}>
      <Button
        title={downloadMutation.isPending ? "Preparing…" : "Download PDF"}
        variant="soft"
        size="sm"
        fullWidth={false}
        loading={downloadMutation.isPending}
        onPress={() => downloadMutation.mutate()}
      />
      <Button
        title="View invoice"
        variant="ghost"
        size="sm"
        fullWidth={false}
        onPress={onView}
        style={styles.viewBtn}
      />
    </View>
  );
}

export function BillingHistoryScreen({ navigation }: Props) {
  const c = useThemeStore((s) => s.colors);
  const toast = useToastStore();
  const sync = useSyncSubscription();
  const { data, isLoading, isError, refetch } = useBillingHistory({
    rows_per_page: 50,
  });
  const rows = (data?.data || []) as BillingHistoryItem[];

  async function handleSync() {
    try {
      await sync.mutateAsync();
      toast.success("Invoices synced from Stripe");
      void refetch();
    } catch (err) {
      toast.error("Sync failed", getErrorMessage(err));
    }
  }

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
          onRetry={() => void refetch()}
        />
      </View>
    );
  }

  return (
    <View style={[styles.container, { backgroundColor: c.bg }]}>
      <View style={styles.header}>
        <ScreenHeader
          title="Billing history"
          subtitle="Invoices and payments for your myTask subscription."
        />
        <View style={styles.headerActions}>
          <Button
            title={sync.isPending ? "Syncing…" : "Sync invoices"}
            variant="outline"
            size="sm"
            fullWidth={false}
            loading={sync.isPending}
            onPress={() => void handleSync()}
            style={styles.headerBtn}
          />
          <Button
            title="Back to subscription"
            variant="soft"
            size="sm"
            fullWidth={false}
            onPress={() => navigation.navigate("Subscription")}
            style={styles.headerBtn}
          />
        </View>
      </View>

      <FlatList
        data={rows}
        keyExtractor={(item) => String(item.id)}
        contentContainerStyle={styles.list}
        ListEmptyComponent={
          <EmptyState
            icon={<WalletIcon color={c.primary} size={28} />}
            title="No invoices yet"
            description="If you already paid, tap Sync invoices. New Pro payments appear here automatically."
            actionLabel={sync.isPending ? "Syncing…" : "Sync invoices"}
            onAction={() => {
              if (sync.isPending) return;
              void handleSync();
            }}
          />
        }
        renderItem={({ item }) => (
          <Card style={styles.card}>
            <View style={styles.cardTop}>
              <View style={styles.cardTextCol}>
                <Text style={[styles.invoiceNo, { color: c.text }]}>
                  {item.invoice_number || `INV-${item.id}`}
                </Text>
                <Text style={[styles.planName, { color: c.muted }]}>
                  {item.plan?.name || "Pro"}
                </Text>
              </View>
              <View
                style={[styles.statusPill, { backgroundColor: c.primarySoft }]}
              >
                <Text style={[styles.statusText, { color: c.primary }]}>
                  {String(item.status || "").replace(/_/g, " ")}
                </Text>
              </View>
            </View>

            <View style={styles.metaGrid}>
              <View style={styles.metaCell}>
                <Text style={[styles.metaLabel, { color: c.muted }]}>
                  Amount
                </Text>
                <Text style={[styles.metaValue, { color: c.text }]}>
                  {formatMoney(item.amount_cents, item.currency)}
                </Text>
              </View>
              <View style={styles.metaCell}>
                <Text style={[styles.metaLabel, { color: c.muted }]}>Date</Text>
                <Text style={[styles.metaValue, { color: c.text }]}>
                  {formatDate(item.paid_at || item.created_at)}
                </Text>
              </View>
              <View style={[styles.metaCell, styles.metaFull]}>
                <Text style={[styles.metaLabel, { color: c.muted }]}>
                  Payment
                </Text>
                <Text style={[styles.metaValue, { color: c.text }]}>
                  {item.payment_method || "Card"}
                </Text>
              </View>
            </View>

            <InvoiceActions
              item={item}
              onView={() =>
                navigation.navigate("BillingInvoice", { id: String(item.id) })
              }
            />
          </Card>
        )}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1 },
  header: {
    paddingHorizontal: spacing.md,
    paddingTop: spacing.md,
    gap: spacing.sm,
  },
  headerActions: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: spacing.sm,
  },
  headerBtn: { flexGrow: 1 },
  list: {
    paddingHorizontal: spacing.md,
    paddingTop: spacing.sm,
    paddingBottom: 40,
  },
  card: { marginBottom: spacing.sm },
  cardTop: {
    flexDirection: "row",
    alignItems: "flex-start",
    justifyContent: "space-between",
    gap: spacing.sm,
  },
  cardTextCol: { flex: 1, minWidth: 0 },
  invoiceNo: {
    fontWeight: "700",
    fontSize: typography.sizes.md,
  },
  planName: {
    marginTop: 2,
    fontSize: typography.sizes.sm,
  },
  statusPill: {
    borderRadius: radii.full,
    paddingHorizontal: 10,
    paddingVertical: 4,
  },
  statusText: {
    fontSize: 11,
    fontWeight: "700",
    textTransform: "capitalize",
  },
  metaGrid: {
    marginTop: spacing.md,
    flexDirection: "row",
    flexWrap: "wrap",
    gap: spacing.sm,
  },
  metaCell: { width: "47%", minWidth: 120 },
  metaFull: { width: "100%" },
  metaLabel: {
    fontSize: 11,
    fontWeight: "700",
    letterSpacing: 0.4,
    textTransform: "uppercase",
    marginBottom: 2,
  },
  metaValue: {
    fontSize: typography.sizes.sm,
    fontWeight: "600",
  },
  actions: {
    marginTop: spacing.md,
    flexDirection: "row",
    flexWrap: "wrap",
    gap: spacing.sm,
    alignItems: "center",
  },
  viewBtn: { paddingHorizontal: 0 },
});
