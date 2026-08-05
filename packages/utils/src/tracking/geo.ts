import type { LatLng } from "@mytask/types";

const EARTH_RADIUS_M = 6_371_000;

/** Degrees → radians. */
export function toRad(deg: number): number {
  return (deg * Math.PI) / 180;
}

/** Great-circle distance in meters (Haversine). */
export function distanceMeters(a: LatLng, b: LatLng): number {
  const dLat = toRad(b.lat - a.lat);
  const dLng = toRad(b.lng - a.lng);
  const lat1 = toRad(a.lat);
  const lat2 = toRad(b.lat);
  const h =
    Math.sin(dLat / 2) ** 2 +
    Math.cos(lat1) * Math.cos(lat2) * Math.sin(dLng / 2) ** 2;
  return 2 * EARTH_RADIUS_M * Math.asin(Math.min(1, Math.sqrt(h)));
}

/** Speed in m/s between two timed points; null when time delta is missing/invalid. */
export function speedMps(
  a: LatLng,
  b: LatLng,
  timeAMs: number | null | undefined,
  timeBMs: number | null | undefined,
): number | null {
  if (
    timeAMs == null ||
    timeBMs == null ||
    !Number.isFinite(timeAMs) ||
    !Number.isFinite(timeBMs)
  ) {
    return null;
  }
  const dtSec = Math.abs(timeBMs - timeAMs) / 1000;
  if (dtSec < 0.05) return null;
  return distanceMeters(a, b) / dtSec;
}

export function parseCoord(
  latitude?: number | string | null,
  longitude?: number | string | null,
): LatLng | null {
  const lat = Number(latitude);
  const lng = Number(longitude);
  if (!Number.isFinite(lat) || !Number.isFinite(lng)) return null;
  if (Math.abs(lat) > 90 || Math.abs(lng) > 180) return null;
  return { lat, lng };
}

export function parseTimestampMs(
  value?: string | number | null,
): number | null {
  if (value == null || value === "") return null;
  if (typeof value === "number" && Number.isFinite(value)) return value;
  const ms = Date.parse(String(value));
  return Number.isFinite(ms) ? ms : null;
}
