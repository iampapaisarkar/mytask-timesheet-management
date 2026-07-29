import { useQuery } from "@tanstack/react-query";
import { organisationsApi } from "@mytask/api";
import { getErrorMessage } from "@mytask/utils";
import { useOrganisationStore } from "@/store/organisationStore";
import { Card, PageHeader } from "@/components/ui/Card";
import { ErrorState, LoadingState } from "@/components/ui/States";

export function OrganisationDetailsPage() {
  const organisation = useOrganisationStore((s) => s.organisation);
  const orgCode = organisation?.code || "";

  const query = useQuery({
    queryKey: ["organisation-details", orgCode],
    queryFn: async () => {
      const res = await organisationsApi.get(orgCode);
      return res.data.data as Record<string, unknown>;
    },
    enabled: Boolean(orgCode),
  });

  if (query.isLoading) return <LoadingState />;
  if (query.isError) {
    return (
      <ErrorState
        message={getErrorMessage(query.error)}
        onRetry={() => void query.refetch()}
      />
    );
  }

  const data = query.data || {};
  const address = (data.address || {}) as Record<string, unknown>;
  const role = (data.role || {}) as { name?: string; code?: string };
  const state = (address.state || {}) as { name?: string };

  return (
    <div className="mt-fade-in flex flex-col gap-4">
      <PageHeader
        title="Organisation details"
        description="Core organisation information"
      />
      <div className="grid gap-4 sm:grid-cols-2">
        <Card>
          <p className="text-xs font-medium uppercase text-muted">Name</p>
          <p className="mt-1 text-lg font-semibold">{String(data.name || "—")}</p>
        </Card>
        <Card>
          <p className="text-xs font-medium uppercase text-muted">Code</p>
          <p className="mt-1 text-lg font-semibold">{String(data.code || "—")}</p>
        </Card>
        <Card>
          <p className="text-xs font-medium uppercase text-muted">Email</p>
          <p className="mt-1 text-lg font-semibold">
            {String(data.email || "—")}
          </p>
        </Card>
        <Card>
          <p className="text-xs font-medium uppercase text-muted">Phone</p>
          <p className="mt-1 text-lg font-semibold">
            {String(data.phone_number || "—")}
          </p>
        </Card>
        <Card>
          <p className="text-xs font-medium uppercase text-muted">Your role</p>
          <p className="mt-1 text-lg font-semibold">
            {role.name || role.code || "—"}
          </p>
        </Card>
        <Card>
          <p className="text-xs font-medium uppercase text-muted">Website</p>
          <p className="mt-1 text-lg font-semibold">
            {String(data.website || "—")}
          </p>
        </Card>
        <Card className="sm:col-span-2">
          <p className="text-xs font-medium uppercase text-muted">Address</p>
          <p className="mt-1 text-sm leading-relaxed text-[var(--mt-text)]">
            {[
              address.address_1,
              address.address_2,
              address.city,
              state.name,
              address.postcode,
            ]
              .filter(Boolean)
              .join(", ") || "—"}
          </p>
        </Card>
      </div>
    </div>
  );
}
