import { Linking, ScrollView, StyleSheet, Text, View } from "react-native";
import { useNavigation } from "@react-navigation/native";
import type { NativeStackNavigationProp } from "@react-navigation/native-stack";
import {
  useBillingPortal,
  useCancelSubscription,
  useCurrentSubscription,
  useSyncSubscription,
} from "@mytask/hooks";
import { spacing } from "@mytask/theme";
import { getErrorMessage } from "@mytask/utils";
import type { RootStackParamList } from "../navigation/RootNavigator";
import { SkeletonDetail } from "../components/Skeleton";
import { useThemeStore } from "../store/themeStore";
import { useToastStore } from "../store/toastStore";
import {
  Button,
  Card,
  Divider,
  ErrorState,
  ScreenHeader,
  SectionHeader,
  StatCard,
} from "../ui";

function formatDate(value?: string | null) {
  if (!value) return "—";
  const d = new Date(value);
  if (Number.isNaN(d.getTime())) return "—";
  return d.toLocaleString(undefined, {
    dateStyle: "medium",
    timeStyle: "short",
  });
}

function formatDateOnly(value?: string | null) {
  if (!value) return "—";
  const d = new Date(value);
  if (Number.isNaN(d.getTime())) return "—";
  return d.toLocaleDateString(undefined, {
    weekday: "short",
    year: "numeric",
    month: "short",
    day: "numeric",
  });
}

