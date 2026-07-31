import { useEffect, useRef, useState } from "react";
import { Link, useNavigate, useParams } from "react-router-dom";
import { useQueryClient } from "@tanstack/react-query";
import { useHomeBootstrap, useOrgBootstrap } from "@mytask/hooks";
import { ROUTES } from "@mytask/constants";
import { getOrganisationRoleCode } from "@mytask/utils";
import type { OrganisationMembership } from "@mytask/types";
import { HomePage, OrganisationHomePage } from "@/app/routeModules";
import { useOrganisationStore } from "@/store/organisationStore";
import { ChevronDown, Home, Building2 } from "lucide-react";
import { clsx } from "clsx";

function asOrgs(data: unknown): OrganisationMembership[] {
  return (Array.isArray(data) ? data : []) as OrganisationMembership[];
}

export function OrganisationSwitcher() {
  const [open, setOpen] = useState(false);
  const rootRef = useRef<HTMLDivElement>(null);
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  const { orgCode } = useParams();
  const inOrg = Boolean(orgCode);

  const orgBootstrap = useOrgBootstrap(orgCode || "", inOrg);
  const homeBootstrap = useHomeBootstrap(!inOrg);

  const organisations = asOrgs(
    inOrg
      ? orgBootstrap.data?.organisations
      : homeBootstrap.data?.organisations,
  );
  const isLoading = inOrg ? orgBootstrap.isLoading : homeBootstrap.isLoading;

  const organisation = useOrganisationStore((s) => s.organisation);
  const setOrganisation = useOrganisationStore((s) => s.setOrganisation);
  const clearOrganisation = useOrganisationStore((s) => s.clear);

  useEffect(() => {
    function onDocClick(event: MouseEvent) {
      if (!rootRef.current?.contains(event.target as Node)) {
        setOpen(false);
      }
    }
    document.addEventListener("mousedown", onDocClick);
    return () => document.removeEventListener("mousedown", onDocClick);
  }, []);

  function selectOrg(org: OrganisationMembership) {
    setOrganisation({
      id: org.id,
      code: org.code,
      name: org.name,
      role: getOrganisationRoleCode(org),
    });
    setOpen(false);
    navigate(ROUTES.org(org.code));
  }

  function backToMyTask() {
    clearOrganisation();
    // Drop org-scoped caches so the personal workspace is fresh
    void queryClient.removeQueries({ queryKey: ["screens", "org-bootstrap"] });
    void queryClient.removeQueries({ queryKey: ["screens", "dashboard"] });
    setOpen(false);
    navigate(ROUTES.home);
  }

  const label = organisation?.name || "Organisations";

  return (
    <div className="relative" ref={rootRef}>
      <button
        type="button"
        onClick={() => setOpen((v) => !v)}
        className="mt-focus inline-flex h-10 max-w-[7.5rem] items-center gap-1 rounded-xl border border-border bg-[var(--mt-surface)] px-2 text-xs font-medium text-[var(--mt-text)] hover:border-primary sm:max-w-[10rem] sm:gap-1.5 sm:px-2.5 sm:text-sm md:max-w-[14rem] lg:max-w-[220px] lg:px-3"
        aria-haspopup="listbox"
        aria-expanded={open}
        aria-label={`Organisation: ${label}`}
      >
        <Building2 size={14} className="hidden shrink-0 text-primary min-[380px]:inline" />
        <span className="truncate">{label}</span>
        <ChevronDown size={14} className="shrink-0 text-muted" />
      </button>
      {open ? (
        <div className="absolute right-0 z-40 mt-2 w-[min(18rem,calc(100vw-1.5rem))] overflow-hidden rounded-2xl border border-border bg-[var(--mt-surface)] shadow-lg">
          <div className="max-h-[min(18rem,50vh)] overflow-y-auto p-2">
            {isLoading ? (
              <p className="px-3 py-2 text-sm text-muted">Loading…</p>
            ) : organisations.length === 0 ? (
              <p className="px-3 py-2 text-sm text-muted">No organisations</p>
            ) : (
              organisations.map((org) => (
                <button
                  key={String(org.id)}
                  type="button"
                  role="option"
                  aria-selected={organisation?.code === org.code}
                  onMouseEnter={() => void OrganisationHomePage.preload()}
                  onFocus={() => void OrganisationHomePage.preload()}
                  onClick={() => selectOrg(org)}
                  className={clsx(
                    "flex w-full flex-col rounded-xl px-3 py-2.5 text-left text-sm hover:bg-primary-muted",
                    organisation?.code === org.code && "bg-primary-muted",
                  )}
                >
                  <span className="font-medium text-[var(--mt-text)]">
                    {org.name}
                  </span>
                  <span className="text-xs text-muted">
                    {getOrganisationRoleCode(org) || org.code}
                  </span>
                </button>
              ))
            )}
          </div>
          <div className="border-t border-border p-2">
            {inOrg ? (
              <button
                type="button"
                onMouseEnter={() => void HomePage.preload()}
                onFocus={() => void HomePage.preload()}
                onClick={backToMyTask}
                className="mb-1 flex w-full items-center gap-2 rounded-xl px-3 py-2 text-sm font-medium text-[var(--mt-text)] hover:bg-primary-muted"
              >
                <Home size={14} className="text-primary" />
                Back to myTask
              </button>
            ) : null}
            <Link
              to={ROUTES.createOrganisation}
              onClick={() => setOpen(false)}
              className="block rounded-xl px-3 py-2 text-sm font-medium text-primary hover:bg-primary-muted"
            >
              Create organisation
            </Link>
          </div>
        </div>
      ) : null}
    </div>
  );
}
