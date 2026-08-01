import { useMemo } from "react";
import { ActivityIndicator, ScrollView, StyleSheet, Text, View } from "react-native";
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
import { Button, Card, ErrorState } from "../ui";

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
      <View style={{ flex: 1, backgroundColor: c.bg }}>
        <ErrorState
          title="Invalid invitation"
          description={getErrorMessage(
            verifyQuery.error,
            "Invitation code is invalid or expired.",
          )}
          retryLabel={isLoggedIn ? "Back home" : "Back to login"}
          onRetry={() =>
            isLoggedIn
              ? navigation.replace("Home")
              : navigation.replace("Login")
          }
        />
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
      <Card style={styles.card}>
        <Text style={[styles.title, { color: c.text }]}>{orgName}</Text>
        <Text style={{ color: c.muted, marginTop: 8, lineHeight: 20 }}>
          {invitedBy} invited you
          {matchingInvite?.role?.name
            ? ` as ${matchingInvite.role.name}`
            : ""}
          {decoded?.employee_email ? `\n${decoded.employee_email}` : ""}
        </Text>
      </Card>

      {!isLoggedIn ? (
        <View style={styles.actionGap}>
          <Text style={{ color: c.muted, marginBottom: 4 }}>
            Sign in or create an account to accept this invitation.
          </Text>
          <Button
            title="Sign in"
            onPress={() =>
              navigation.navigate("Login", { invitationToken: token })
            }
          />
          <Button
            title="Create account"
            variant="outline"
            onPress={() =>
              navigation.navigate("Signup", { invitationToken: token })
            }
          />
        </View>
      ) : invitationsQuery.isLoading ? (
        <ActivityIndicator color={c.primary} />
      ) : matchingInvite ? (
        <Button
          title="Accept invitation"
          loading={acceptMutation.isPending}
          onPress={() => acceptMutation.mutate(matchingInvite)}
        />
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
  card: { marginBottom: spacing.lg },
  title: { fontSize: 22, fontWeight: "700" },
  actionGap: { gap: 10 },
});
