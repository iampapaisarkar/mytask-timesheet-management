import { Link } from "react-router-dom";
import { useOrganisations } from "@mytask/hooks";
import { ROUTES } from "@mytask/constants";
import { getOrganisationRoleCode } from "@mytask/utils";
import { EmptyState, ErrorState, LoadingState } from "@/components/ui/States";
import { Button } from "@/components/ui/Button";
import { Card, PageHeader } from "@/components/ui/Card";
import { useOrganisationStore } from "@/store/organisationStore";
import type { OrganisationMembership } from "@mytask/types";
import { ArrowRight, Building2, Plus } from "lucide-react";

export function HomePage() {
  const { data, isLoading, isError, error, refetch } = useOrganisations({
    rows_per_page: 50,
  });
  const setOrganisation = useOrganisationStore((s) => s.setOrganisation);
  const organisations = (data || []) as OrganisationMembership[];

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

  if (!organisations.length) {
    return (
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
