import { Alert, FlatList, StyleSheet, Text, View } from "react-native";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { useNavigation } from "@react-navigation/native";
import type { NativeStackNavigationProp } from "@react-navigation/native-stack";
import { organisationsApi } from "@mytask/api";
import { queryKeys, useHomeBootstrap } from "@mytask/hooks";
import { radii, spacing, typography } from "@mytask/theme";
import type {
  OrganisationInvitation,
  OrganisationMembership,
} from "@mytask/types";
import { getErrorMessage } from "@mytask/utils";
import { SkeletonList } from "../components/Skeleton";
import type { RootStackParamList } from "../navigation/RootNavigator";
import { blockOrgSwitch } from "../services/trackingSession";
import { useOrganisationStore } from "../store/organisationStore";
import { useThemeStore } from "../store/themeStore";
import { useToastStore } from "../store/toastStore";
import {
  Button,
  BuildingIcon,
  Card,
  ChevronIcon,
  EmptyState,
  ErrorState,
  ScreenHeader,
  WalletIcon,
} from "../ui";

export function HomeScreen() {
  const navigation =
    useNavigation<NativeStackNavigationProp<RootStackParamList>>();
  const qc = useQueryClient();
  const { data, isLoading, isError, refetch } = useHomeBootstrap();
  const setOrganisation = useOrganisationStore((s) => s.setOrganisation);
  const organisations = (data?.organisations || []) as OrganisationMembership[];
  const invitations = (data?.invitations || []) as OrganisationInvitation[];
  const c = useThemeStore((s) => s.colors);
  const toast = useToastStore();

  const acceptMutation = useMutation({
    mutationFn: (invite: OrganisationInvitation) =>
      organisationsApi.acceptInvitation({
        id: invite.id,
        organisation_id: invite.organisation_id,
        invitation_token: invite.invitation_token,
        employee_id: invite.employee_id,
      }),
    onSuccess: async () => {
      toast.success("Invitation accepted");
      await Promise.all([
        qc.invalidateQueries({ queryKey: queryKeys.organisationInvitations }),
        qc.invalidateQueries({ queryKey: ["organisations"] }),
        qc.invalidateQueries({ queryKey: queryKeys.screens.home }),
      ]);
    },
    onError: (err) => {
      toast.error(
        "Unable to accept",
        getErrorMessage(err, "Could not accept invitation"),
      );
    },
  });

  const rejectMutation = useMutation({
    mutationFn: (invite: OrganisationInvitation) =>
      organisationsApi.rejectInvitation({
        id: invite.id,
        organisation_id: invite.organisation_id,
        invitation_token: invite.invitation_token,
        employee_id: invite.employee_id,
      }),
    onSuccess: async () => {
      toast.success("Invitation rejected");
      await Promise.all([
        qc.invalidateQueries({ queryKey: queryKeys.organisationInvitations }),
        qc.invalidateQueries({ queryKey: ["organisations"] }),
        qc.invalidateQueries({ queryKey: queryKeys.screens.home }),
      ]);
    },
    onError: (err) => {
      toast.error(
        "Unable to reject",
        getErrorMessage(err, "Could not reject invitation"),
      );
    },
  });

  const busyId =
    acceptMutation.isPending
      ? acceptMutation.variables?.id
      : rejectMutation.isPending
        ? rejectMutation.variables?.id
        : null;

  if (isLoading) {
    return (
      <View style={{ flex: 1, backgroundColor: c.bg }}>
        <SkeletonList rows={6} />
      </View>
    );
  }

  if (isError) {
    return (
      <View style={[styles.flex, { backgroundColor: c.bg }]}>
        <ErrorState
          title="Failed to load organisations"
          description="Check your connection and try again."
          onRetry={() => void refetch()}
        />
      </View>
    );
  }

  return (
    <View style={[styles.container, { backgroundColor: c.bg }]}>
      <ScreenHeader
        title="Your organisations"
        subtitle="Select an organisation to continue"
      />

      <Button
        title="Upgrade plan"
        variant="soft"
        onPress={() => navigation.navigate("Pricing")}
        leftIcon={<WalletIcon color={c.secondary} size={16} />}
        style={styles.upgrade}
      />
      <Button
        title="Create organisation"
        onPress={() => navigation.navigate("CreateOrganisation")}
        style={styles.createOrg}
      />

      {invitations.length > 0 ? (
        <View style={styles.invitesSection}>
          <Text style={[styles.sectionTitle, { color: c.text }]}>
            Pending invitations
          </Text>
          {invitations.map((invite) => {
            const invitedBy =
              invite.employee?.creator?.full_name ||
              [
                invite.employee?.creator?.first_name,
                invite.employee?.creator?.last_name,
              ]
                .filter(Boolean)
                .join(" ") ||
              "A teammate";
            const orgName = invite.organisation?.name || "Organisation";
            const isBusy = busyId === invite.id;
            return (
              <Card key={String(invite.id)} style={styles.inviteCard}>
                <Text style={[styles.name, { color: c.text }]}>{orgName}</Text>
                <Text style={[styles.inviteMeta, { color: c.muted }]}>
                  {invitedBy} invited you
                  {invite.role?.name ? ` as ${invite.role.name}` : ""}
                </Text>
                <View style={styles.inviteActions}>
                  <View style={styles.inviteActionHalf}>
                    <Button
                      title="Reject"
                      variant="outline"
                      size="sm"
                      loading={isBusy && rejectMutation.isPending}
                      disabled={Boolean(busyId)}
                      onPress={() => rejectMutation.mutate(invite)}
                    />
                  </View>
                  <View style={styles.inviteActionHalf}>
                    <Button
                      title="Accept"
                      size="sm"
                      loading={isBusy && acceptMutation.isPending}
                      disabled={Boolean(busyId)}
                      onPress={() => acceptMutation.mutate(invite)}
                    />
                  </View>
                </View>
              </Card>
            );
          })}
        </View>
      ) : null}

      <FlatList
        data={organisations}
        keyExtractor={(item) => String(item.id)}
        showsHorizontalScrollIndicator={false}
        contentContainerStyle={styles.list}
        ListEmptyComponent={
          <EmptyState
            icon={<BuildingIcon color={c.primary} size={28} />}
            title="No organisations yet"
            description="Create an organisation or accept an invitation to get started."
          />
        }
        renderItem={({ item }) => (
          <Card
            style={styles.card}
            accessibilityLabel={`Organisation ${item.name}`}
            onPress={async () => {
              if (await blockOrgSwitch(item.code)) {
                Alert.alert(
                  "Tracking in progress",
                  "Stop clock-in tracking for the other organisation before switching.",
                );
                toast.warning("Stop tracking before switching organisations");
                return;
              }
              await setOrganisation({
                id: item.id,
                code: item.code,
                name: item.name,
                role: (item.role || item.role_code) as string,
              });
              navigation.navigate("Organisation", { orgCode: item.code });
            }}
          >
            <View style={styles.row}>
              <View style={[styles.iconWrap, { backgroundColor: c.primarySoft }]}>
                <BuildingIcon color={c.primary} size={20} />
              </View>
              <View style={styles.textCol}>
                <Text style={[styles.name, { color: c.text }]} numberOfLines={1}>
                  {item.name}
                </Text>
                <Text style={[styles.code, { color: c.muted }]} numberOfLines={1}>
                  {item.code}
                </Text>
              </View>
              <ChevronIcon color={c.subtle} />
            </View>
          </Card>
        )}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  flex: { flex: 1 },
  container: { flex: 1, padding: spacing.lg },
  sectionTitle: {
    fontSize: typography.sizes.md,
    fontWeight: "700",
    marginBottom: spacing.sm,
  },
  invitesSection: { marginBottom: spacing.md },
  inviteCard: { marginBottom: spacing.sm },
  inviteMeta: { marginTop: 4, fontSize: typography.sizes.sm },
  inviteActions: {
    flexDirection: "row",
    gap: spacing.sm,
    marginTop: spacing.sm,
  },
  inviteActionHalf: { flex: 1 },
  list: { paddingBottom: spacing.xxl },
  card: { marginBottom: spacing.sm },
  row: {
    flexDirection: "row",
    alignItems: "center",
    gap: spacing.sm,
  },
  iconWrap: {
    width: 40,
    height: 40,
    borderRadius: radii.md,
    alignItems: "center",
    justifyContent: "center",
  },
  textCol: { flex: 1, minWidth: 0 },
  name: { fontSize: typography.sizes.md, fontWeight: "700", letterSpacing: -0.2 },
  code: { marginTop: 2, fontSize: typography.sizes.xs, fontWeight: "500" },
  upgrade: { marginBottom: spacing.sm },
  createOrg: { marginBottom: spacing.md },
});
