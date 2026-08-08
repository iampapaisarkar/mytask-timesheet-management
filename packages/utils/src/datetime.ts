/**
 * Display helpers for clock times (12-hour AM/PM) and timesheet labels.
 * Keep API wire values as HH:mm / HH:mm:ss; format only for UI/PDF.
 */

function parseTimeParts(
  value: string | null | undefined,
): { hours: number; minutes: number; seconds: number } | null {
  if (value == null) return null;
  const raw = String(value).trim();
  if (!raw) return null;

  // Already 12-hour text — leave as-is for callers that pass display strings
  if (/\b(am|pm)\b/i.test(raw) && !/^\d{1,2}:\d{2}/.test(raw)) {
    return null;
  }

  const match = raw.match(/^(\d{1,2}):(\d{2})(?::(\d{2}))?/);
  if (!match) return null;
  const hours = Number(match[1]);
  const minutes = Number(match[2]);
  const seconds = Number(match[3] || 0);
  if (
    !Number.isFinite(hours) ||
    !Number.isFinite(minutes) ||
    hours < 0 ||
    hours > 23 ||
    minutes < 0 ||
    minutes > 59
  ) {
    return null;
  }
  return { hours, minutes, seconds };
}

/**
 * "09:00" | "09:00:00" | "17:30" → "9:00 AM" / "5:30 PM"
 */
export function formatDisplayTime(
  value: string | null | undefined,
  options?: { includeSeconds?: boolean },
): string {
  if (value == null || String(value).trim() === "") return "—";
  const trimmed = String(value).trim();
  if (/\b(am|pm)\b/i.test(trimmed) && !/^\d{1,2}:\d{2}/.test(trimmed)) {
    return trimmed;
  }

  const parts = parseTimeParts(trimmed);
  if (!parts) return trimmed;

  const period = parts.hours >= 12 ? "PM" : "AM";
  let hour12 = parts.hours % 12;
  if (hour12 === 0) hour12 = 12;
  const mm = String(parts.minutes).padStart(2, "0");
  if (options?.includeSeconds) {
    const ss = String(parts.seconds).padStart(2, "0");
    return `${hour12}:${mm}:${ss} ${period}`;
  }
  return `${hour12}:${mm} ${period}`;
}

/** "9:00 AM – 5:00 PM" */
export function formatDisplayTimeRange(
  start?: string | null,
  end?: string | null,
): string {
  const a = formatDisplayTime(start);
  const b = formatDisplayTime(end);
  if (a === "—" && b === "—") return "—";
  if (a === "—") return b;
  if (b === "—") return a;
  return `${a} – ${b}`;
}

/**
 * Prefer timesheet `code` over numeric id for user-facing labels.
 * @example formatTimesheetLabel({ code: "TS-001", id: 3 }) → "TS-001"
 * @example formatTimesheetLabel({ code: "TS-001" }, { prefix: true }) → "Timesheet TS-001"
 */
export function formatTimesheetLabel(
  ts:
    | { code?: string | null; id?: string | number | null }
    | null
    | undefined,
  options?: { prefix?: boolean },
): string {
  const code = ts?.code != null ? String(ts.code).trim() : "";
  const id = ts?.id;
  const base =
    code ||
    (id != null && id !== "" ? `Timesheet ${id}` : "Timesheet");
  if (options?.prefix && code) return `Timesheet ${code}`;
  if (options?.prefix && !code && id != null && id !== "") {
    return `Timesheet ${id}`;
  }
  return base;
}

/** Current local wall-clock as `HH:mm` (for open tracking session display). */
export function formatNowHhMm(date: Date = new Date()): string {
  return `${String(date.getHours()).padStart(2, "0")}:${String(date.getMinutes()).padStart(2, "0")}`;
}

/**
 * Open tracking tasks have no end yet. When `nowHhMm` is provided, treat "now"
 * as the provisional end so working / travel / break durations keep ticking
 * without requiring a GPS update.
 */
export function resolveOpenEndTime(
  endTime: string | null | undefined,
  nowHhMm?: string | null,
): string {
  const end = endTime == null ? "" : String(endTime).trim();
  if (end) return end.length >= 5 ? end.slice(0, 5) : end;
  if (nowHhMm) return String(nowHhMm).trim().slice(0, 5);
  return "";
}

function parseClockMinutes(value?: string | null): number | null {
  const m = String(value || "")
    .trim()
    .match(/^(\d{1,2}):(\d{2})/);
  if (!m) return null;
  return Number(m[1]) * 60 + Number(m[2]);
}

