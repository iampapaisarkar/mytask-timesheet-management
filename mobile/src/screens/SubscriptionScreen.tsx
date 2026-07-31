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
} from "@mytask/hooks";
import { spacing } from "@mytask/theme";
import { getErrorMessage } from "@mytask/utils";
import type { RootStackParamList } from "../navigation/RootNavigator";
import { useThemeStore } from "../store/themeStore";
import { useToastStore } from "../store/toastStore";

export function SubscriptionScreen() {
  const navigation =
    useNavigation<NativeStackNavigationProp<RootStackParamList>>();
  const c = useThemeStore((s) => s.colors);
  const toast = useToastStore();
  const { data, isLoading, isError, refetch } = useCurrentSubscription();
  const portal = useBillingPortal();
  const cancelSub = useCancelSubscription();

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

  return (
    <ScrollView
      style={{ flex: 1, backgroundColor: c.bg }}
      contentContainerStyle={styles.pad}
    >
      <Text style={[styles.title, { color: c.text }]}>Subscription</Text>
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
          Status: {data.status} · Payment: {data.payment_status}
        </Text>
        {data.current_period_end ? (
          <Text style={{ color: c.muted, marginTop: 4 }}>
            {data.cancel_at_period_end ? "Ends" : "Renews"}{" "}
            {new Date(data.current_period_end).toLocaleDateString()}
          </Text>
        ) : null}

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
                      toast.success("Cancellation scheduled");
                      void refetch();
                    } catch (err) {
                      toast.error("Cancel failed", getErrorMessage(err));
                    }
                  }}
                />
              ) : null}
            </>
          )}
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
