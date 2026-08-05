import type { TimesheetActivityType } from "@mytask/types";
import { activityColor, mapRouteStyle } from "@mytask/theme";

export type PolylineStrokeStyle = {
  color: string;
  width: number;
  opacity: number;
  underlayColor: string;
  underlayWidth: number;
  underlayOpacity: number;
  /** Platform-agnostic join/cap hints (RN Maps / SVG). */
  lineCap: "round";
  lineJoin: "round";
  geodesic: true;
  /** Draw order — polylines sit below markers. */
  zIndex: number;
};

/**
 * Resolve stroke weights / opacity for an activity segment given selection state.
 */
export function buildPolylineStyle(
  activityType: TimesheetActivityType | string,
  selectedType: TimesheetActivityType | string | null = null,
): PolylineStrokeStyle {
  const dimmed = Boolean(selectedType && selectedType !== activityType);
  const selected = Boolean(selectedType && selectedType === activityType);

  return {
    color: activityColor(activityType),
    width: selected
      ? mapRouteStyle.strokeWidthSelected
      : dimmed
        ? mapRouteStyle.strokeWidthDimmed
        : mapRouteStyle.strokeWidth,
    opacity: dimmed
      ? mapRouteStyle.strokeOpacityDimmed
      : mapRouteStyle.strokeOpacity,
    underlayColor: mapRouteStyle.underlayColor,
    underlayWidth: dimmed
      ? mapRouteStyle.underlayWidthDimmed
      : mapRouteStyle.underlayWidth,
    underlayOpacity: dimmed
      ? mapRouteStyle.underlayOpacityDimmed
      : mapRouteStyle.underlayOpacity,
    lineCap: "round",
    lineJoin: "round",
    geodesic: true,
    zIndex: 1,
  };
}
