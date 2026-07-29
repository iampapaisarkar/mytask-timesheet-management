import { Link } from "react-router-dom";
import { useOrganisations } from "@mysheet/hooks";
import { ROUTES } from "@mysheet/constants";
import { EmptyState, ErrorState, LoadingState } from "@/components/ui/States";
import { useOrganisationStore } from "@/store/organisationStore";
import type { OrganisationMembership } from "@mysheet/types";

export function HomePage() {
  const { data, isLoading, isError, error, refetch } = useOrganisations();
  const setOrganisation = useOrganisationStore((s) => s.setOrganisation);
  const organisations = (data || []) as OrganisationMembership[];

  if (isLoading) return <LoadingState label="Loading organisations…" />;
  if (isError) {
    return (
      <ErrorState
        message={error instanceof Error ? error.message : "Failed to load organisations"}
        onRetry={() => refetch()}
      />
    );
  }

  if (!organisations.length) {
    return (
      <EmptyState
        title="No organisations yet"
        description="Create or accept an invitation to get started."
      />
    );
  }

  return (
    <div className="flex flex-col gap-6">
      <div>
        <h1 className="text-2xl font-semibold">Your organisations</h1>
        <p className="text-sm text-muted">Select an organisation to continue</p>
      </div>
      <div className="grid gap-3 sm:grid-cols-2">
        {organisations.map((org) => (
          <Link
            key={String(org.id)}
            to={ROUTES.org(org.code)}
            onClick={() =>
              setOrganisation({
                id: org.id,
                code: org.code,
                name: org.name,
                role: (org.role || org.role_code) as string,
              })
            }
            className="rounded-lg border border-border bg-white p-5 shadow-sm transition hover:border-primary"
          >
            <div className="font-semibold text-dark">{org.name}</div>
            <div className="mt-1 text-xs text-muted">{org.code}</div>
          </Link>
        ))}
      </div>
    </div>
  );
}
