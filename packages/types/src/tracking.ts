/** Timesheet activity kinds used on day map, timeline, and sheets. */
export type TimesheetActivityType = "working" | "travel" | "break";

/**
 * Single GPS sample from `tracking_logs` (API may send coords as strings).
 * `accuracy` is optional — present when the device / ingest pipeline provides it.
 */
export type TrackingPoint = {
  id?: number | string | null;
  latitude?: number | string | null;
  longitude?: number | string | null;
  start_at?: string | null;
  end_at?: string | null;
  track_at?: string | null;
  accuracy?: number | string | null;
  type?: { code?: string; name?: string } | null;
};

/** Backend `formatTrackingLogs` shape — activity segments as nested arrays. */
export type TrackingLogs = {
  travels?: TrackingPoint[][];
  workings?: TrackingPoint[][];
  breaks?: TrackingPoint[][];
};

export type LatLng = {
  lat: number;
  lng: number;
};
