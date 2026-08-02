import { useCallback, useEffect, useMemo, useState } from "react";
import { timesheetActivityApi } from "@mytask/api";
import {
  findMatchingTrackingLive,
  useTrackingLiveStore,
  type TrackingLiveSession,
  type TrackingLiveTimer,
} from "@mytask/realtime";

type MatchOpts = {
  timesheetDayId?: number | string | null;
  timesheetId?: number | string | null;
  employeeId?: number | string | null;
  userId?: number | string | null;
};

function toTimer(value: unknown): TrackingLiveTimer {
  const t = String(value || "").toLowerCase();
  if (t === "pause") return "pause";
  if (t === "stop") return "stop";
  return "running";
}

/**
 * Org-scoped live tracking (same as web).
 * Hydrates from GET /timesheet-activity/live and stays in sync via Socket.IO
 * `tracking.updated` → trackingLiveStore.
 */
export function useTrackingLive(
  organisationId: number | string | null | undefined,
  match?: MatchOpts,
): TrackingLiveSession | null {
  const sessions = useTrackingLiveStore((s) => s.sessions);
  const replaceOrganisation = useTrackingLiveStore(
    (s) => s.replaceOrganisation,
  );
  const [tick, setTick] = useState(0);

  const hydrate = useCallback(async () => {
    try {
      const res = await timesheetActivityApi.live();
      const rows = Array.isArray(res.data?.data) ? res.data.data : [];
      const now = new Date().toISOString();
      const orgId =
        organisationId ??
        rows.find((r) => r.organisation_id != null)?.organisation_id;
      if (orgId == null) {
        return;
      }
      replaceOrganisation(
        orgId,
        rows.map((row) => ({
          organisation_id: Number(row.organisation_id ?? orgId),
          employee_id:
            row.employee_id != null ? Number(row.employee_id) : null,
          user_id: row.user_id != null ? Number(row.user_id) : null,
          timesheet_id:
            row.timesheet_id != null ? Number(row.timesheet_id) : null,
          timesheet_day_id:
            row.timesheet_day_id != null
              ? Number(row.timesheet_day_id)
              : null,
          timer: toTimer(row.timer),
          active: row.active !== false && toTimer(row.timer) !== "stop",
          last_seen_at: now,
        })),
      );
    } catch {
      // Keep socket-driven state if hydrate fails
    }
  }, [organisationId, replaceOrganisation]);

  useEffect(() => {
    void hydrate();
    const id = globalThis.setInterval(() => void hydrate(), 12_000);
    return () => globalThis.clearInterval(id);
  }, [hydrate]);

  useEffect(() => {
    const id = globalThis.setInterval(() => setTick((n) => n + 1), 8_000);
    return () => globalThis.clearInterval(id);
  }, []);

  const resolvedOrgId = useMemo(() => {
    if (organisationId != null) return organisationId;
    const first = Object.values(sessions)[0];
    return first?.organisation_id ?? null;
  }, [organisationId, sessions]);

  return useMemo(() => {
    return findMatchingTrackingLive(resolvedOrgId, match);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [
    sessions,
    resolvedOrgId,
    tick,
    match?.timesheetDayId,
    match?.timesheetId,
    match?.employeeId,
    match?.userId,
  ]);
}
