import { useEffect, useState } from "react";
import {
  ActivityIndicator,
  StyleSheet,
  Text,
  View,
} from "react-native";
import type { NativeStackScreenProps } from "@react-navigation/native-stack";
import { useConfirmCheckout, useSyncSubscription } from "@mytask/hooks";
import { radii, spacing, typography } from "@mytask/theme";
import { getErrorMessage } from "@mytask/utils";
import type { RootStackParamList } from "../navigation/RootNavigator";
import { useThemeStore } from "../store/themeStore";
import { Button, Card, CheckCircleIcon } from "../ui";

type Props = NativeStackScreenProps<RootStackParamList, "BillingSuccess">;

/**
 * Mirrors web BillingSuccessPage — confirm Stripe checkout session, then sync.
 */
export function BillingSuccessScreen({ navigation, route }: Props) {
  const sessionId = route.params?.session_id || "";
  const confirm = useConfirmCheckout();
  const sync = useSyncSubscription();
  const c = useThemeStore((s) => s.colors);
  const [status, setStatus] = useState<"syncing" | "ready" | "error">("syncing");
  const [error, setError] = useState<string | null>(null);
  const [planName, setPlanName] = useState("Pro");

  useEffect(() => {
    let cancelled = false;
    async function run() {
      try {
        const data = sessionId
          ? await confirm.mutateAsync(sessionId)
          : await sync.mutateAsync();
        if (cancelled) return;
        setPlanName(data?.plan?.name || "Pro");
        setStatus("ready");
      } catch (err) {
        if (cancelled) return;
        try {
          const data = await sync.mutateAsync();
          if (cancelled) return;
          setPlanName(data?.plan?.name || "Pro");
          setStatus("ready");
        } catch (err2) {
          if (cancelled) return;
          setError(
            getErrorMessage(
              err2 || err,
              "Payment succeeded, but plan sync is still pending. Open Subscription and tap refresh.",
            ),
          );
          setStatus("error");
        }
      }
    }
    void run();
    return () => {
      cancelled = true;
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps -- run once on mount
  }, [sessionId]);

  return (
    <View style={[styles.container, { backgroundColor: c.bg }]}>
      <Card style={styles.card}>
        {status === "syncing" ? (
          <View style={styles.block}>
            <ActivityIndicator color={c.primary} size="large" />
            <Text style={[styles.title, { color: c.text }]}>
              Activating your plan…
            </Text>
            <Text style={[styles.body, { color: c.muted }]}>
              Payment received. Syncing your Pro subscription now.
            </Text>
          </View>
        ) : null}

        {status === "ready" ? (
          <View style={styles.block}>
            <View style={[styles.iconWrap, { backgroundColor: c.positiveSoft }]}>
              <CheckCircleIcon color={c.positive} size={32} />
            </View>
            <Text style={[styles.title, { color: c.text }]}>
              You are on {planName}
            </Text>
            <Text style={[styles.body, { color: c.muted }]}>
              Your Pro limits and features are active.
            </Text>
          </View>
        ) : null}

        {status === "error" ? (
          <View style={styles.block}>
            <View style={[styles.iconWrap, { backgroundColor: c.warningSoft }]}>
              <CheckCircleIcon color={c.warning} size={32} />
            </View>
            <Text style={[styles.title, { color: c.text }]}>
              Payment received
            </Text>
            <Text style={[styles.body, { color: c.muted }]}>{error}</Text>
            <Button
              title="Retry sync"
              loading={sync.isPending}
              onPress={async () => {
                setStatus("syncing");
                setError(null);
                try {
                  const data = await sync.mutateAsync();
                  setPlanName(data?.plan?.name || "Pro");
                  setStatus("ready");
                } catch (err) {
                  setError(getErrorMessage(err));
                  setStatus("error");
                }
              }}
              style={styles.retryBtn}
            />
          </View>
        ) : null}

        <View style={styles.actions}>
          <Button
            title="View subscription"
            onPress={() => navigation.navigate("Subscription")}
            fullWidth
          />
          <Button
            title="Go to dashboard"
            variant="secondary"
            onPress={() => navigation.navigate("Home")}
            fullWidth
            style={styles.secondaryBtn}
          />
        </View>
      </Card>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    justifyContent: "center",
    padding: spacing.lg,
  },
  card: {
    padding: spacing.lg,
    borderRadius: radii.xxl,
  },
  block: {
    alignItems: "center",
    marginBottom: spacing.md,
  },
  iconWrap: {
    width: 64,
    height: 64,
    borderRadius: radii.xl,
    alignItems: "center",
    justifyContent: "center",
    marginBottom: spacing.sm,
  },
  title: {
    fontSize: typography.sizes.xl,
    fontWeight: "700",
    textAlign: "center",
    marginTop: spacing.sm,
  },
  body: {
    marginTop: 8,
    fontSize: typography.sizes.sm,
    lineHeight: 20,
    textAlign: "center",
  },
  retryBtn: { marginTop: spacing.md, alignSelf: "stretch" },
  actions: { marginTop: spacing.md, gap: spacing.sm },
  secondaryBtn: { marginTop: 0 },
});