/** Decimal hours between two HH:mm values (same calendar day). */
export function decimalHoursBetween(
  start?: string | null,
  end?: string | null,
): number {
  const a = parseClockMinutes(start);
  const b = parseClockMinutes(end);
  if (a == null || b == null || b <= a) return 0;
  return (b - a) / 60;
}

export type OpenAwareTaskHours = {
  total_hours?: number | string | null;
  start_time?: string | null;
  end_time?: string | null;
  is_open?: boolean;
};

/**
 * Sum task hours, advancing open sessions to `nowHhMm` when provided.
 */
export function sumOpenAwareTaskHours(
  tasks: OpenAwareTaskHours[] | null | undefined,
  nowHhMm?: string | null,
): number {
  if (!Array.isArray(tasks) || !tasks.length) return 0;
  return tasks.reduce((acc, t) => {
    const open = Boolean(t.is_open || (t.start_time && !t.end_time));
    if (open && nowHhMm) {
      return (
        acc +
        decimalHoursBetween(
          t.start_time,
          resolveOpenEndTime(t.end_time, nowHhMm),
        )
      );
    }
    const h = parseFloat(String(t.total_hours ?? 0));
    return acc + (Number.isFinite(h) ? h : 0);
  }, 0);
}

/** Minutes from midnight → "9:00 AM" */
export function formatMinutesAsDisplayTime(mins: number): string {
  const day = 24 * 60;
  const normalized = ((Math.round(mins) % day) + day) % day;
  const h = Math.floor(normalized / 60);
  const m = normalized % 60;
  return formatDisplayTime(
    `${String(h).padStart(2, "0")}:${String(m).padStart(2, "0")}`,
  );
}

/**
 * Duration in minutes → "4h 30m", "0h 45m", "2h 00m".
 * Used for working / travel / break lengths across web and mobile.
 */
export function formatMinutesAsHm(mins: number | string | null | undefined): string {
  if (mins == null || mins === "") return "—";
  const n = Number(mins);
  if (!Number.isFinite(n) || n < 0) return "—";
  const total = Math.round(n);
  const h = Math.floor(total / 60);
  const m = total % 60;
  return `${h}h ${String(m).padStart(2, "0")}m`;
}

/**
 * Decimal hours (e.g. 5.6) → "5h 36m".
 * Prefer this for API fields like total_hours / working_hours.
 */
export function formatHoursAsHm(
  hours: number | string | null | undefined,
): string {
  if (hours == null || hours === "") return "—";
  const n = Number(hours);
  if (!Number.isFinite(n) || n < 0) return "—";
  return formatMinutesAsHm(n * 60);
}

function toValidDate(value: string | number | Date | null | undefined): Date | null {
  if (value == null || value === "") return null;
  const d = value instanceof Date ? value : new Date(value);
  return Number.isNaN(d.getTime()) ? null : d;
}

/**
 * Absolute datetime for UI: "31/07/2026, 10:50:10 AM"
 */
export function formatDisplayDateTime(
  value: string | number | Date | null | undefined,
  options?: { includeSeconds?: boolean },
): string {
  const d = toValidDate(value);
  if (!d) return "—";

  const dd = String(d.getDate()).padStart(2, "0");
  const mm = String(d.getMonth() + 1).padStart(2, "0");
  const yyyy = d.getFullYear();
  const time = formatDisplayTime(
    `${String(d.getHours()).padStart(2, "0")}:${String(d.getMinutes()).padStart(2, "0")}:${String(d.getSeconds()).padStart(2, "0")}`,
    { includeSeconds: options?.includeSeconds !== false },
  );
  return `${dd}/${mm}/${yyyy}, ${time}`;
}

/**
 * Relative time for feeds: "just now", "5 minutes ago", "2 hours ago".
 * Falls back to {@link formatDisplayDateTime} for older than 7 days.
 */
export function formatTimeAgo(
  value: string | number | Date | null | undefined,
  options?: { now?: Date | number },
): string {
  const d = toValidDate(value);
  if (!d) return "—";

  const nowMs =
    options?.now == null
      ? Date.now()
      : options.now instanceof Date
        ? options.now.getTime()
        : Number(options.now);
  const diffMs = Math.max(0, nowMs - d.getTime());
  const seconds = Math.floor(diffMs / 1000);

  if (seconds < 45) return "just now";
  if (seconds < 90) return "1 minute ago";

  const minutes = Math.floor(seconds / 60);
  if (minutes < 45) return `${minutes} minutes ago`;
  if (minutes < 90) return "1 hour ago";

  const hours = Math.floor(minutes / 60);
  if (hours < 24) return `${hours} hours ago`;
  if (hours < 42) return "1 day ago";

  const days = Math.floor(hours / 24);
  if (days < 7) return `${days} days ago`;

  return formatDisplayDateTime(d);
}
