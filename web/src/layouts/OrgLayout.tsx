import { useEffect } from "react";
import { Link, NavLink, Outlet, useLocation, useParams } from "react-router-dom";
import { useOrgBootstrap } from "@mytask/hooks";
import { ORG_NAV, ROUTES } from "@mytask/constants";
import { can, getOrganisationAcl } from "@mytask/services";
import type { CrudPermission, OrganisationAcl } from "@mytask/types";
import { getErrorMessage, getOrganisationRoleCode } from "@mytask/utils";
import { useOrganisationStore } from "@/store/organisationStore";
import { useAuthStore } from "@/store/authStore";
import { displayName } from "@mytask/utils";
import { OrganisationSwitcher } from "@/components/OrganisationSwitcher";
import { NotificationsBell } from "@/features/notifications";
import { ThemeToggle } from "@/components/ThemeToggle";
import { useSidebarStore } from "@/store/sidebarStore";
import { ErrorState, LoadingState } from "@/components/ui/States";
import {
  Briefcase,
  Building2,
  CalendarDays,
  ChevronLeft,
  ChevronRight,
  ClipboardList,
  FileBarChart2,
  Home,
  Menu,
  Settings,
  Users,
  UsersRound,
  X,
} from "lucide-react";
import { clsx } from "clsx";

const ICONS: Record<string, typeof Home> = {
  home: Home,
  timesheet: CalendarDays,
  timesheetManagement: ClipboardList,
  reports: FileBarChart2,
  employees: Users,
  customers: Building2,
  managementGroup: UsersRound,
  jobs: Briefcase,
  settings: Settings,
};

