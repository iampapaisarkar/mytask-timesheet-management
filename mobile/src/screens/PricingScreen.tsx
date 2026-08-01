import {
  Linking,
  ScrollView,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
} from "react-native";
import { useMemo, useState } from "react";
import { useNavigation } from "@react-navigation/native";
import type { NativeStackNavigationProp } from "@react-navigation/native-stack";
import {
  useCancelSubscription,
  useCreateCheckout,
  usePlansCatalogue,
} from "@mytask/hooks";
import { spacing } from "@mytask/theme";
import { getErrorMessage } from "@mytask/utils";
import type { RootStackParamList } from "../navigation/RootNavigator";
import { SkeletonDetail } from "../components/Skeleton";
import { useAuthStore } from "../store/authStore";
import { useThemeStore } from "../store/themeStore";
import { useToastStore } from "../store/toastStore";

export function PricingScreen() {
  const navigation =
    useNavigation<NativeStackNavigationProp<RootStackParamList>>();
  const token = useAuthStore((s) => s.token);
  const c = useThemeStore((s) => s.colors);
  const toast = useToastStore();
  const [interval, setInterval] = useState<"month" | "year">("month");
  const { data, isLoading, isError, refetch } = usePlansCatalogue();
  const checkout = useCreateCheckout();
  const cancelSub = useCancelSubscription();

  const freePlan = data?.plans?.find((p) => p.code === "free");
  const proPlan = data?.plans?.find((p) => p.code === "pro");
  const current = data?.current_subscription;
  const proPrice = useMemo(
    () => proPlan?.prices?.find((p) => p.billing_interval === interval),
    [proPlan, interval],
  );

  async function onUpgrade() {
    try {
      const session = await checkout.mutateAsync({ billing_interval: interval });
      if (session?.checkout_url) {
        await Linking.openURL(session.checkout_url);
      }
    } catch (err) {
      toast.error("Checkout failed", getErrorMessage(err));
    }
  }

  if (isLoading) {
    return (
      <View style={{ flex: 1, backgroundColor: c.bg }}>
        <SkeletonDetail />
      </View>
    );
  }

  if (isError) {
    return (
      <View style={[styles.center, { backgroundColor: c.bg }]}>
        <Text style={{ color: c.text }}>Failed to load pricing</Text>
        <TouchableOpacity onPress={() => refetch()}>
          <Text style={{ color: c.primary, marginTop: 8 }}>Try again</Text>
        </TouchableOpacity>
      </View>
    );
  }

  return (
    <ScrollView
      style={{ flex: 1, backgroundColor: c.bg }}
      contentContainerStyle={styles.pad}
    >
      <Text style={[styles.title, { color: c.text }]}>Pricing</Text>
      <Text style={[styles.sub, { color: c.muted }]}>
        Subscriptions belong to you — not shared with invited teammates.
      </Text>

      {current ? (
        <View
          style={[
            styles.card,
            { backgroundColor: c.surface, borderColor: c.border },
          ]}
        >
          <Text style={{ color: c.primary, fontWeight: "700", fontSize: 12 }}>
            CURRENT PLAN
          </Text>
          <Text style={[styles.planName, { color: c.text }]}>
            {current.plan?.name}
            {current.is_pro ? " · Active" : ""}
          </Text>
          <TouchableOpacity
            onPress={() => navigation.navigate("Subscription")}
            style={{ marginTop: 8 }}
          >
            <Text style={{ color: c.primary, fontWeight: "600" }}>
              Manage subscription →
            </Text>
          </TouchableOpacity>
        </View>
      ) : null}

      <View style={styles.toggleRow}>
        {(["month", "year"] as const).map((key) => (
          <TouchableOpacity
            key={key}
            onPress={() => setInterval(key)}
            style={[
              styles.toggle,
              {
                backgroundColor: interval === key ? c.primary : c.surface,
                borderColor: c.border,
              },
            ]}
          >
            <Text
              style={{
                color: interval === key ? "#fff" : c.text,
                fontWeight: "700",
              }}
            >
              {key === "month" ? "Monthly" : "Yearly"}
            </Text>
          </TouchableOpacity>
        ))}
      </View>

      <PlanBlock
        title={freePlan?.name || "Free"}
        price="$0"
        hint="Forever"
        features={freePlan?.features}
        colors={c}
      />
      <PlanBlock
        title={proPlan?.name || "Pro"}
        price={
          proPrice
            ? `$${(proPrice.amount_cents / 100).toFixed(2)}`
            : interval === "month"
              ? "$9.99"
              : "$99.99"
        }
        hint={interval === "month" ? "per month" : "per year"}
        features={proPlan?.features}
        colors={c}
        highlight
        cta={
          current?.is_pro
            ? current.cancel_at_period_end
              ? "Cancellation pending"
              : "Cancel at period end"
            : "Upgrade to Pro"
        }
        ctaLoading={checkout.isPending || cancelSub.isPending}
        onCta={
          current?.is_pro
            ? current.cancel_at_period_end
              ? undefined
              : async () => {
                  try {
                    await cancelSub.mutateAsync({ immediate: false });
                    toast.success("Cancellation scheduled");
                    void refetch();
                  } catch (err) {
                    toast.error("Cancel failed", getErrorMessage(err));
                  }
                }
            : () => void onUpgrade()
        }
      />

      {token ? (
        <TouchableOpacity
          onPress={() => navigation.navigate("BillingHistory")}
          style={{ marginTop: 16 }}
        >
          <Text
            style={{ color: c.primary, fontWeight: "600", textAlign: "center" }}
          >
            Billing history
          </Text>
        </TouchableOpacity>
      ) : null}
    </ScrollView>
  );
}

