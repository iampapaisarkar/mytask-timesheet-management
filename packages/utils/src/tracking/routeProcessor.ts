import type {
  LatLng,
  TimesheetActivityType,
  TrackingLogs,
  TrackingPoint,
} from "@mytask/types";
import { parseCoord, parseTimestampMs } from "./geo";
import { filterGpsSamples, type GpsFilterOptions } from "./gpsFilter";
import {
  buildSegmentMarkers,
  type MapMarkerDescriptor,
} from "./markerFactory";
import { buildPolylineStyle, type PolylineStrokeStyle } from "./polylineBuilder";
import { simplifyDouglasPeucker } from "./routeSimplify";

export type RouteSegmentType = TimesheetActivityType;

export type ProcessedRoutePoint = LatLng & {
  timeMs: number | null;
  accuracy: number | null;
  isBoundaryStart: boolean;
  isBoundaryEnd: boolean;
};

export type ProcessedRouteSegment = {
  id: string;
  type: RouteSegmentType;
  /** Filtered (+ optionally simplified) path for drawing. */
  path: LatLng[];
  /** Full filtered path before simplification (for markers / diagnostics). */
  filteredPath: LatLng[];
  start: LatLng | null;
  end: LatLng | null;
  style: PolylineStrokeStyle;
  markers: MapMarkerDescriptor[];
};

export type ProcessedRoute = {
  segments: ProcessedRouteSegment[];
  markers: MapMarkerDescriptor[];
  /** All path coords for fitBounds / fallback lists. */
  allPoints: Array<LatLng & { type: RouteSegmentType }>;
  bounds: { minLat: number; maxLat: number; minLng: number; maxLng: number } | null;
};

export type RouteProcessorOptions = {
  selectedType?: TimesheetActivityType | null;
  gpsFilter?: GpsFilterOptions;
  /**
   * Douglas–Peucker epsilon in meters. Applied when a segment has more than
   * `simplifyAboveCount` points. Default 4m — light simplification only.
   */
  simplifyEpsilonMeters?: number;
  /** Default 400 — below this, keep every filtered point. */
  simplifyAboveCount?: number;
};

const LOG_KEYS = ["travels", "breaks", "workings"] as const;

function asActivityType(key: (typeof LOG_KEYS)[number]): RouteSegmentType {
  return key.slice(0, -1) as RouteSegmentType;
}

function parseAccuracy(value: TrackingPoint["accuracy"]): number | null {
  if (value == null || value === "") return null;
  const n = Number(value);
  return Number.isFinite(n) ? n : null;
}

function pointTimeMs(point: TrackingPoint): number | null {
  return (
    parseTimestampMs(point.track_at) ??
    parseTimestampMs(point.start_at) ??
    parseTimestampMs(point.end_at)
  );
}

/**
 * Expand API `tracking_logs` into typed activity segments (preserves groups),
 * ordered chronologically by the first point timestamp when available.
 */
export function segmentsFromTrackingLogs(
  logs?: TrackingLogs | null,
): Array<{ type: RouteSegmentType; points: TrackingPoint[]; index: number }> {
  const out: Array<{
    type: RouteSegmentType;
    points: TrackingPoint[];
    index: number;
    sortKey: number;
  }> = [];
  if (!logs) return out;

  let index = 0;
  for (const key of LOG_KEYS) {
    const groups = logs[key];
    if (!Array.isArray(groups)) continue;
    const type = asActivityType(key);
    for (const group of groups) {
      if (!Array.isArray(group) || group.length === 0) continue;
      const first = group[0];
      const sortKey =
        pointTimeMs(first) ??
        parseTimestampMs(first?.start_at) ??
        index;
      out.push({ type, points: group, index: index++, sortKey });
    }
  }

  out.sort((a, b) => a.sortKey - b.sortKey || a.index - b.index);
  return out.map(({ type, points, index: i }) => ({ type, points, index: i }));
}

function processSegmentPoints(
  points: TrackingPoint[],
  gpsFilter?: GpsFilterOptions,
): ProcessedRoutePoint[] {
  const samples = points
    .map((p) => {
      const coord = parseCoord(p.latitude, p.longitude);
      if (!coord) return null;
      return {
        ...coord,
        timeMs: pointTimeMs(p),
        accuracy: parseAccuracy(p.accuracy),
        isBoundaryStart: Boolean(p.start_at),
        isBoundaryEnd: Boolean(p.end_at),
      };
    })
    .filter((p): p is ProcessedRoutePoint => !!p);

  if (!samples.length) return [];

  const filtered = filterGpsSamples(samples, gpsFilter);

  // Ensure boundary flags from original endpoints survive filtering
  if (filtered.length) {
    const firstRaw = samples[0];
    const lastRaw = samples[samples.length - 1];
    if (firstRaw?.isBoundaryStart) filtered[0].isBoundaryStart = true;
    if (lastRaw?.isBoundaryEnd) {
      filtered[filtered.length - 1].isBoundaryEnd = true;
    }
  }

  return filtered;
}

