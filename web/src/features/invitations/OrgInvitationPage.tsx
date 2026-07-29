import { useEffect, useMemo, useState } from "react";
import { Link, useNavigate, useSearchParams } from "react-router-dom";
import { useMutation, useQuery } from "@tanstack/react-query";
import { authApi, organisationsApi } from "@mytask/api";
import { ROUTES } from "@mytask/constants";
import { getErrorMessage } from "@mytask/utils";
import type { OrganisationInvitation } from "@mytask/types";
import { Button } from "@/components/ui/Button";
import { Card } from "@/components/ui/Card";
import { ErrorState, LoadingState } from "@/components/ui/States";
import { useAuthStore } from "@/store/authStore";
import { useToastStore } from "@/store/toastStore";
import { decodeInvitationToken } from "@/features/invitations/decodeInvitationToken";
import { Building2 } from "lucide-react";

function asInvitations(data: unknown): OrganisationInvitation[] {
  return (Array.isArray(data) ? data : []) as OrganisationInvitation[];
}

export function OrgInvitationPage() {
  const [searchParams] = useSearchParams();
  const navigate = useNavigate();
  const token = searchParams.get("token") || "";
  const authToken = useAuthStore((s) => s.token);
  const hydrated = useAuthStore((s) => s.hydrated);
  const isLoggedIn = Boolean(authToken);
  const toast = useToastStore();

  const decoded = useMemo(() => decodeInvitationToken(token), [token]);
  const [verified, setVerified] = useState(false);
  const [verifyError, setVerifyError] = useState<string | null>(null);

  const verifyQuery = useQuery({
    queryKey: ["org-invitation-verify", token],
    queryFn: async () => {
      await authApi.verifyOrganisationInvitationToken({ token });
      return true;
    },
    enabled: Boolean(token) && hydrated,
    retry: false,
  });

  useEffect(() => {
    if (verifyQuery.isSuccess) {
      setVerified(true);
      setVerifyError(null);
    }
    if (verifyQuery.isError) {
      setVerified(false);
      setVerifyError(
        getErrorMessage(
          verifyQuery.error,
          "Invitation code is invalid or expired.",
        ),
      );
    }
  }, [verifyQuery.isSuccess, verifyQuery.isError, verifyQuery.error]);

  const invitationsQuery = useQuery({
    queryKey: ["organisation-invitations"],
    queryFn: async () => {
      const res = await organisationsApi.invitations();
      return asInvitations(res.data.data);
    },
    enabled: isLoggedIn && verified && Boolean(token),
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
    onSuccess: () => {
      toast.success("Invitation accepted", "Welcome to the organisation");
      navigate(ROUTES.home, { replace: true });
    },
    onError: (err) => {
      toast.error(
        "Unable to accept",
        getErrorMessage(err, "Could not accept invitation"),
      );
    },
  });

  if (!hydrated) {
    return <LoadingState label="Loading…" />;
  }

  if (!token) {
    return (
      <ErrorState message="Invitation link is missing a token." />
    );
  }

  if (verifyQuery.isLoading) {
    return <LoadingState label="Verifying invitation…" />;
  }

  if (verifyError) {
    return (
      <div className="flex flex-col gap-4">
        <ErrorState message={verifyError} />
        <Link to={ROUTES.login} className="text-center text-sm font-medium text-primary">
          Back to login
        </Link>
      </div>
    );
  }

  const orgName =
    matchingInvite?.organisation?.name ||
    decoded?.organisation_name ||
    "an organisation";
  const invitedBy =
    matchingInvite?.employee?.creator?.full_name ||
    decoded?.invited_by ||
    "Someone";

  const loginHref = `${ROUTES.login}?token=${encodeURIComponent(token)}`;
  const signupHref = `${ROUTES.signup}?token=${encodeURIComponent(token)}`;

  return (
    <div className="flex flex-col gap-6">
      <div className="text-center">
        <div className="mx-auto mb-4 flex h-14 w-14 items-center justify-center rounded-2xl bg-primary-muted text-primary">
          <Building2 size={24} />
        </div>
        <h1 className="text-2xl font-bold tracking-tight text-[var(--mt-text)]">
          Organisation invitation
        </h1>
        <p className="mt-2 text-sm text-muted">
          <span className="font-semibold text-[var(--mt-text)]">{invitedBy}</span>{" "}
          invited you to join{" "}
          <span className="font-semibold text-primary">{orgName}</span>
        </p>
      </div>

      <Card className="flex flex-col gap-4">
        {isLoggedIn ? (
          <>
            {invitationsQuery.isLoading ? (
              <LoadingState label="Loading invitation details…" />
            ) : invitationsQuery.isError ? (
              <ErrorState
                message={getErrorMessage(
                  invitationsQuery.error,
                  "Unable to load invitation",
                )}
                onRetry={() => void invitationsQuery.refetch()}
              />
            ) : matchingInvite ? (
              <>
                <p className="text-sm text-muted">
                  You are signed in. Accept to join this organisation and start
                  using myTask.
                </p>
                {matchingInvite.role?.name ? (
                  <p className="text-sm text-[var(--mt-text)]">
                    Role:{" "}
                    <span className="font-semibold">
                      {matchingInvite.role.name}
                    </span>
                  </p>
                ) : null}
                <Button
                  className="w-full"
                  loading={acceptMutation.isPending}
                  onClick={() => acceptMutation.mutate(matchingInvite)}
                >
                  Accept invitation
                </Button>
                <Link
                  to={ROUTES.home}
                  className="text-center text-sm font-medium text-muted hover:text-primary"
                >
                  Maybe later
                </Link>
              </>
            ) : (
              <>
                <p className="text-sm text-muted">
                  This invitation is linked to your account. Open your home
                  inbox to accept it, or refresh if it does not appear yet.
                </p>
                <Button
                  variant="secondary"
                  className="w-full"
                  onClick={() => void invitationsQuery.refetch()}
                >
                  Refresh
                </Button>
                <Link to={ROUTES.home}>
                  <Button className="w-full">Go to home</Button>
                </Link>
              </>
            )}
          </>
        ) : (
          <>
            <p className="text-sm text-muted">
              Log in or create an account to accept this invitation. Your invite
              token will be preserved.
            </p>
            <div className="flex flex-col gap-3">
              <p className="text-xs font-medium uppercase tracking-wide text-muted">
                Already have an account?
              </p>
              <Link to={loginHref}>
                <Button className="w-full">Login and accept</Button>
              </Link>
              <div className="relative py-1 text-center text-xs text-muted">
                <span className="bg-[var(--mt-surface)] px-2">or</span>
              </div>
              <p className="text-xs font-medium uppercase tracking-wide text-muted">
                Don&apos;t have an account?
              </p>
              <Link to={signupHref}>
                <Button variant="secondary" className="w-full">
                  Signup and accept
                </Button>
              </Link>
            </div>
          </>
        )}
      </Card>
    </div>
  );
}
