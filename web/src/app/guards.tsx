import { Navigate, Outlet, useLocation, useParams, Link } from "react-router-dom";
import { useAuthStore } from "@/store/authStore";
import { useOrganisationStore } from "@/store/organisationStore";
import { ROUTES } from "@mytask/constants";
import { can, getOrganisationAcl } from "@mytask/services";
import type { CrudPermission, OrganisationAcl, OrgAclRequirement } from "@mytask/types";
import { Card } from "@/components/ui/Card";

export function ProtectedRoute() {
  const token = useAuthStore((s) => s.token);
  const hydrated = useAuthStore((s) => s.hydrated);
  const location = useLocation();

  if (!hydrated) {
    return <div className="flex min-h-screen items-center justify-center">Loading…</div>;
  }

  if (!token) {
    return <Navigate to={ROUTES.login} replace state={{ from: location }} />;
  }

  return <Outlet />;
}

export function GuestRoute() {
  const token = useAuthStore((s) => s.token);
  const hydrated = useAuthStore((s) => s.hydrated);

  if (!hydrated) {
    return <div className="flex min-h-screen items-center justify-center">Loading…</div>;
  }

  if (token) {
    return <Navigate to={ROUTES.home} replace />;
  }

  return <Outlet />;
}

/**
 * Route-level ACL guard for organisation child routes.
 * Pass `acl` from ORG_NAV / ORG_ROUTE_ACL (Vue meta.acl parity).
 */
export function OrgAclRoute({
  acl,
}: {
  acl: OrgAclRequirement | null | undefined;
}) {
  const { orgCode = "" } = useParams();
  const organisation = useOrganisationStore((s) => s.organisation);
  const role = organisation?.role || organisation?.role_code;
  const orgAcl = getOrganisationAcl(role);

  if (!acl) {
    return <Outlet />;
  }

  const allowed = can(
    orgAcl,
    acl.action as keyof OrganisationAcl,
    acl.permission as keyof CrudPermission,
  );

  if (!allowed) {
    return (
      <Card className="mt-fade-in mx-auto max-w-lg text-center">
        <h1 className="text-xl font-bold text-[var(--mt-text)]">Access denied</h1>
        <p className="mt-2 text-sm text-muted">
          You do not have permission to view this page in the current
          organisation.
        </p>
        <Link
          to={ROUTES.orgHome(orgCode)}
          className="mt-4 inline-block text-sm font-semibold text-primary"
        >
          Back to organisation home
        </Link>
      </Card>
    );
  }

  return <Outlet />;
}
