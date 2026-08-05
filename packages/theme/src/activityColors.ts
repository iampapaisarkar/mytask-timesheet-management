/**
 * Canonical activity colors for map polylines, markers, timeline, and sheets.
 * Keep web + mobile in sync by importing from here — do not redefine locally.
 */
export const activityColors = {
  working: "#04B6B1",
  travel: "#5B8DEF",
  break: "#F59E0B",
} as const;

export type ActivityColorKey = keyof typeof activityColors;

/** Shared map polyline / marker sizing for cross-platform parity. */
export const mapRouteStyle = {
  /** Colored route stroke (px / dp). */
  strokeWidth: 4,
  strokeWidthSelected: 6,
  strokeWidthDimmed: 2,
  /** Gray underlay for contrast on busy basemaps. */
  underlayColor: "#646464",
  underlayWidth: 6,
  underlayWidthDimmed: 3,
  underlayOpacity: 0.55,
  underlayOpacityDimmed: 0.25,
  strokeOpacity: 1,
  strokeOpacityDimmed: 0.35,
  /** Marker diameters (logical pixels). */
  markerStartSize: 28,
  markerEndSize: 18,
  markerCurrentSize: 16,
} as const;

export function activityColor(
  type: string | null | undefined,
  fallback = "#EF4444",
): string {
  if (type && type in activityColors) {
    return activityColors[type as ActivityColorKey];
  }
  return fallback;
}
