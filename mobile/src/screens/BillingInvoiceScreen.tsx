import {
  Platform,
  ScrollView,
  Share,
  StyleSheet,
  Text,
  View,
} from "react-native";
import { useMutation, useQuery } from "@tanstack/react-query";
import type { NativeStackScreenProps } from "@react-navigation/native-stack";
import { subscriptionApi } from "@mytask/api";
import { radii, spacing, typography } from "@mytask/theme";
import { getErrorMessage } from "@mytask/utils";
import type { BillingHistoryItem } from "@mytask/types";
import { SkeletonList } from "../components/Skeleton";
import type { RootStackParamList } from "../navigation/types";
import { useThemeStore } from "../store/themeStore";
import { useToastStore } from "../store/toastStore";
import { Button, Card, ErrorState, ScreenHeader } from "../ui";

type Props = NativeStackScreenProps<RootStackParamList, "BillingInvoice">;

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
  return d.toLocaleDateString(undefined, {
    day: "2-digit",
    month: "short",
    year: "numeric",
  });
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

/** Same content model as web + myTask PDF (not Stripe). */
export function BillingInvoiceScreen({ navigation, route }: Props) {
  const { id } = route.params;
  const c = useThemeStore((s) => s.colors);
  const toast = useToastStore();

  const { data, isLoading, isError, refetch } = useQuery({
    queryKey: ["subscription", "invoice", id],
    queryFn: async ({ signal }) => {
      const res = await subscriptionApi.getInvoice(id, { signal });
      return res.data.data as BillingHistoryItem;
    },
  });

  const downloadMutation = useMutation({
    mutationFn: async () => {
      const res = await subscriptionApi.downloadInvoicePdf(id);
      const base64 = await blobLikeToBase64(res.data);
      const url = `data:application/pdf;base64,${base64}`;
      const title = `${data?.invoice_number || `INV-${id}`}.pdf`;
      await Share.share(
        Platform.OS === "ios"
          ? { url, title }
          : {
              message: `Invoice ${data?.invoice_number || id} PDF ready.`,
              title,
              url,
            },
      );
    },
    onSuccess: () => toast.success("Share opened", "Invoice PDF ready"),
    onError: (err) => toast.error("Download failed", getErrorMessage(err)),
  });

  if (isLoading) {
    return (
      <View style={{ flex: 1, backgroundColor: c.bg }}>
        <SkeletonList rows={4} />
      </View>
    );
  }

  if (isError || !data) {
    return (
      <View style={{ flex: 1, backgroundColor: c.bg }}>
        <ErrorState
          title="Failed to load invoice"
          onRetry={() => void refetch()}
        />
      </View>
    );
  }

  const invoiceNo = data.invoice_number || `INV-${data.id}`;
  const amount = formatMoney(data.amount_cents, data.currency);
  const description =
    data.line_description || `${data.plan?.name || "Pro"} subscription`;

  return (
    <ScrollView
      style={{ flex: 1, backgroundColor: c.bg }}
      contentContainerStyle={styles.scroll}
    >
      <View style={styles.header}>
        <ScreenHeader
          title={invoiceNo}
          subtitle="myTask subscription invoice"
        />
        <View style={styles.headerActions}>
          <Button
            title={downloadMutation.isPending ? "Preparing…" : "Download PDF"}
            variant="soft"
            size="sm"
            fullWidth={false}
            loading={downloadMutation.isPending}
            onPress={() => downloadMutation.mutate()}
            style={styles.headerBtn}
          />
          <Button
            title="Back to history"
            variant="outline"
            size="sm"
            fullWidth={false}
            onPress={() => navigation.navigate("BillingHistory")}
            style={styles.headerBtn}
          />
        </View>
      </View>

      <Card style={styles.card}>
        <View style={[styles.brandBar, { backgroundColor: c.primary }]}>
          <View style={styles.brandLeft}>
            <Text style={styles.brandTitle}>myTask</Text>
            <Text style={styles.brandSub}>Subscription invoice</Text>
          </View>
          <View style={styles.brandRight}>
            <Text style={styles.invoiceNo}>{invoiceNo}</Text>
            <View style={styles.statusPill}>
              <Text style={styles.statusText}>
                {String(data.status || "").replace(/_/g, " ")}
              </Text>
            </View>
          </View>
        </View>

        <View style={styles.metaGrid}>
          <View style={[styles.metaCell, styles.metaFull]}>
            <Text style={[styles.metaLabel, { color: c.muted }]}>Bill to</Text>
            <Text style={[styles.metaValue, { color: c.text }]}>
              {data.bill_to_name || "—"}
            </Text>
            <Text style={[styles.metaHint, { color: c.muted }]}>
              {data.bill_to_email || "—"}
            </Text>
          </View>
          <View style={styles.metaCell}>
            <Text style={[styles.metaLabel, { color: c.muted }]}>Paid on</Text>
            <Text style={[styles.metaValue, { color: c.text }]}>
              {formatDate(data.paid_at || data.created_at)}
            </Text>
          </View>
          <View style={styles.metaCell}>
            <Text style={[styles.metaLabel, { color: c.muted }]}>Period</Text>
            <Text style={[styles.metaValue, { color: c.text }]}>
              {formatDate(data.period_start)} → {formatDate(data.period_end)}
            </Text>
          </View>
          <View style={styles.metaCell}>
            <Text style={[styles.metaLabel, { color: c.muted }]}>Plan</Text>
            <Text style={[styles.metaValue, { color: c.text }]}>
              {data.plan?.name || "Pro"}
              {data.billing_cycle ? ` · ${data.billing_cycle}` : ""}
            </Text>
          </View>
          <View style={styles.metaCell}>
            <Text style={[styles.metaLabel, { color: c.muted }]}>Payment</Text>
            <Text style={[styles.metaValue, { color: c.text }]}>
              {data.payment_method || "Card"}
            </Text>
          </View>
        </View>

        <View style={[styles.tableHead, { backgroundColor: c.primarySoft }]}>
          <Text style={[styles.tableHeadText, { color: c.primary }]}>
            Description
          </Text>
          <Text style={[styles.tableHeadText, { color: c.primary }]}>
            Amount
          </Text>
        </View>
        <View style={[styles.tableRow, { borderBottomColor: c.border }]}>
          <Text style={[styles.tableDesc, { color: c.text }]}>
            {description}
          </Text>
          <Text style={[styles.tableAmount, { color: c.text }]}>{amount}</Text>
        </View>
        <Text style={[styles.total, { color: c.primary }]}>
          Total paid {amount}
        </Text>
        <Text style={[styles.footnote, { color: c.muted }]}>
          Generated by myTask. Card payments are processed by Stripe; this is
          your myTask billing record.
        </Text>
      </Card>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  scroll: { paddingBottom: 40 },
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
  card: {
    marginHorizontal: spacing.md,
    marginTop: spacing.sm,
    padding: 0,
    overflow: "hidden",
  },
  brandBar: {
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.md,
    flexDirection: "row",
    justifyContent: "space-between",
    gap: spacing.sm,
  },
  brandLeft: { flex: 1 },
  brandRight: { alignItems: "flex-end" },
  brandTitle: {
    color: "#fff",
    fontSize: typography.sizes.lg,
    fontWeight: "700",
  },
  brandSub: {
    marginTop: 4,
    color: "rgba(255,255,255,0.9)",
    fontSize: typography.sizes.sm,
  },
  invoiceNo: {
    color: "#fff",
    fontSize: typography.sizes.md,
    fontWeight: "700",
  },
  statusPill: {
    marginTop: 8,
    borderRadius: radii.full,
    backgroundColor: "rgba(255,255,255,0.2)",
    paddingHorizontal: 10,
    paddingVertical: 4,
  },
  statusText: {
    color: "#fff",
    fontSize: 11,
    fontWeight: "700",
    textTransform: "capitalize",
  },
  metaGrid: {
    padding: spacing.md,
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
  metaHint: {
    marginTop: 2,
    fontSize: typography.sizes.xs,
  },
  tableHead: {
    flexDirection: "row",
    justifyContent: "space-between",
    paddingHorizontal: spacing.md,
    paddingVertical: 10,
  },
  tableHeadText: {
    fontSize: 11,
    fontWeight: "700",
    textTransform: "uppercase",
  },
  tableRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    gap: spacing.sm,
    paddingHorizontal: spacing.md,
    paddingVertical: 14,
    borderBottomWidth: StyleSheet.hairlineWidth,
  },
  tableDesc: { flex: 1, fontSize: typography.sizes.sm },
  tableAmount: { fontSize: typography.sizes.sm, fontWeight: "600" },
  total: {
    paddingHorizontal: spacing.md,
    paddingTop: spacing.md,
    textAlign: "right",
    fontSize: typography.sizes.lg,
    fontWeight: "700",
  },
  footnote: {
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.md,
    fontSize: typography.sizes.xs,
    lineHeight: 18,
  },
});