export function SubscriptionScreen() {
  const navigation =
    useNavigation<NativeStackNavigationProp<RootStackParamList>>();
  const c = useThemeStore((s) => s.colors);
  const toast = useToastStore();
  const { data, isLoading, isError, refetch } = useCurrentSubscription();
  const portal = useBillingPortal();
  const cancelSub = useCancelSubscription();
  const sync = useSyncSubscription();

  if (isLoading) {
    return (
      <View style={{ flex: 1, backgroundColor: c.bg }}>
        <SkeletonDetail />
      </View>
    );
  }

  if (isError || !data) {
    return (
      <View style={{ flex: 1, backgroundColor: c.bg }}>
        <ErrorState
          title="Failed to load subscription"
          onRetry={() => refetch()}
        />
      </View>
    );
  }

  const usage = data.usage?.usage;
  const detailRows: Array<{ label: string; value: string }> = [
    { label: "Plan", value: data.plan.name },
    {
      label: "Billing cycle",
      value: data.billing_interval_label || data.billing_interval,
    },
    {
      label: "Price",
      value:
        data.billing_interval === "none"
          ? `${data.price_label || "$0"} (free)`
          : `${data.price_label || "—"} / ${data.billing_interval}`,
    },
    { label: "Status", value: data.status },
    { label: "Payment", value: data.payment_status },
    { label: "Period starts", value: formatDate(data.current_period_start) },
    { label: "Period ends", value: formatDate(data.current_period_end) },
  ];

  if (data.is_pro && !data.cancel_at_period_end) {
    detailRows.push({
      label: "Next billing date",
      value: formatDateOnly(data.next_billing_date || data.current_period_end),
    });
    if (data.days_until_period_end != null) {
      detailRows.push({
        label: "Days until renewal",
        value: `${data.days_until_period_end} day(s)`,
      });
    }
  }

  if (data.cancel_at_period_end) {
    detailRows.push({
      label: "Cancels on",
      value: formatDateOnly(data.access_ends_at || data.current_period_end),
    });
    detailRows.push({
      label: "Access until",
      value: formatDate(data.access_ends_at || data.current_period_end),
    });
    if (data.days_until_period_end != null) {
      detailRows.push({
        label: "Days left on Pro",
        value: `${data.days_until_period_end} day(s)`,
      });
    }
    detailRows.push({
      label: "After cancel",
      value: "Downgrade to Free (data kept)",
    });
  }

  if (data.canceled_at) {
    detailRows.push({ label: "Cancelled at", value: formatDate(data.canceled_at) });
  }
  if (data.stripe_subscription_id) {
    detailRows.push({
      label: "Stripe ID",
      value: data.stripe_subscription_id,
    });
  }

  return (
    <ScrollView
      style={{ flex: 1, backgroundColor: c.bg }}
      contentContainerStyle={styles.pad}
    >
      <ScreenHeader title="Subscription" subtitle="Plan, billing, and usage" />

      {data.cancel_at_period_end ? (
        <Card
          style={styles.card}
          accentBorder={c.warning}
        >
          <View
            style={[styles.bannerFill, { backgroundColor: c.warningSoft }]}
          >
            <Text style={{ color: c.warningText, fontWeight: "700" }}>
              Cancellation scheduled
            </Text>
            <Text style={{ color: c.warningText, marginTop: 6 }}>
              Pro access until{" "}
              {formatDateOnly(data.access_ends_at || data.current_period_end)}
              {data.days_until_period_end != null
                ? ` (${data.days_until_period_end} day(s) left)`
                : ""}
              . Then Free limits apply.
            </Text>
          </View>
        </Card>
      ) : null}

      {!data.is_pro && data.end_reason_message ? (
        <Card style={styles.card} accentBorder={c.negative}>
          <View
            style={[styles.bannerFill, { backgroundColor: c.negativeSoft }]}
          >
            <Text style={{ color: c.negativeText, fontWeight: "700" }}>
              {data.end_reason === "payment_failed" || data.end_reason === "unpaid"
                ? "Pro disabled — payment issue"
                : "Moved to Free plan"}
            </Text>
            <Text style={{ color: c.negativeText, marginTop: 6, lineHeight: 20 }}>
              {data.end_reason_message}
            </Text>
            <Button
              title="Resubscribe to Pro"
              onPress={() => navigation.navigate("Pricing")}
              style={styles.resubscribeBtn}
            />
          </View>
        </Card>
      ) : null}

      <Card style={styles.card}>
        <Text style={[styles.eyebrow, { color: c.primary }]}>
          CURRENT PLAN
        </Text>
        <Text style={[styles.plan, { color: c.text }]}>{data.plan.name}</Text>
        <Text style={{ color: c.muted, marginTop: 4 }}>
          {data.price_label || "$0"}
          {data.billing_interval !== "none"
            ? ` / ${data.billing_interval}`
            : " forever"}
        </Text>

        <View style={styles.detailList}>
          {detailRows.map((row, idx) => (
            <View key={row.label}>
              {idx > 0 ? <Divider style={styles.rowDivider} /> : null}
              <Text style={{ color: c.muted, fontSize: 11, fontWeight: "700" }}>
                {row.label.toUpperCase()}
              </Text>
              <Text style={{ color: c.text, marginTop: 2 }}>{row.value}</Text>
            </View>
          ))}
        </View>

        <View style={styles.row}>
          {!data.is_pro ? (
            <Button
              title="Upgrade plan"
              fullWidth={false}
              onPress={() => navigation.navigate("Pricing")}
            />
          ) : (
            <>
              <Button
                title="Billing portal"
                fullWidth={false}
                loading={portal.isPending}
                onPress={async () => {
                  try {
                    const res = await portal.mutateAsync({});
                    if (res?.portal_url) await Linking.openURL(res.portal_url);
                  } catch (err) {
                    toast.error("Portal failed", getErrorMessage(err));
                  }
                }}
              />
              {!data.cancel_at_period_end ? (
                <Button
                  title="Cancel"
                  variant="danger"
                  fullWidth={false}
                  loading={cancelSub.isPending}
                  onPress={async () => {
                    try {
                      await cancelSub.mutateAsync({ immediate: false });
                      toast.success(
                        "Cancellation scheduled",
                        data.current_period_end
                          ? `Access until ${formatDateOnly(data.current_period_end)}`
                          : undefined,
                      );
                      void refetch();
                    } catch (err) {
                      toast.error("Cancel failed", getErrorMessage(err));
                    }
                  }}
                />
              ) : null}
            </>
          )}
          <Button
            title="Sync"
            variant="outline"
            fullWidth={false}
            loading={sync.isPending}
            onPress={async () => {
              try {
                await sync.mutateAsync();
                toast.success("Synced from Stripe");
                void refetch();
              } catch (err) {
                toast.error("Sync failed", getErrorMessage(err));
              }
            }}
          />
        </View>
      </Card>

      <SectionHeader title="Usage" />
      <View style={styles.statsGrid}>
        <StatCard
          label="Organisations"
          value={`${usage?.organisations?.used ?? 0} / ${usage?.organisations?.limit ?? "∞"}`}
        />
        <StatCard
          label="Reports today"
          value={`${usage?.reports_today?.used ?? 0} / ${usage?.reports_today?.limit ?? "∞"}`}
        />
      </View>

      <Button
        title="Billing history"
        variant="ghost"
        onPress={() => navigation.navigate("BillingHistory")}
        style={styles.linkBtn}
      />
      <Button
        title="See pricing"
        variant="ghost"
        onPress={() => navigation.navigate("Pricing")}
        style={styles.linkBtn}
      />
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  pad: { padding: spacing.lg, paddingBottom: 40 },
  card: { marginBottom: spacing.md },
  bannerFill: { margin: -spacing.md, padding: spacing.md, borderRadius: 12 },
  resubscribeBtn: { marginTop: 12 },
  eyebrow: { fontWeight: "700", fontSize: 12, letterSpacing: 0.4 },
  plan: { fontSize: 22, fontWeight: "800", marginTop: 4 },
  detailList: { marginTop: 14 },
  rowDivider: { marginVertical: spacing.sm },
  row: { flexDirection: "row", flexWrap: "wrap", gap: 8, marginTop: 14 },
  statsGrid: {
    flexDirection: "row",
    gap: spacing.sm,
    marginBottom: spacing.md,
  },
  linkBtn: { alignSelf: "flex-start", paddingHorizontal: 0, marginTop: 4 },
});
