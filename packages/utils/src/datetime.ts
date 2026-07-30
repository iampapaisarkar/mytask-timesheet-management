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
