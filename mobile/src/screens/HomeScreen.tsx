import {
  ActivityIndicator,
  Alert,
  FlatList,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
} from "react-native";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { useNavigation } from "@react-navigation/native";
import type { NativeStackNavigationProp } from "@react-navigation/native-stack";
import { organisationsApi } from "@mytask/api";
import { queryKeys, useHomeBootstrap } from "@mytask/hooks";
import { spacing } from "@mytask/theme";
import type {
  OrganisationInvitation,
  OrganisationMembership,
} from "@mytask/types";
import { getErrorMessage } from "@mytask/utils";
import type { RootStackParamList } from "../navigation/RootNavigator";
import { blockOrgSwitch } from "../services/trackingSession";
import { useOrganisationStore } from "../store/organisationStore";
import { useThemeStore } from "../store/themeStore";
import { useToastStore } from "../store/toastStore";

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
      <View style={[styles.center, { backgroundColor: c.bg }]}>
        <ActivityIndicator color={c.primary} />
        <Text style={{ color: c.muted, marginTop: 12 }}>Loading…</Text>
      </View>
    );
  }

  if (isError) {
    return (
      <View style={[styles.center, { backgroundColor: c.bg }]}>
        <Text style={{ color: c.text }}>Failed to load organisations</Text>
        <TouchableOpacity onPress={() => refetch()}>
          <Text style={[styles.link, { color: c.primary }]}>Try again</Text>
        </TouchableOpacity>
      </View>
    );
  }

  return (
    <View style={[styles.container, { backgroundColor: c.bg }]}>
      <Text style={[styles.heading, { color: c.text }]}>Your organisations</Text>
      <Text style={[styles.sub, { color: c.muted }]}>
        Select an organisation to continue
      </Text>
      <TouchableOpacity
        style={[
          styles.upgrade,
          { backgroundColor: c.primary + "22", borderColor: c.primary },
        ]}
        onPress={() => navigation.navigate("Pricing")}
      >
        <Text style={{ color: c.primary, fontWeight: "700" }}>Upgrade Plan</Text>
        <Text style={{ color: c.muted, marginTop: 2, fontSize: 12 }}>
          Unlock Pro limits and features
        </Text>
      </TouchableOpacity>
      <TouchableOpacity
        style={[styles.createOrg, { backgroundColor: c.primary }]}
        onPress={() => navigation.navigate("CreateOrganisation")}
      >
        <Text style={styles.createOrgText}>Create organisation</Text>
      </TouchableOpacity>

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
              <View
                key={String(invite.id)}
                style={[
                  styles.inviteCard,
                  { backgroundColor: c.surface, borderColor: c.border },
                ]}
              >
                <Text style={[styles.name, { color: c.text }]}>{orgName}</Text>
                <Text style={{ color: c.muted, marginTop: 4, fontSize: 13 }}>
                  {invitedBy} invited you
                  {invite.role?.name ? ` as ${invite.role.name}` : ""}
                </Text>
                <View style={styles.inviteActions}>
                  <TouchableOpacity
                    style={[
                      styles.inviteBtn,
                      {
                        backgroundColor: c.primary,
                        opacity: busyId && !isBusy ? 0.5 : 1,
                      },
                    ]}
                    disabled={Boolean(busyId)}
                    onPress={() => acceptMutation.mutate(invite)}
                  >
                    {isBusy && acceptMutation.isPending ? (
                      <ActivityIndicator color="#fff" size="small" />
                    ) : (
                      <Text style={styles.inviteBtnText}>Accept</Text>
                    )}
                  </TouchableOpacity>
                  <TouchableOpacity
                    style={[
                      styles.inviteBtn,
                      {
                        backgroundColor: c.surface,
                        borderWidth: 1,
                        borderColor: c.border,
                        opacity: busyId && !isBusy ? 0.5 : 1,
                      },
                    ]}
                    disabled={Boolean(busyId)}
                    onPress={() => rejectMutation.mutate(invite)}
                  >
                    {isBusy && rejectMutation.isPending ? (
                      <ActivityIndicator color={c.text} size="small" />
                    ) : (
                      <Text style={[styles.inviteBtnText, { color: c.text }]}>
                        Reject
                      </Text>
                    )}
                  </TouchableOpacity>
                </View>
              </View>
            );
          })}
        </View>
      ) : null}

      <FlatList
        data={organisations}
        keyExtractor={(item) => String(item.id)}
        contentContainerStyle={{ paddingBottom: 24 }}
        ListEmptyComponent={
          <Text style={[styles.empty, { color: c.muted }]}>
            No organisations yet
          </Text>
        }
        renderItem={({ item }) => (
          <TouchableOpacity
            style={[
              styles.card,
              { backgroundColor: c.surface, borderColor: c.border },
            ]}
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
              navigation.navigate("OrgHome", { orgCode: item.code });
            }}
          >
            <Text style={[styles.name, { color: c.text }]}>{item.name}</Text>
            <Text style={[styles.code, { color: c.muted }]}>{item.code}</Text>
          </TouchableOpacity>
        )}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, padding: spacing.lg },
  center: { flex: 1, alignItems: "center", justifyContent: "center" },
  heading: { fontSize: 22, fontWeight: "700" },
  sub: { marginTop: 4, marginBottom: spacing.md, fontSize: 13 },
  sectionTitle: { fontSize: 16, fontWeight: "700", marginBottom: spacing.sm },
  invitesSection: { marginBottom: spacing.md },
  inviteCard: {
    borderRadius: 16,
    padding: spacing.md,
    marginBottom: spacing.sm,
    borderWidth: 1,
  },
  inviteActions: {
    flexDirection: "row",
    gap: 8,
    marginTop: spacing.sm,
  },
  inviteBtn: {
    flex: 1,
    borderRadius: 12,
    paddingVertical: 12,
    alignItems: "center",
  },
  inviteBtnText: { color: "#fff", fontWeight: "700" },
  card: {
    borderRadius: 16,
    padding: spacing.md,
    marginBottom: spacing.sm,
    borderWidth: 1,
  },
  name: { fontSize: 16, fontWeight: "700" },
  code: { marginTop: 4, fontSize: 12 },
  empty: { textAlign: "center", marginTop: 40 },
  link: { fontWeight: "700", marginTop: 8 },
  upgrade: {
    borderRadius: 14,
    borderWidth: 1,
    padding: spacing.md,
    marginBottom: spacing.sm,
  },
  createOrg: {
    borderRadius: 14,
    paddingVertical: 14,
    alignItems: "center",
    marginBottom: spacing.md,
  },
  createOrgText: { color: "#fff", fontWeight: "700", fontSize: 15 },
});
