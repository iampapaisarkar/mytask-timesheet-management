import { useMemo } from "react";
import {
  ActivityIndicator,
  ScrollView,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
} from "react-native";
import type { NativeStackScreenProps } from "@react-navigation/native-stack";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { authApi, organisationsApi } from "@mytask/api";
import { queryKeys } from "@mytask/hooks";
import { spacing } from "@mytask/theme";
import type { OrganisationInvitation } from "@mytask/types";
import { getErrorMessage } from "@mytask/utils";
import type { RootStackParamList } from "../navigation/RootNavigator";
import { useAuthStore } from "../store/authStore";
import { useThemeStore } from "../store/themeStore";
import { useToastStore } from "../store/toastStore";
import { decodeInvitationToken } from "../utils/decodeInvitationToken";

type Props = NativeStackScreenProps<RootStackParamList, "OrgInvitation">;

function asInvitations(data: unknown): OrganisationInvitation[] {
  return (Array.isArray(data) ? data : []) as OrganisationInvitation[];
}

export function OrgInvitationScreen({ navigation, route }: Props) {
  const token = route.params.token || "";
  const authToken = useAuthStore((s) => s.token);
  const isLoggedIn = Boolean(authToken);
  const c = useThemeStore((s) => s.colors);
  const toast = useToastStore();
  const qc = useQueryClient();
  const decoded = useMemo(() => decodeInvitationToken(token), [token]);

  const verifyQuery = useQuery({
    queryKey: ["org-invitation-verify", token],
    queryFn: async () => {
      await authApi.verifyOrganisationInvitationToken({ token });
      return true;
    },
    enabled: Boolean(token),
    retry: false,
  });

  const invitationsQuery = useQuery({
    queryKey: queryKeys.organisationInvitations,
    queryFn: async () => {
      const res = await organisationsApi.invitations();
      return asInvitations(res.data.data);
    },
    enabled: isLoggedIn && verifyQuery.isSuccess && Boolean(token),
  });

  const matchingInvite = useMemo(() => {
    const list = invitationsQuery.data || [];
    return list.find((inv) => inv.invitation_token === token) ?? null;
  }, [invitationsQuery.data, token]);

  const acceptMutation = useMutation({
    mutationFn: async (invite: OrganisationInvitation) => {
      await organisationsApi.acceptInvitation({
        id: invite.id,
        organisation_id: invite.organisation_id,
        invitation_token: invite.invitation_token,
        employee_id: invite.employee_id,
      });
    },
    onSuccess: async () => {
      toast.success("Invitation accepted", "Welcome to the organisation");
      await Promise.all([
        qc.invalidateQueries({ queryKey: queryKeys.organisationInvitations }),
        qc.invalidateQueries({ queryKey: ["organisations"] }),
        qc.invalidateQueries({ queryKey: queryKeys.screens.home }),
      ]);
      navigation.replace("Home");
    },
    onError: (err) => {
      toast.error(
        "Unable to accept",
        getErrorMessage(err, "Could not accept invitation"),
      );
    },
  });

  if (!token) {
    return (
      <View style={[styles.center, { backgroundColor: c.bg }]}>
        <Text style={{ color: c.text, textAlign: "center" }}>
          Invitation link is missing a token.
        </Text>
      </View>
    );
  }

  if (verifyQuery.isLoading) {
    return (
      <View style={[styles.center, { backgroundColor: c.bg }]}>
        <ActivityIndicator color={c.primary} />
        <Text style={{ color: c.muted, marginTop: 12 }}>
          Verifying invitation…
        </Text>
      </View>
    );
  }

  if (verifyQuery.isError) {
    return (
      <View style={[styles.center, { backgroundColor: c.bg, padding: spacing.lg }]}>
        <Text style={{ color: c.text, textAlign: "center", fontWeight: "700" }}>
          Invalid invitation
        </Text>
        <Text style={{ color: c.muted, textAlign: "center", marginTop: 8 }}>
          {getErrorMessage(
            verifyQuery.error,
            "Invitation code is invalid or expired.",
          )}
        </Text>
        <TouchableOpacity
          style={[styles.btn, { backgroundColor: c.primary, marginTop: 20 }]}
          onPress={() =>
            isLoggedIn
              ? navigation.replace("Home")
              : navigation.replace("Login")
          }
        >
          <Text style={styles.btnText}>
            {isLoggedIn ? "Back home" : "Back to login"}
          </Text>
        </TouchableOpacity>
      </View>
    );
  }

  const orgName =
    matchingInvite?.organisation?.name ||
    decoded?.organisation_name ||
    "Organisation";
  const invitedBy =
    matchingInvite?.employee?.creator?.full_name ||
    [
      matchingInvite?.employee?.creator?.first_name,
      matchingInvite?.employee?.creator?.last_name,
    ]
      .filter(Boolean)
      .join(" ") ||
    decoded?.invited_by ||
    "A teammate";

  return (
    <ScrollView
      style={{ flex: 1, backgroundColor: c.bg }}
      contentContainerStyle={styles.container}
    >
      <View
        style={[
          styles.card,
          { backgroundColor: c.surface, borderColor: c.border },
        ]}
      >
        <Text style={[styles.title, { color: c.text }]}>{orgName}</Text>
        <Text style={{ color: c.muted, marginTop: 8, lineHeight: 20 }}>
          {invitedBy} invited you
          {matchingInvite?.role?.name
            ? ` as ${matchingInvite.role.name}`
            : ""}
          {decoded?.employee_email ? `\n${decoded.employee_email}` : ""}
        </Text>
      </View>

      {!isLoggedIn ? (
        <View style={{ gap: 10 }}>
          <Text style={{ color: c.muted, marginBottom: 4 }}>
            Sign in or create an account to accept this invitation.
          </Text>
          <TouchableOpacity
            style={[styles.btn, { backgroundColor: c.primary }]}
            onPress={() =>
              navigation.navigate("Login", { invitationToken: token })
            }
          >
            <Text style={styles.btnText}>Sign in</Text>
          </TouchableOpacity>
          <TouchableOpacity
            style={[
              styles.btn,
              { backgroundColor: c.surface, borderWidth: 1, borderColor: c.border },
            ]}
            onPress={() =>
              navigation.navigate("Signup", { invitationToken: token })
            }
          >
            <Text style={[styles.btnText, { color: c.text }]}>
              Create account
            </Text>
          </TouchableOpacity>
        </View>
      ) : invitationsQuery.isLoading ? (
        <ActivityIndicator color={c.primary} />
      ) : matchingInvite ? (
        <TouchableOpacity
          style={[
            styles.btn,
            {
              backgroundColor: c.primary,
              opacity: acceptMutation.isPending ? 0.7 : 1,
            },
          ]}
          disabled={acceptMutation.isPending}
          onPress={() => acceptMutation.mutate(matchingInvite)}
        >
          {acceptMutation.isPending ? (
            <ActivityIndicator color="#fff" />
          ) : (
            <Text style={styles.btnText}>Accept invitation</Text>
          )}
        </TouchableOpacity>
      ) : (
        <Text style={{ color: c.muted, lineHeight: 20 }}>
          This invitation is not pending for your account. It may already have
          been accepted, or it was sent to a different email.
        </Text>
      )}
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  center: { flex: 1, alignItems: "center", justifyContent: "center" },
  container: { padding: spacing.lg, paddingBottom: spacing.xxl },
  card: {
    borderRadius: 16,
    borderWidth: 1,
    padding: spacing.lg,
    marginBottom: spacing.lg,
  },
  title: { fontSize: 22, fontWeight: "700" },
  btn: {
    borderRadius: 14,
    paddingVertical: 14,
    alignItems: "center",
  },
  btnText: { color: "#fff", fontWeight: "700" },
});
