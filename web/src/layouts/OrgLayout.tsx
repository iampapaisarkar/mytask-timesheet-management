import { Link, NavLink, Outlet, useParams } from "react-router-dom";
import { APP_NAME, ORG_NAV, ROUTES } from "@mysheet/constants";
import { can, getOrganisationAcl } from "@mysheet/services";
import type { CrudPermission, OrganisationAcl } from "@mysheet/types";
import { useOrganisationStore } from "@/store/organisationStore";
import { useAuthStore } from "@/store/authStore";
import { displayName } from "@mysheet/utils";

export function OrgLayout() {
  const { orgCode = "" } = useParams();
  const organisation = useOrganisationStore((s) => s.organisation);
  const user = useAuthStore((s) => s.user);
  const role = organisation?.role || organisation?.role_code;
  const acl = getOrganisationAcl(role);

  const items = ORG_NAV.filter((item) => {
    if (!item.acl) return true;
    return can(
      acl,
      item.acl.action as keyof OrganisationAcl,
      item.acl.permission as keyof CrudPermission,
    );
  });

  return (
    <div className="flex min-h-screen bg-page">
      <aside className="flex w-64 flex-col border-r border-border bg-dark text-white">
        <div className="border-b border-white/10 px-5 py-4">
          <Link to={ROUTES.home} className="text-lg font-bold text-white">
            {APP_NAME}
          </Link>
          <p className="mt-1 truncate text-xs text-white/70">
            {organisation?.name || orgCode}
          </p>
        </div>
        <nav className="flex flex-1 flex-col gap-1 p-3">
          {items.map((item) => {
            const to = item.path
              ? `/org/${orgCode}/${item.path}`
              : `/org/${orgCode}`;
            return (
              <NavLink
                key={item.key}
                to={to}
                end={!item.path}
                className={({ isActive }) =>
                  `rounded-md px-3 py-2 text-sm transition ${
                    isActive
                      ? "bg-primary text-white"
                      : "text-white/80 hover:bg-white/10"
                  }`
                }
              >
                {item.label}
              </NavLink>
            );
          })}
        </nav>
        <div className="border-t border-white/10 px-4 py-3 text-xs text-white/70">
          <Link to={ROUTES.profile} className="hover:text-white">
            {user ? displayName(user) : "Profile"}
          </Link>
        </div>
      </aside>
      <div className="flex min-w-0 flex-1 flex-col">
        <header className="flex items-center justify-between border-b border-border bg-white px-6 py-3">
          <h1 className="text-base font-semibold text-dark">
            {organisation?.name || "Organisation"}
          </h1>
          <Link to={ROUTES.home} className="text-sm text-primary">
            Switch organisation
          </Link>
        </header>
        <main className="flex-1 p-6">
          <Outlet />
        </main>
      </div>
    </div>
  );
}
