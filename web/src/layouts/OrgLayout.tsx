import { Link, NavLink, Outlet, useParams } from "react-router-dom";
import { ORG_NAV, ROUTES } from "@mytask/constants";
import { can, getOrganisationAcl } from "@mytask/services";
import type { CrudPermission, OrganisationAcl } from "@mytask/types";
import { useOrganisationStore } from "@/store/organisationStore";
import { useAuthStore } from "@/store/authStore";
import { displayName } from "@mytask/utils";
import { OrganisationSwitcher } from "@/components/OrganisationSwitcher";
import { ThemeToggle } from "@/components/ThemeToggle";
import { useSidebarStore } from "@/store/sidebarStore";
import {
  Briefcase,
  Building2,
  CalendarDays,
  ChevronLeft,
  ChevronRight,
  ClipboardList,
  FileBarChart2,
  Home,
  Settings,
  Users,
  UsersRound,
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
  const organisation = useOrganisationStore((s) => s.organisation);
  const user = useAuthStore((s) => s.user);
  const collapsed = useSidebarStore((s) => s.collapsed);
  const toggleSidebar = useSidebarStore((s) => s.toggle);
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
      <aside
        className={clsx(
          "sticky top-0 flex h-screen flex-col border-r border-white/10 bg-[var(--mt-sidebar)] text-[var(--mt-sidebar-text)] transition-[width] duration-300 ease-out",
          collapsed ? "w-[72px]" : "w-64",
        )}
      >
        <div
          className={clsx(
            "flex items-center gap-2.5 border-b border-white/10 px-3 py-4",
            collapsed ? "justify-center" : "px-4",
          )}
        >
          <Link to={ROUTES.home} className="mt-focus shrink-0">
            <img
              src="/logo.png"
              alt="myTask"
              className="h-9 w-9 rounded-xl object-cover"
            />
          </Link>
          {!collapsed ? (
            <div className="min-w-0">
              <div className="truncate text-sm font-bold text-white">myTask</div>
              <p className="truncate text-[11px] text-white/60">
                {organisation?.name || orgCode}
              </p>
            </div>
          ) : null}
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
                    collapsed && "justify-center px-2",
                    isActive
                      ? "bg-primary text-white shadow-lg shadow-primary/25"
                      : "text-white/75 hover:bg-white/10 hover:text-white",
                  )
                }
              >
                <Icon size={18} className="shrink-0" />
                {!collapsed ? <span className="truncate">{item.label}</span> : null}
              </NavLink>
            );
          })}
        </nav>
        <div className="border-t border-white/10 p-2">
          <button
            type="button"
            onClick={toggleSidebar}
            className={clsx(
              "mt-focus flex w-full items-center gap-2 rounded-xl px-3 py-2 text-xs text-white/70 hover:bg-white/10 hover:text-white",
              collapsed && "justify-center",
            )}
            aria-label={collapsed ? "Expand sidebar" : "Collapse sidebar"}
          >
            {collapsed ? <ChevronRight size={16} /> : <ChevronLeft size={16} />}
            {!collapsed ? <span>Collapse</span> : null}
          </button>
          {!collapsed ? (
            <Link
              to={ROUTES.profile}
              className="mt-1 block truncate px-3 py-2 text-xs text-white/60 hover:text-white"
            >
              {user ? displayName(user) : "Profile"}
            </Link>
          ) : null}
        </div>
      </aside>
      <div className="flex min-w-0 flex-1 flex-col">
        <header className="sticky top-0 z-30 flex items-center justify-between gap-4 border-b border-border bg-[var(--mt-surface)]/90 px-4 py-3 backdrop-blur-md sm:px-6">
          <h1 className="truncate text-base font-semibold text-[var(--mt-text)]">
            {organisation?.name || "Organisation"}
          </h1>
          <div className="flex items-center gap-2">
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
