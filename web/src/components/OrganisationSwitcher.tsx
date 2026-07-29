import { useEffect, useRef, useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import { useOrganisations } from "@mysheet/hooks";
import { ROUTES } from "@mysheet/constants";
import { getOrganisationRoleCode } from "@mysheet/utils";
import type { OrganisationMembership } from "@mysheet/types";
import { useOrganisationStore } from "@/store/organisationStore";

function asOrgs(data: unknown): OrganisationMembership[] {
  return (Array.isArray(data) ? data : []) as OrganisationMembership[];
}

export function OrganisationSwitcher() {
  const [open, setOpen] = useState(false);
  const rootRef = useRef<HTMLDivElement>(null);
  const navigate = useNavigate();
  const { data, isLoading } = useOrganisations({ rows_per_page: 50 });
  const organisations = asOrgs(data);
  const organisation = useOrganisationStore((s) => s.organisation);
  const setOrganisation = useOrganisationStore((s) => s.setOrganisation);

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

  const label = organisation?.name || "Organisations";

  return (
    <div className="relative" ref={rootRef}>
      <button
        type="button"
        onClick={() => setOpen((v) => !v)}
        className="inline-flex max-w-[220px] items-center gap-2 rounded-md border border-border bg-white px-3 py-2 text-sm font-medium text-dark hover:border-primary"
        aria-haspopup="listbox"
        aria-expanded={open}
      >
        <span className="truncate">{label}</span>
        <span className="text-muted">▾</span>
      </button>
      {open ? (
        <div className="absolute right-0 z-40 mt-2 w-72 overflow-hidden rounded-lg border border-border bg-white shadow-lg">
          <div className="border-b border-border px-3 py-2 text-xs font-semibold uppercase tracking-wide text-muted">
            Switch organisation
          </div>
          <div className="max-h-64 overflow-y-auto py-1">
            {isLoading ? (
              <p className="px-3 py-2 text-sm text-muted">Loading…</p>
            ) : null}
            {!isLoading && !organisations.length ? (
              <p className="px-3 py-2 text-sm text-muted">No organisations yet</p>
            ) : null}
            {organisations.map((org) => {
              const active = organisation?.code === org.code;
              return (
                <button
                  key={String(org.id)}
                  type="button"
                  onClick={() => selectOrg(org)}
                  className={`flex w-full flex-col px-3 py-2 text-left text-sm hover:bg-page ${
                    active ? "bg-primary/5 text-primary" : "text-dark"
                  }`}
                >
                  <span className="font-medium">{org.name}</span>
                  <span className="text-xs text-muted">{org.code}</span>
                </button>
              );
            })}
          </div>
          <div className="border-t border-border p-2">
            <Link
              to={ROUTES.createOrganisation}
              onClick={() => setOpen(false)}
              className="block rounded-md px-3 py-2 text-sm font-medium text-primary hover:bg-page"
            >
              + Create organisation
            </Link>
            <Link
              to={ROUTES.home}
              onClick={() => setOpen(false)}
              className="block rounded-md px-3 py-2 text-sm text-dark hover:bg-page"
            >
              All organisations
            </Link>
          </div>
        </div>
      ) : null}
    </div>
  );
}
