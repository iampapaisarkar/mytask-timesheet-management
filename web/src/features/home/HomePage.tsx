import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { Link } from "react-router-dom";
import { organisationsApi } from "@mytask/api";
import { useOrganisations } from "@mytask/hooks";
import { ROUTES } from "@mytask/constants";
import { getErrorMessage, getOrganisationRoleCode } from "@mytask/utils";
import type {
  OrganisationInvitation,
  OrganisationMembership,
} from "@mytask/types";
import { EmptyState, ErrorState, LoadingState } from "@/components/ui/States";
import { Button } from "@/components/ui/Button";
import { Card, PageHeader } from "@/components/ui/Card";
import { useOrganisationStore } from "@/store/organisationStore";
import { useToastStore } from "@/store/toastStore";
import { ArrowRight, Building2, Mail, Plus } from "lucide-react";

function asInvitations(data: unknown): OrganisationInvitation[] {
  return (Array.isArray(data) ? data : []) as OrganisationInvitation[];
}

export function HomePage() {
  const qc = useQueryClient();
  const toast = useToastStore();
  const {
    data,
    isLoading,
    isError,
    error,
    refetch,
  } = useOrganisations({
    rows_per_page: 50,
  });
  const setOrganisation = useOrganisationStore((s) => s.setOrganisation);
  const organisations = (data || []) as OrganisationMembership[];

  const invitationsQuery = useQuery({
    queryKey: ["organisation-invitations"],
    queryFn: async () => {
      const res = await organisationsApi.invitations();
      return asInvitations(res.data.data);
    },
  });

  const invitations = invitationsQuery.data || [];

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
        qc.invalidateQueries({ queryKey: ["organisation-invitations"] }),
        qc.invalidateQueries({ queryKey: ["organisations"] }),
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
        qc.invalidateQueries({ queryKey: ["organisation-invitations"] }),
        qc.invalidateQueries({ queryKey: ["organisations"] }),
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

  if (isLoading) return <LoadingState label="Loading organisations…" />;
  if (isError) {
    return (
      <ErrorState
        message={
          error instanceof Error ? error.message : "Failed to load organisations"
        }
        onRetry={() => refetch()}
      />
    );
  }

  const invitationsSection =
    invitations.length > 0 ? (
      <section className="flex flex-col gap-3">
        <h2 className="text-lg font-semibold text-[var(--mt-text)]">
          Pending invitations
        </h2>
        <div className="flex flex-col gap-3">
          {invitations.map((invite) => {
            const invitedBy =
              invite.employee?.creator?.full_name ||
              [invite.employee?.creator?.first_name, invite.employee?.creator?.last_name]
                .filter(Boolean)
                .join(" ") ||
              "A teammate";
            const orgName = invite.organisation?.name || "Organisation";
            const isBusy = busyId === invite.id;
            return (
              <Card
                key={String(invite.id)}
                className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between"
              >
                <div className="flex items-start gap-3">
                  <div className="rounded-xl bg-primary-muted p-2.5 text-primary">
                    <Mail size={18} />
                  </div>
                  <div>
                    <div className="font-semibold text-[var(--mt-text)]">
                      {orgName}
                    </div>
                    <p className="mt-0.5 text-sm text-muted">
                      {invitedBy} invited you
                      {invite.role?.name ? ` as ${invite.role.name}` : ""}
                    </p>
                  </div>
                </div>
                <div className="flex shrink-0 gap-2">
                  <Button
                    loading={isBusy && acceptMutation.isPending}
                    disabled={Boolean(busyId)}
                    onClick={() => acceptMutation.mutate(invite)}
                  >
                    Accept
                  </Button>
                  <Button
                    variant="secondary"
                    loading={isBusy && rejectMutation.isPending}
                    disabled={Boolean(busyId)}
                    onClick={() => rejectMutation.mutate(invite)}
                  >
                    Reject
                  </Button>
                </div>
              </Card>
            );
          })}
        </div>
      </section>
    ) : null;

  if (!organisations.length) {
    return (
      <div className="flex flex-col gap-6">
        {invitationsSection}
        <EmptyState
          title="No organisations yet"
          description="Create an organisation to start managing timesheets, or accept an invitation."
          action={
            <Link to={ROUTES.createOrganisation}>
              <Button>
                <Plus size={16} />
                Create organisation
              </Button>
            </Link>
          }
        />
      </div>
    );
  }

  return (
    <div className="flex flex-col gap-6">
      <PageHeader
        title="Your organisations"
        description="Select an organisation to continue"
        actions={
          <Link to={ROUTES.createOrganisation}>
            <Button>
              <Plus size={16} />
              Create organisation
            </Button>
          </Link>
        }
      />
      {invitationsSection}
      <div className="grid gap-4 sm:grid-cols-2">
        {organisations.map((org) => (
          <Link
            key={String(org.id)}
            to={ROUTES.org(org.code)}
            onClick={() =>
              setOrganisation({
                id: org.id,
                code: org.code,
                name: org.name,
                role: getOrganisationRoleCode(org),
              })
            }
            className="group block"
          >
            <Card hover className="flex items-center justify-between gap-4">
              <div className="flex items-center gap-3">
                <div className="rounded-xl bg-primary-muted p-2.5 text-primary">
                  <Building2 size={20} />
                </div>
                <div>
                  <div className="font-semibold text-[var(--mt-text)]">
                    {org.name}
                  </div>
                  <div className="mt-0.5 text-xs text-muted">{org.code}</div>
                </div>
              </div>
              <ArrowRight
                size={18}
                className="text-muted transition group-hover:translate-x-0.5 group-hover:text-primary"
              />
            </Card>
          </Link>
        ))}
      </div>
    </div>
  );
}
