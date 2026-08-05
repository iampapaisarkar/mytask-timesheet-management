/**
 * Shared day-map route pipeline (platform-agnostic).
 *
 * Modules:
 * - GPSFilter — spike / accuracy / jitter cleanup
 * - RouteProcessor — segment → filter → simplify → markers
 * - PolylineBuilder — stroke styles
 * - MarkerFactory — start/end/current descriptors + SVG icons
 * - Activity colors live in `@mytask/theme` (`activityColors`)
 */

export {
  distanceMeters,
  parseCoord,
  parseTimestampMs,
  speedMps,
  toRad,
} from "./geo";

export {
  filterGpsSamples,
  withParsedTime,
  type GpsFilterOptions,
  type GpsSample,
} from "./gpsFilter";

export { simplifyDouglasPeucker } from "./routeSimplify";

export {
  buildPolylineStyle,
  type PolylineStrokeStyle,
} from "./polylineBuilder";

export {
  buildCurrentLocationMarker,
  buildSegmentMarkers,
  markerIconSvgDataUri,
  type MapMarkerDescriptor,
  type MapMarkerKind,
} from "./markerFactory";

export {
  flattenProcessedRoute,
  hasTrackingRouteData,
  processTrackingRoute,
  segmentsFromTrackingLogs,
  type ProcessedRoute,
  type ProcessedRoutePoint,
  type ProcessedRouteSegment,
  type RouteProcessorOptions,
  type RouteSegmentType,
} from "./routeProcessor";
