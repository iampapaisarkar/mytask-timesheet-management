import { Pressable, StyleSheet, Text, View } from "react-native";
import { useNavigation } from "@react-navigation/native";
import type { NativeStackNavigationProp } from "@react-navigation/native-stack";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { DEFAULT_LIST_PAGE_SIZE } from "@mytask/constants";
import { useNotifications } from "@mytask/hooks";
import { spacing, typography } from "@mytask/theme";
import { HeaderIconButton } from "./HeaderIconButton";
import { LiveTrackingIndicator } from "./LiveTrackingIndicator";
import type { RootStackParamList } from "../navigation/types";
import { useLocalTrackingLive } from "../hooks/useLocalTrackingLive";
import { useAuthStore } from "../store/authStore";
import { useOrganisationStore } from "../store/organisationStore";
import { useThemeStore } from "../store/themeStore";
import { BellIcon, MoonIcon, SunIcon } from "../ui";
import { elevation } from "../ui/tokens";

type Props = {
  orgCode: string;
  onLeaveOrganisation?: () => void;
};

function firstNameFromUser(user: {
  first_name?: string;
  full_name?: unknown;
} | null): string {
  const first = user?.first_name?.trim();
  if (first) return first;
  if (typeof user?.full_name === "string" && user.full_name.trim()) {
    return user.full_name.trim().split(/\s+/)[0] || "there";
  }
  return "there";
}

/**
 * Organisation chrome — greeting + org code on the left; notifications + theme on the right.
 */
export function OrgHeader({ orgCode, onLeaveOrganisation }: Props) {
  const insets = useSafeAreaInsets();
  const navigation =
    useNavigation<NativeStackNavigationProp<RootStackParamList>>();
  const user = useAuthStore((s) => s.user);
  const organisation = useOrganisationStore((s) => s.organisation);
  const c = useThemeStore((s) => s.colors);
  const mode = useThemeStore((s) => s.mode);
  const toggle = useThemeStore((s) => s.toggle);

  const notificationsQuery = useNotifications(
    { rows_per_page: DEFAULT_LIST_PAGE_SIZE, page_number: 1 },
    Boolean(orgCode),
  );
  const unread =
    notificationsQuery.data &&
    typeof notificationsQuery.data === "object" &&
    "unread_count" in notificationsQuery.data
      ? Number(
          (notificationsQuery.data as { unread_count?: number }).unread_count,
        )
      : 0;
  const unreadLabel = unread > 99 ? "99+" : unread > 0 ? String(unread) : null;

  const code = organisation?.code || orgCode;
  const firstName = firstNameFromUser(user);
  const trackingLive = useLocalTrackingLive();

  return (
    <View
      style={[
        styles.wrap,
        elevation.soft,
        {
          paddingTop: Math.max(insets.top, spacing.sm),
          backgroundColor: c.surface,
          borderBottomColor: c.border,
        },
      ]}
    >
      <View style={styles.row}>
        <Pressable
          style={styles.identity}
          onPress={() => onLeaveOrganisation?.()}
          accessibilityRole="button"
          accessibilityLabel="Back to myTask home"
        >
          <View style={styles.greetingRow}>
            <Text style={[styles.greeting, { color: c.text }]} numberOfLines={1}>
              Hi, {firstName}
            </Text>
            {trackingLive ? <LiveTrackingIndicator compact /> : null}
          </View>
          <Text style={[styles.code, { color: c.text }]} numberOfLines={1}>
            {code}
          </Text>
        </Pressable>

        <View style={styles.actions}>
          <HeaderIconButton
            accessibilityLabel={
              unreadLabel
                ? `Notifications, ${unreadLabel} unread`
                : "Notifications"
            }
            onPress={() =>
              navigation.navigate("NotificationsList", { orgCode })
            }
          >
            <View>
              <BellIcon color={c.text} size={20} />
              {unreadLabel ? (
                <View style={[styles.badge, { backgroundColor: c.primary }]}>
                  <Text style={styles.badgeText}>{unreadLabel}</Text>
                </View>
              ) : null}
            </View>
          </HeaderIconButton>

          <HeaderIconButton
            accessibilityLabel={
              mode === "dark" ? "Switch to light theme" : "Switch to dark theme"
            }
            onPress={() => void toggle()}
          >
            {mode === "dark" ? (
              <SunIcon color={c.text} size={20} />
            ) : (
              <MoonIcon color={c.text} size={20} />
            )}
          </HeaderIconButton>
        </View>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  wrap: {
    borderBottomWidth: StyleSheet.hairlineWidth,
    paddingBottom: spacing.sm,
    paddingHorizontal: spacing.md,
  },
  row: {
    flexDirection: "row",
    alignItems: "center",
    gap: spacing.sm,
    minHeight: 52,
  },
  identity: {
    flex: 1,
    minWidth: 0,
    paddingRight: spacing.sm,
    justifyContent: "center",
  },
  greetingRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: spacing.sm,
    minWidth: 0,
  },
  greeting: {
    flexShrink: 1,
    fontSize: typography.sizes.lg,
    fontWeight: "700",
    letterSpacing: -0.2,
  },
  code: {
    marginTop: 2,
    fontSize: typography.sizes.xs,
    fontWeight: "800",
    letterSpacing: 0.3,
  },
  actions: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
  },
  badge: {
    position: "absolute",
    top: -6,
    right: -8,
    minWidth: 16,
    height: 16,
    borderRadius: 8,
    paddingHorizontal: 3,
    alignItems: "center",
    justifyContent: "center",
  },
  badgeText: {
    color: "#fff",
    fontSize: 9,
    fontWeight: "800",
  },
});
