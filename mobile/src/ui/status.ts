import type { AppColors } from "../store/themeStore";

export type StatusTone =
  | "neutral"
  | "primary"
  | "success"
  | "warning"
  | "danger"
  | "info";

export type StatusVisual = {
  tone: StatusTone;
  bg: string;
  text: string;
  border: string;
  solid: string;
};

const CODE_TONE: Record<string, StatusTone> = {
  draft: "neutral",
  submitted: "warning",
  pending: "warning",
  pending_approval: "warning",
  approved: "success",
  active: "success",
  paid: "success",
  completed: "success",
  ready: "primary",
  rejected: "danger",
  cancelled: "danger",
  failed: "danger",
  inactive: "neutral",
  invited: "info",
  travel: "info",
  break: "warning",
  working: "primary",
};

/**
 * Map domain status codes / labels to semantic visual tokens.
 */
export function resolveStatusTone(
  status?: string | { code?: string; name?: string } | null,
): StatusTone {
  if (!status) return "neutral";
  const raw =
    typeof status === "string"
      ? status
      : status.code || status.name || "";
  const key = raw.trim().toLowerCase().replace(/\s+/g, "_");
  if (CODE_TONE[key]) return CODE_TONE[key];
  if (key.includes("approv") || key.includes("paid") || key.includes("active")) {
    return "success";
  }
  if (key.includes("reject") || key.includes("cancel") || key.includes("fail")) {
    return "danger";
  }
  if (
    key.includes("pend") ||
    key.includes("draft") ||
    key.includes("submit") ||
    key.includes("warn")
  ) {
    return "warning";
  }
  if (key.includes("invit") || key.includes("info")) return "info";
  return "neutral";
}

export function statusVisual(
  colors: AppColors,
  status?: string | { code?: string; name?: string } | null,
): StatusVisual {
  const tone = resolveStatusTone(status);
  switch (tone) {
    case "success":
      return {
        tone,
        bg: colors.positiveSoft,
        text: colors.positiveText,
        border: colors.positiveSoft,
        solid: colors.positive,
      };
    case "warning":
      return {
        tone,
        bg: colors.warningSoft,
        text: colors.warningText,
        border: colors.warningSoft,
        solid: colors.warning,
      };
    case "danger":
      return {
        tone,
        bg: colors.negativeSoft,
        text: colors.negativeText,
        border: colors.negativeSoft,
        solid: colors.negative,
      };
    case "info":
      return {
        tone,
        bg: colors.infoSoft,
        text: colors.infoText,
        border: colors.infoSoft,
        solid: colors.info,
      };
    case "primary":
      return {
        tone,
        bg: colors.primarySoft,
        text: colors.secondary,
        border: colors.primarySoft,
        solid: colors.primary,
      };
    default:
      return {
        tone,
        bg: colors.neutralSoft,
        text: colors.neutralText,
        border: colors.neutralSoft,
        solid: colors.neutral,
      };
  }
}

export function statusLabel(
  status?: string | { code?: string; name?: string } | null,
): string {
  if (!status) return "—";
  if (typeof status === "string") {
    return status
      .replace(/_/g, " ")
      .replace(/\b\w/g, (ch) => ch.toUpperCase());
  }
  return status.name || status.code || "—";
}

/** Shared chips for Sheets + Manage timesheet lists. */
export type TimesheetStatusFilter =
  | "all"
  | "approved"
  | "pending"
  | "draft"
  | "rejected";

export const TIMESHEET_STATUS_FILTER_OPTIONS: Array<{
  value: TimesheetStatusFilter;
  label: string;
}> = [
  { value: "all", label: "All" },
  { value: "approved", label: "Approved" },
  { value: "pending", label: "Pending" },
  { value: "draft", label: "Draft" },
  { value: "rejected", label: "Rejected" },
];

/**
 * Map UI filter chips to backend `status_code` (draft | submitted | approved | rejected).
 * Pending maps to `submitted` (awaiting approval).
 */
export function timesheetStatusCodeParam(
  filter: TimesheetStatusFilter,
): string | undefined {
  switch (filter) {
    case "approved":
      return "approved";
    case "pending":
      return "submitted";
    case "draft":
      return "draft";
    case "rejected":
      return "rejected";
    default:
      return undefined;
  }
}