export function OrgLayout() {
  const { orgCode = "" } = useParams();
  const location = useLocation();
  const organisation = useOrganisationStore((s) => s.organisation);
  const setOrganisation = useOrganisationStore((s) => s.setOrganisation);
  const user = useAuthStore((s) => s.user);
  const collapsed = useSidebarStore((s) => s.collapsed);
  const mobileOpen = useSidebarStore((s) => s.mobileOpen);
  const toggleSidebar = useSidebarStore((s) => s.toggle);
  const setMobileOpen = useSidebarStore((s) => s.setMobileOpen);
  const toggleMobile = useSidebarStore((s) => s.toggleMobile);

  const needsSync = !organisation || organisation.code !== orgCode;

  const bootstrapQuery = useOrgBootstrap(orgCode, Boolean(orgCode));
  const orgData = bootstrapQuery.data?.organisation as
    | Record<string, unknown>
    | undefined;

  useEffect(() => {
    if (!orgData) return;
    setOrganisation({
      id: orgData.id as string | number,
      code: String(orgData.code || orgCode),
      name: String(orgData.name || orgCode),
      role: getOrganisationRoleCode(orgData as never),
      role_code: getOrganisationRoleCode(orgData as never),
    });
  }, [orgData, orgCode, setOrganisation]);

  useEffect(() => {
    setMobileOpen(false);
  }, [location.pathname, setMobileOpen]);

  useEffect(() => {
    const mq = window.matchMedia("(min-width: 768px)");
    const onChange = () => {
      if (mq.matches) setMobileOpen(false);
    };
    mq.addEventListener("change", onChange);
    return () => mq.removeEventListener("change", onChange);
  }, [setMobileOpen]);

  useEffect(() => {
    if (!mobileOpen) return;
    const prev = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    return () => {
      document.body.style.overflow = prev;
    };
  }, [mobileOpen]);

  const role = organisation?.role || organisation?.role_code;
  const acl = getOrganisationAcl(role);
  const showLabels = !collapsed;

  const items = ORG_NAV.filter((item) => {
    if (!item.acl) return true;
    return can(
      acl,
      item.acl.action as keyof OrganisationAcl,
      item.acl.permission as keyof CrudPermission,
    );
  });

  if (needsSync && bootstrapQuery.isLoading) {
    return (
      <div className="min-h-screen bg-page p-6">
        <LoadingState label="Loading organisation…" />
      </div>
    );
  }

  if (needsSync && bootstrapQuery.isError) {
    return (
      <div className="min-h-screen bg-page p-6">
        <ErrorState
          message={getErrorMessage(
            bootstrapQuery.error,
            "Unable to open organisation",
          )}
          onRetry={() => void bootstrapQuery.refetch()}
        />
        <div className="mt-4 text-center">
          <Link to={ROUTES.home} className="text-sm font-medium text-primary">
            Back to organisations
          </Link>
        </div>
      </div>
    );
  }

  if (!organisation || organisation.code !== orgCode) {
    return (
      <div className="min-h-screen bg-page p-6">
        <LoadingState label="Preparing organisation…" />
      </div>
    );
  }

  return (
    <div className="flex min-h-screen bg-page">
      <button
        type="button"
        aria-label="Close menu"
        onClick={() => setMobileOpen(false)}
        className={clsx(
          "fixed inset-0 z-40 bg-black/50 backdrop-blur-[2px] transition-opacity duration-300 md:hidden",
          mobileOpen ? "opacity-100" : "pointer-events-none opacity-0",
        )}
      />

      <aside
        id="org-sidebar"
        className={clsx(
          "flex flex-col border-r border-white/10 bg-[var(--mt-sidebar)] text-[var(--mt-sidebar-text)] transition-transform duration-300 ease-out md:sticky md:top-0 md:h-screen md:transition-[width] md:duration-300",
          "fixed inset-y-0 left-0 z-50 w-[min(100vw-3rem,18rem)] shadow-2xl md:static md:z-auto md:shadow-none",
          mobileOpen ? "translate-x-0" : "-translate-x-full md:translate-x-0",
          collapsed ? "md:w-[72px]" : "md:w-64",
        )}
      >
        <div
          className={clsx(
            "flex items-center gap-2.5 border-b border-white/10 px-4 py-4",
            collapsed && "md:justify-center md:px-3",
          )}
        >
          <Link
            to={ROUTES.home}
            className="mt-focus shrink-0"
            onClick={() => setMobileOpen(false)}
          >
            <img
              src="/logo.png"
              alt="myTask"
              className="h-9 w-9 rounded-xl object-cover"
            />
          </Link>
          <div className={clsx("min-w-0 flex-1", collapsed && "md:hidden")}>
            <div className="truncate text-sm font-bold text-white">myTask</div>
            <p className="truncate text-[11px] text-white/60">
              {organisation?.name || orgCode}
            </p>
          </div>
          <button
            type="button"
            onClick={() => setMobileOpen(false)}
            className="mt-focus rounded-lg p-1.5 text-white/70 hover:bg-white/10 hover:text-white md:hidden"
            aria-label="Close menu"
          >
            <X size={18} />
          </button>
        </div>

        <nav className="flex flex-1 flex-col gap-1 overflow-y-auto p-2">
          {items.map((item) => {
            const to = item.path
              ? `/org/${orgCode}/${item.path}`
              : `/org/${orgCode}`;
            const Icon = ICONS[item.key] || Home;
            return (
              <NavLink
                key={item.key}
                to={to}
                end={!item.path}
                title={item.label}
                className={({ isActive }) =>
                  clsx(
                    "mt-focus group relative flex items-center gap-3 rounded-xl px-3 py-2.5 text-sm font-medium transition",
                    collapsed && "md:justify-center md:px-2",
                    isActive
                      ? "bg-primary text-white shadow-lg shadow-primary/25"
                      : "text-white/75 hover:bg-white/10 hover:text-white",
                  )
                }
              >
                <Icon size={18} className="shrink-0" />
                <span className={clsx("truncate", collapsed && "md:hidden")}>
                  {item.label}
                </span>
              </NavLink>
            );
          })}
        </nav>

        <div className="border-t border-white/10 p-2">
          <button
            type="button"
            onClick={toggleSidebar}
            className={clsx(
              "mt-focus hidden w-full items-center gap-2 rounded-xl px-3 py-2 text-xs text-white/70 hover:bg-white/10 hover:text-white md:flex",
              collapsed && "justify-center",
            )}
            aria-label={collapsed ? "Expand sidebar" : "Collapse sidebar"}
          >
            {collapsed ? <ChevronRight size={16} /> : <ChevronLeft size={16} />}
            {showLabels ? <span>Collapse</span> : null}
          </button>
          <Link
            to={ROUTES.profile}
            onClick={() => setMobileOpen(false)}
            className={clsx(
              "mt-1 block truncate px-3 py-2 text-xs text-white/60 hover:text-white",
              collapsed && "md:hidden",
            )}
          >
            {user ? displayName(user) : "Profile"}
          </Link>
        </div>
      </aside>

      <div className="flex min-w-0 flex-1 flex-col">
        <header className="sticky top-0 z-30 flex items-center justify-between gap-3 border-b border-border bg-[var(--mt-surface)]/90 px-3 py-3 backdrop-blur-md sm:px-6">
          <div className="flex min-w-0 items-center gap-2">
            <button
              type="button"
              onClick={toggleMobile}
              className="mt-focus inline-flex h-9 w-9 shrink-0 items-center justify-center rounded-xl border border-border bg-[var(--mt-surface)] text-[var(--mt-text)] hover:border-primary md:hidden"
              aria-label="Open menu"
              aria-expanded={mobileOpen}
              aria-controls="org-sidebar"
            >
              <Menu size={18} />
            </button>
            <h1 className="truncate text-base font-semibold text-[var(--mt-text)]">
              {organisation?.name || "Organisation"}
            </h1>
          </div>
          <div className="flex shrink-0 items-center gap-2">
            <NotificationsBell />
            <OrganisationSwitcher />
            <ThemeToggle />
          </div>
        </header>
        <main className="flex-1 p-4 sm:p-6">
          <Outlet />
        </main>
      </div>
    </div>
  );
}
