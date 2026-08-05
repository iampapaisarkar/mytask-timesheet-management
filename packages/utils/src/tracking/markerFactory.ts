import type { LatLng, TimesheetActivityType } from "@mytask/types";
import { activityColor, mapRouteStyle } from "@mytask/theme";

export type MapMarkerKind = "activity_start" | "activity_end" | "current";

export type MapMarkerDescriptor = {
  id: string;
  kind: MapMarkerKind;
  activityType: TimesheetActivityType | null;
  position: LatLng;
  /** Slight visual nudge applied when start/end coincide (degrees). */
  displayPosition: LatLng;
  color: string;
  title: string;
  size: number;
  /** Draw order: polyline(1) < end(2) < start(3) < current(4). */
  zIndex: number;
  /** Icon glyph hint for platform renderers. */
  glyph: "work" | "travel" | "break" | "end" | "dot";
};

const START_LABEL: Record<TimesheetActivityType, string> = {
  working: "Working start",
  travel: "Travel start",
  break: "Break start",
};

const START_GLYPH: Record<TimesheetActivityType, MapMarkerDescriptor["glyph"]> =
  {
    working: "work",
    travel: "travel",
    break: "break",
  };

const COINCIDENT_NUDGE_DEG = 0.000035; // ~3–4 m

function isActivityType(value: string): value is TimesheetActivityType {
  return value === "working" || value === "travel" || value === "break";
}

/**
 * Build start / end markers for a processed activity segment.
 * When start and end share a coordinate, the end marker is nudged slightly
 * so both remain visible without stacking.
 */
export function buildSegmentMarkers(input: {
  segmentId: string;
  activityType: string;
  start: LatLng | null;
  end: LatLng | null;
}): MapMarkerDescriptor[] {
  if (!isActivityType(input.activityType)) return [];
  const type = input.activityType;
  const color = activityColor(type);
  const markers: MapMarkerDescriptor[] = [];

  if (input.start) {
    markers.push({
      id: `${input.segmentId}-start`,
      kind: "activity_start",
      activityType: type,
      position: input.start,
      displayPosition: input.start,
      color,
      title: START_LABEL[type],
      size: mapRouteStyle.markerStartSize,
      zIndex: 3,
      glyph: START_GLYPH[type],
    });
  }

  if (input.end) {
    const coincident =
      input.start != null &&
      Math.abs(input.start.lat - input.end.lat) < 1e-7 &&
      Math.abs(input.start.lng - input.end.lng) < 1e-7;

    const displayPosition = coincident
      ? {
          lat: input.end.lat + COINCIDENT_NUDGE_DEG,
          lng: input.end.lng + COINCIDENT_NUDGE_DEG,
        }
      : input.end;

    markers.push({
      id: `${input.segmentId}-end`,
      kind: "activity_end",
      activityType: type,
      position: input.end,
      displayPosition,
      color,
      title: `${type.charAt(0).toUpperCase()}${type.slice(1)} end`,
      size: mapRouteStyle.markerEndSize,
      zIndex: 2,
      glyph: "end",
    });
  }

  return markers;
}

export function buildCurrentLocationMarker(
  position: LatLng,
): MapMarkerDescriptor {
  return {
    id: "current-location",
    kind: "current",
    activityType: null,
    position,
    displayPosition: position,
    color: activityColor("working"),
    title: "Current location",
    size: mapRouteStyle.markerCurrentSize,
    zIndex: 4,
    glyph: "dot",
  };
}

/**
 * SVG data-URI icons for Google Maps (web). Same glyphs as mobile custom markers.
 */
export function markerIconSvgDataUri(
  marker: MapMarkerDescriptor,
  theme: "light" | "dark" = "light",
): string {
  const stroke = theme === "dark" ? "#E8F2F2" : "#FFFFFF";
  const size = marker.size;
  const r = size / 2 - 1;
  const cx = size / 2;
  const cy = size / 2;
  let inner = "";

  if (marker.kind === "activity_end" || marker.glyph === "end") {
    const s = size * 0.28;
    inner = `<rect x="${cx - s / 2}" y="${cy - s / 2}" width="${s}" height="${s}" rx="1.5" fill="${stroke}"/>`;
  } else if (marker.glyph === "travel") {
    inner = `<path d="M${cx - 5} ${cy + 2} L${cx} ${cy - 5} L${cx + 5} ${cy + 2} Z" fill="${stroke}"/>`;
  } else if (marker.glyph === "break") {
    const w = 2.2;
    const h = size * 0.32;
    inner = `<rect x="${cx - 4}" y="${cy - h / 2}" width="${w}" height="${h}" rx="0.8" fill="${stroke}"/><rect x="${cx + 2}" y="${cy - h / 2}" width="${w}" height="${h}" rx="0.8" fill="${stroke}"/>`;
  } else if (marker.glyph === "dot") {
    inner = `<circle cx="${cx}" cy="${cy}" r="${r * 0.35}" fill="${stroke}"/>`;
  } else {
    // working — filled play / diamond
    inner = `<circle cx="${cx}" cy="${cy}" r="${r * 0.35}" fill="${stroke}"/>`;
  }

  const svg = `<svg xmlns="http://www.w3.org/2000/svg" width="${size}" height="${size}" viewBox="0 0 ${size} ${size}"><circle cx="${cx}" cy="${cy}" r="${r}" fill="${marker.color}" stroke="${stroke}" stroke-width="2"/>${inner}</svg>`;
  return `data:image/svg+xml;charset=UTF-8,${encodeURIComponent(svg)}`;
}
