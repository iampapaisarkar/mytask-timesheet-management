import {
  ActivityIndicator,
  Linking,
  ScrollView,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
} from "react-native";
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
import { useThemeStore } from "../store/themeStore";
import { useToastStore } from "../store/toastStore";

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
      <View style={[styles.center, { backgroundColor: c.bg }]}>
        <ActivityIndicator color={c.primary} />
      </View>
    );
  }

  if (isError || !data) {
    return (
      <View style={[styles.center, { backgroundColor: c.bg }]}>
        <Text style={{ color: c.text }}>Failed to load subscription</Text>
        <TouchableOpacity onPress={() => refetch()}>
          <Text style={{ color: c.primary, marginTop: 8 }}>Try again</Text>
        </TouchableOpacity>
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
      <Text style={[styles.title, { color: c.text }]}>Subscription</Text>

      {data.cancel_at_period_end ? (
        <View
          style={[
            styles.card,
            { backgroundColor: "#FEF3C7", borderColor: "#F59E0B" },
          ]}
        >
          <Text style={{ color: "#92400E", fontWeight: "700" }}>
            Cancellation scheduled
          </Text>
          <Text style={{ color: "#92400E", marginTop: 6 }}>
            Pro access until{" "}
            {formatDateOnly(data.access_ends_at || data.current_period_end)}
            {data.days_until_period_end != null
              ? ` (${data.days_until_period_end} day(s) left)`
              : ""}
            . Then Free limits apply.
          </Text>
        </View>
      ) : null}

      {!data.is_pro && data.end_reason_message ? (
        <View
          style={[
            styles.card,
            { backgroundColor: "#FEE2E2", borderColor: "#EF4444" },
          ]}
        >
          <Text style={{ color: "#991B1B", fontWeight: "700" }}>
            {data.end_reason === "payment_failed" || data.end_reason === "unpaid"
              ? "Pro disabled — payment issue"
              : "Moved to Free plan"}
          </Text>
          <Text style={{ color: "#991B1B", marginTop: 6, lineHeight: 20 }}>
            {data.end_reason_message}
          </Text>
          <TouchableOpacity
            style={[styles.btn, { backgroundColor: c.primary, marginTop: 12 }]}
            onPress={() => navigation.navigate("Pricing")}
          >
            <Text style={styles.btnText}>Resubscribe to Pro</Text>
          </TouchableOpacity>
        </View>
      ) : null}

      <View
        style={[
          styles.card,
          { backgroundColor: c.surface, borderColor: c.border },
        ]}
      >
        <Text style={{ color: c.primary, fontWeight: "700", fontSize: 12 }}>
          CURRENT PLAN
        </Text>
        <Text style={[styles.plan, { color: c.text }]}>{data.plan.name}</Text>
        <Text style={{ color: c.muted, marginTop: 4 }}>
          {data.price_label || "$0"}
          {data.billing_interval !== "none"
            ? ` / ${data.billing_interval}`
            : " forever"}
        </Text>

        <View style={{ marginTop: 14, gap: 10 }}>
          {detailRows.map((row) => (
            <View key={row.label}>
              <Text style={{ color: c.muted, fontSize: 11, fontWeight: "700" }}>
                {row.label.toUpperCase()}
              </Text>
              <Text style={{ color: c.text, marginTop: 2 }}>{row.value}</Text>
            </View>
          ))}
        </View>

        <View style={styles.row}>
          {!data.is_pro ? (
            <Btn
              label="Upgrade plan"
              color={c.primary}
              onPress={() => navigation.navigate("Pricing")}
            />
          ) : (
            <>
              <Btn
                label="Billing portal"
                color={c.primary}
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
                <Btn
                  label="Cancel"
                  color="#DC2626"
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
          <Btn
            label="Sync"
            color={c.muted}
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
      </View>

      <Text style={[styles.section, { color: c.text }]}>Usage</Text>
      <View
        style={[
          styles.card,
          { backgroundColor: c.surface, borderColor: c.border },
        ]}
      >
        <Text style={{ color: c.text }}>
          Organisations: {usage?.organisations?.used ?? 0} /{" "}
          {usage?.organisations?.limit ?? "∞"}
        </Text>
        <Text style={{ color: c.text, marginTop: 8 }}>
          Reports today: {usage?.reports_today?.used ?? 0} /{" "}
          {usage?.reports_today?.limit ?? "∞"}
        </Text>
      </View>

      <TouchableOpacity onPress={() => navigation.navigate("BillingHistory")}>
        <Text style={{ color: c.primary, fontWeight: "600", marginTop: 8 }}>
          Billing history →
        </Text>
      </TouchableOpacity>
      <TouchableOpacity onPress={() => navigation.navigate("Pricing")}>
        <Text style={{ color: c.primary, fontWeight: "600", marginTop: 12 }}>
          See pricing →
        </Text>
      </TouchableOpacity>
    </ScrollView>
  );
}

function Btn({
  label,
  color,
  onPress,
  loading,
}: {
  label: string;
  color: string;
  onPress: () => void;
  loading?: boolean;
}) {
  return (
    <TouchableOpacity
      onPress={onPress}
      disabled={loading}
      style={[styles.btn, { backgroundColor: color, opacity: loading ? 0.6 : 1 }]}
    >
      <Text style={{ color: "#fff", fontWeight: "700" }}>
        {loading ? "…" : label}
      </Text>
    </TouchableOpacity>
  );
}

const styles = StyleSheet.create({
  center: { flex: 1, alignItems: "center", justifyContent: "center" },
  pad: { padding: spacing.lg, paddingBottom: 40 },
  title: { fontSize: 24, fontWeight: "800", marginBottom: 16 },
  card: { borderRadius: 16, borderWidth: 1, padding: 16, marginBottom: 14 },
  plan: { fontSize: 22, fontWeight: "800", marginTop: 4 },
  section: { fontSize: 16, fontWeight: "700", marginBottom: 8 },
  row: { flexDirection: "row", flexWrap: "wrap", gap: 8, marginTop: 14 },
  btn: { borderRadius: 12, paddingHorizontal: 14, paddingVertical: 10 },
});
