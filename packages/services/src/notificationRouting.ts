import { ROUTES } from "@mytask/constants";

export type NotificationRouteInput = {
  url?: string | null;
  title?: string | null;
  body?: string | null;
  data?: Record<string, unknown> | null;
};

export type NotificationRouteResult = {
  path: string;
  /** True when destination was inferred (no usable url) */
  inferred: boolean;
  /** True when path is a safe in-app fallback */
  fallback: boolean;
};

const ALLOWED_PREFIXES = [
  "/org/",
  "/org-invitation",
  "/login",
  "/signup",
  "/forgot-password",
  "/auth-actions",
  "/profile",
  "/organisations/",
  "/help",
  "/terms",
  "/privacy",
  "/how-it-works",
  "/",
] as const;

/**
 * Normalize backend / legacy notification URLs into in-app React Router paths.
 * Never hardcode a single destination — parse payload first, then infer.
 */
export function resolveNotificationPath(
  input: NotificationRouteInput,
  options?: { defaultOrgCode?: string | null },
): NotificationRouteResult {
  const raw =
    pickString(input.url) ||
    pickString(input.data?.url) ||
    pickString(input.data?.link) ||
    pickString(input.data?.path) ||
    "";

  const normalized = normalizePath(raw);
  if (normalized && isAllowedPath(normalized)) {
    return { path: normalized, inferred: false, fallback: false };
  }

  const inferred = inferFromText(
    `${input.title || ""} ${input.body || ""}`,
    options?.defaultOrgCode || null,
  );
  if (inferred) {
    return { path: inferred, inferred: true, fallback: false };
  }

  return { path: ROUTES.home, inferred: true, fallback: true };
}

function pickString(value: unknown): string {
  return typeof value === "string" ? value.trim() : "";
}

function normalizePath(raw: string): string | null {
  if (!raw) return null;

  let path = raw;
  try {
    if (/^https?:\/\//i.test(raw)) {
      const u = new URL(raw);
      path = `${u.pathname}${u.search}${u.hash}`;
    }
  } catch {
    return null;
  }

  // Strip hash-router leftovers
  if (path.startsWith("/#/")) path = path.slice(2);
  if (path.startsWith("#/")) path = path.slice(1);

  if (!path.startsWith("/")) {
    path = `/${path}`;
  }

  // Legacy plural segment from older seeds / payloads
  path = path.replace(/\/timesheets(\/|$)/g, "/timesheet$1");
  // Fix missing slash: org-invitation without leading slash already handled
  path = path.replace(/^\/org-invitation/, "/org-invitation");

  // Collapse duplicate slashes (keep protocol-less)
  path = path.replace(/\/{2,}/g, "/");

  return path;
}

function isAllowedPath(path: string): boolean {
  if (path === "/") return true;
  return ALLOWED_PREFIXES.some(
    (prefix) => prefix !== "/" && (path === prefix || path.startsWith(prefix)),
  );
}

function inferFromText(
  text: string,
  orgCode: string | null,
): string | null {
  const t = text.toLowerCase();

  if (t.includes("invitation") || t.includes("invited")) {
    return ROUTES.orgInvitation;
  }

  if (!orgCode) return null;

  if (t.includes("report")) {
    return ROUTES.reports(orgCode);
  }
  if (t.includes("payout") || t.includes("payroll") || t.includes("paid")) {
    return ROUTES.payouts(orgCode);
  }
  if (
    t.includes("timesheet-management") ||
    (t.includes("timesheet") &&
      (t.includes("approval") || t.includes("submitted by") || t.includes("manager")))
  ) {
    return ROUTES.timesheetManagement(orgCode);
  }
  if (t.includes("timesheet")) {
    return ROUTES.timesheet(orgCode);
  }
  if (t.includes("employee")) {
    return ROUTES.employees(orgCode);
  }
  if (t.includes("job")) {
    return ROUTES.jobs(orgCode);
  }
  if (t.includes("customer")) {
    return ROUTES.customers(orgCode);
  }

  return ROUTES.orgHome(orgCode);
}
