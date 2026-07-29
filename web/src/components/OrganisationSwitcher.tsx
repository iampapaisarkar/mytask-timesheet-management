import { useEffect, useRef, useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import { useOrganisations } from "@mytask/hooks";
import { ROUTES } from "@mytask/constants";
import { getOrganisationRoleCode } from "@mytask/utils";
import type { OrganisationMembership } from "@mytask/types";
import { useOrganisationStore } from "@/store/organisationStore";
import { ChevronDown } from "lucide-react";
import { clsx } from "clsx";

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
        className="mt-focus inline-flex max-w-[220px] items-center gap-2 rounded-xl border border-border bg-[var(--mt-surface)] px-3 py-2 text-sm font-medium text-[var(--mt-text)] hover:border-primary"
        aria-haspopup="listbox"
        aria-expanded={open}
      >
        <span className="truncate">{label}</span>
        <ChevronDown size={14} className="shrink-0 text-muted" />
      </button>
      {open ? (
        <div className="absolute right-0 z-40 mt-2 w-72 overflow-hidden rounded-2xl border border-border bg-[var(--mt-surface)] shadow-lg">
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
                  className={clsx(
                    "flex w-full flex-col px-3 py-2 text-left text-sm hover:bg-[var(--mt-bg)]",
                    active ? "bg-primary-muted text-primary" : "text-[var(--mt-text)]",
                  )}
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
              className="block rounded-xl px-3 py-2 text-sm font-medium text-primary hover:bg-[var(--mt-bg)]"
            >
              + Create organisation
            </Link>
            <Link
              to={ROUTES.home}
              onClick={() => setOpen(false)}
              className="block rounded-xl px-3 py-2 text-sm text-[var(--mt-text)] hover:bg-[var(--mt-bg)]"
            >
              All organisations
            </Link>
          </div>
        </div>
      ) : null}
    </div>
  );
}
