import { create } from "zustand";

export type TrackingLiveTimer = "running" | "pause" | "stop";

export type TrackingLiveSession = {
  organisation_id: number;
  employee_id: number | null;
  user_id: number | null;
  timesheet_id: number | null;
  timesheet_day_id: number | null;
  timer: TrackingLiveTimer;
  active: boolean;
  last_seen_at: string;
};

interface TrackingLiveState {
  /** Active sessions keyed by `${organisationId}:${userId|employeeId|anon}` */
  sessions: Record<string, TrackingLiveSession>;
  upsert: (session: TrackingLiveSession) => void;
  replaceOrganisation: (
    organisationId: number | string,
    sessions: TrackingLiveSession[],
  ) => void;
  clearOrganisation: (organisationId: number | string) => void;
  reset: () => void;
}

const STALE_MS = 5 * 60 * 1000;

function sessionKey(session: TrackingLiveSession): string {
  const org = session.organisation_id;
  const who =
    session.user_id ??
    session.employee_id ??
    session.timesheet_day_id ??
    "unknown";
  return `${org}:${who}`;
}

export function isTrackingSessionFresh(
  session: TrackingLiveSession | null | undefined,
  now = Date.now(),
): boolean {
  if (!session?.active) return false;
  if (session.timer === "stop") return false;
  const t = Date.parse(session.last_seen_at);
  if (!Number.isFinite(t)) return false;
  return now - t < STALE_MS;
}

export const useTrackingLiveStore = create<TrackingLiveState>((set) => ({
  sessions: {},
  upsert: (session) =>
    set((state) => {
      const key = sessionKey(session);
      if (!session.active || session.timer === "stop") {
        if (!(key in state.sessions)) return state;
        const next = { ...state.sessions };
        delete next[key];
        return { sessions: next };
      }
      return {
        sessions: {
          ...state.sessions,
          [key]: session,
        },
      };
    }),
  replaceOrganisation: (organisationId, list) =>
    set((state) => {
      const org = String(organisationId);
      const next: Record<string, TrackingLiveSession> = {};
      for (const [key, value] of Object.entries(state.sessions)) {
        if (!key.startsWith(`${org}:`)) next[key] = value;
      }
      for (const session of list) {
        if (!session.active || session.timer === "stop") continue;
        next[sessionKey(session)] = session;
      }
      return { sessions: next };
    }),
  clearOrganisation: (organisationId) =>
    set((state) => {
      const org = String(organisationId);
      const next: Record<string, TrackingLiveSession> = {};
      for (const [key, value] of Object.entries(state.sessions)) {
        if (!key.startsWith(`${org}:`)) next[key] = value;
      }
      return { sessions: next };
    }),
  reset: () => set({ sessions: {} }),
}));

export function listOrgTrackingLive(
  organisationId: number | string | null | undefined,
): TrackingLiveSession[] {
  if (organisationId == null) return [];
  const org = String(organisationId);
  const now = Date.now();
  return Object.values(useTrackingLiveStore.getState().sessions).filter(
    (s) =>
      String(s.organisation_id) === org && isTrackingSessionFresh(s, now),
  );
}

export function trackingLiveMatchesDay(
  session: TrackingLiveSession | null | undefined,
  opts: {
    timesheetDayId?: number | string | null;
    timesheetId?: number | string | null;
    employeeId?: number | string | null;
    userId?: number | string | null;
  },
): boolean {
  if (!isTrackingSessionFresh(session)) return false;

  const hasConstraint = [
    opts.timesheetDayId,
    opts.timesheetId,
    opts.employeeId,
    opts.userId,
  ].some((v) => v != null && v !== "");

  // No specific target → any fresh session counts
  if (!hasConstraint) return true;

  if (
    opts.timesheetDayId != null &&
    session!.timesheet_day_id != null &&
    String(session!.timesheet_day_id) === String(opts.timesheetDayId)
  ) {
    return true;
  }
  if (
    opts.timesheetId != null &&
    session!.timesheet_id != null &&
    String(session!.timesheet_id) === String(opts.timesheetId)
  ) {
    return true;
  }
  if (
    opts.employeeId != null &&
    session!.employee_id != null &&
    String(session!.employee_id) === String(opts.employeeId)
  ) {
    return true;
  }
  if (
    opts.userId != null &&
    session!.user_id != null &&
    String(session!.user_id) === String(opts.userId)
  ) {
    return true;
  }
  return false;
}

export function findMatchingTrackingLive(
  organisationId: number | string | null | undefined,
  match?: {
    timesheetDayId?: number | string | null;
    timesheetId?: number | string | null;
    employeeId?: number | string | null;
    userId?: number | string | null;
  },
): TrackingLiveSession | null {
  const sessions = listOrgTrackingLive(organisationId);
  if (!sessions.length) return null;
  if (!match) return sessions[0] ?? null;
  return (
    sessions.find((s) => trackingLiveMatchesDay(s, match)) ??
    // Fall back so org Live badge still shows when another employee is tracking
    sessions[0] ??
    null
  );
}
