import { Linking, ScrollView, StyleSheet, Text, View } from "react-native";
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
import type { AppColors } from "../store/themeStore";
import { useToastStore } from "../store/toastStore";
import { Button, Card, ErrorState, ScreenHeader, SegmentedControl } from "../ui";

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
      <View style={{ flex: 1, backgroundColor: c.bg }}>
        <ErrorState title="Failed to load pricing" onRetry={() => refetch()} />
      </View>
    );
  }

  return (
    <ScrollView
      style={{ flex: 1, backgroundColor: c.bg }}
      contentContainerStyle={styles.pad}
    >
      <ScreenHeader
        title="Pricing"
        subtitle="Subscriptions belong to you — not shared with invited teammates."
      />

      {current ? (
        <Card style={styles.card}>
          <Text style={[styles.eyebrow, { color: c.primary }]}>
            CURRENT PLAN
          </Text>
          <Text style={[styles.planName, { color: c.text }]}>
            {current.plan?.name}
            {current.is_pro ? " · Active" : ""}
          </Text>
          <Button
            title="Manage subscription"
            variant="ghost"
            fullWidth={false}
            onPress={() => navigation.navigate("Subscription")}
            style={styles.manageBtn}
          />
        </Card>
      ) : null}

      <SegmentedControl
        value={interval}
        onChange={setInterval}
        options={[
          { value: "month", label: "Monthly" },
          { value: "year", label: "Yearly" },
        ]}
      />
      <View style={styles.toggleSpacer} />

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
        <Button
          title="Billing history"
          variant="ghost"
          onPress={() => navigation.navigate("BillingHistory")}
          style={styles.historyBtn}
        />
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
  colors: AppColors;
  highlight?: boolean;
  cta?: string;
  ctaLoading?: boolean;
  onCta?: () => void;
}) {
  return (
    <Card
      style={styles.card}
      accentBorder={highlight ? c.primary : undefined}
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
        <Button
          title={ctaLoading ? "Please wait…" : cta}
          onPress={onCta}
          loading={ctaLoading}
          style={styles.cta}
        />
      ) : null}
    </Card>
  );
}

const styles = StyleSheet.create({
  pad: { padding: spacing.lg, paddingBottom: 40 },
  card: { marginBottom: spacing.md },
  eyebrow: { fontWeight: "700", fontSize: 12, letterSpacing: 0.4 },
  planName: { fontSize: 18, fontWeight: "700", marginBottom: 4 },
  manageBtn: { marginTop: spacing.sm, alignSelf: "flex-start", paddingHorizontal: 0 },
  toggleSpacer: { height: spacing.md },
  cta: { marginTop: 14 },
  historyBtn: { marginTop: spacing.sm },
});