function computeBounds(
  points: LatLng[],
): ProcessedRoute["bounds"] {
  if (!points.length) return null;
  let minLat = points[0].lat;
  let maxLat = points[0].lat;
  let minLng = points[0].lng;
  let maxLng = points[0].lng;
  for (const p of points) {
    if (p.lat < minLat) minLat = p.lat;
    if (p.lat > maxLat) maxLat = p.lat;
    if (p.lng < minLng) minLng = p.lng;
    if (p.lng > maxLng) maxLng = p.lng;
  }
  return { minLat, maxLat, minLng, maxLng };
}

/**
 * Full day-map pipeline: segment → GPS filter → light simplify → styles → markers.
 * Memoize the result in UI layers when `trackingLogs` / options are stable.
 */
export function processTrackingRoute(
  logs?: TrackingLogs | null,
  options: RouteProcessorOptions = {},
): ProcessedRoute {
  const selectedType = options.selectedType ?? null;
  const simplifyEpsilon = options.simplifyEpsilonMeters ?? 4;
  const simplifyAbove = options.simplifyAboveCount ?? 400;

  const rawSegments = segmentsFromTrackingLogs(logs);
  const segments: ProcessedRouteSegment[] = [];
  const allMarkers: MapMarkerDescriptor[] = [];
  const allPoints: ProcessedRoute["allPoints"] = [];

  let previousEnd: LatLng | null = null;

  for (const raw of rawSegments) {
    const filtered = processSegmentPoints(raw.points, options.gpsFilter);
    if (!filtered.length) continue;

    let filteredPath: LatLng[] = filtered.map(({ lat, lng }) => ({
      lat,
      lng,
    }));

    // Stitch to the previous segment end so activity transitions have no gaps
    // without mixing colors inside a single segment.
    if (previousEnd && filteredPath.length) {
      const head = filteredPath[0];
      if (
        Math.abs(previousEnd.lat - head.lat) > 1e-7 ||
        Math.abs(previousEnd.lng - head.lng) > 1e-7
      ) {
        filteredPath = [previousEnd, ...filteredPath];
      }
    }

    const path =
      filteredPath.length > simplifyAbove
        ? simplifyDouglasPeucker(filteredPath, simplifyEpsilon)
        : filteredPath;

    // Prefer explicit boundary points; otherwise use path ends
    const startBoundary = filtered.find((p) => p.isBoundaryStart);
    const endBoundary = [...filtered].reverse().find((p) => p.isBoundaryEnd);
    const start = startBoundary
      ? { lat: startBoundary.lat, lng: startBoundary.lng }
      : filteredPath[0] ?? null;
    const end = endBoundary
      ? { lat: endBoundary.lat, lng: endBoundary.lng }
      : filteredPath[filteredPath.length - 1] ?? null;

    previousEnd = end ?? path[path.length - 1] ?? null;

    const id = `${raw.type}-${raw.index}`;
    const style = buildPolylineStyle(raw.type, selectedType);
    const markers = buildSegmentMarkers({
      segmentId: id,
      activityType: raw.type,
      start,
      end,
    });

    for (const p of path) {
      allPoints.push({ ...p, type: raw.type });
    }

    allMarkers.push(...markers);
    segments.push({
      id,
      type: raw.type,
      path,
      filteredPath,
      start,
      end,
      style,
      markers,
    });
  }

  // Layer priority: end (z=2) under start (z=3) — sort ascending for draw order
  allMarkers.sort((a, b) => a.zIndex - b.zIndex);

  return {
    segments,
    markers: allMarkers,
    allPoints,
    bounds: computeBounds(allPoints),
  };
}

export function hasTrackingRouteData(logs?: TrackingLogs | null): boolean {
  return processTrackingRoute(logs).segments.length > 0;
}

/** Flatten processed points for text fallback UIs. */
export function flattenProcessedRoute(
  route: ProcessedRoute,
): Array<LatLng & { type: RouteSegmentType }> {
  return route.allPoints;
}