function PlanBlock({
  title,
  price,
  hint,
  features,
  colors: c,
  highlight,
  cta,
  ctaLoading,
  onCta,
}: {
  title: string;
  price: string;
  hint: string;
  features?: Record<string, number | boolean | undefined>;
  colors: { surface: string; border: string; text: string; muted: string; primary: string };
  highlight?: boolean;
  cta?: string;
  ctaLoading?: boolean;
  onCta?: () => void;
}) {
  return (
    <View
      style={[
        styles.card,
        {
          backgroundColor: c.surface,
          borderColor: highlight ? c.primary : c.border,
          borderWidth: highlight ? 2 : 1,
        },
      ]}
    >
      <Text style={[styles.planName, { color: c.text }]}>{title}</Text>
      <Text style={{ color: c.text, fontSize: 28, fontWeight: "800" }}>{price}</Text>
      <Text style={{ color: c.muted, marginBottom: 12 }}>{hint}</Text>
      {Object.entries(features || {})
        .slice(0, 6)
        .map(([k, v]) => (
          <Text key={k} style={{ color: c.muted, marginBottom: 4 }}>
            • {k.replace(/_/g, " ")}
            {typeof v === "number" ? `: ${v}` : v === false ? " —" : ""}
          </Text>
        ))}
      {cta && onCta ? (
        <TouchableOpacity
          onPress={onCta}
          disabled={ctaLoading}
          style={[styles.cta, { backgroundColor: c.primary, opacity: ctaLoading ? 0.6 : 1 }]}
        >
          <Text style={{ color: "#fff", fontWeight: "700", textAlign: "center" }}>
            {ctaLoading ? "Please wait…" : cta}
          </Text>
        </TouchableOpacity>
      ) : null}
    </View>
  );
}

const styles = StyleSheet.create({
  center: { flex: 1, alignItems: "center", justifyContent: "center" },
  pad: { padding: spacing.lg, paddingBottom: 40 },
  title: { fontSize: 24, fontWeight: "800" },
  sub: { marginTop: 6, marginBottom: 16, fontSize: 14 },
  card: {
    borderRadius: 16,
    borderWidth: 1,
    padding: 16,
    marginBottom: 14,
  },
  planName: { fontSize: 18, fontWeight: "700", marginBottom: 4 },
  toggleRow: { flexDirection: "row", gap: 8, marginBottom: 16 },
  toggle: {
    flex: 1,
    borderRadius: 12,
    borderWidth: 1,
    paddingVertical: 10,
    alignItems: "center",
  },
  cta: { marginTop: 14, borderRadius: 12, paddingVertical: 12 },
});
