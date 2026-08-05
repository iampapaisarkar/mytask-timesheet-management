import type { LatLng } from "@mytask/types";
import { distanceMeters } from "./geo";

/**
 * Douglas–Peucker polyline simplification in meters.
 * Use only for rendering when point counts are large — keep epsilon small
 * so the path stays faithful to filtered GPS.
 */
export function simplifyDouglasPeucker(
  points: readonly LatLng[],
  epsilonMeters = 4,
): LatLng[] {
  if (points.length <= 2 || epsilonMeters <= 0) return points.slice();

  const keep = new Array<boolean>(points.length).fill(false);
  keep[0] = true;
  keep[points.length - 1] = true;

  const stack: Array<[number, number]> = [[0, points.length - 1]];

  while (stack.length) {
    const [start, end] = stack.pop()!;
    let maxDist = 0;
    let maxIdx = -1;
    const a = points[start];
    const b = points[end];

    for (let i = start + 1; i < end; i++) {
      const d = perpendicularDistanceMeters(points[i], a, b);
      if (d > maxDist) {
        maxDist = d;
        maxIdx = i;
      }
    }

    if (maxIdx >= 0 && maxDist > epsilonMeters) {
      keep[maxIdx] = true;
      stack.push([start, maxIdx], [maxIdx, end]);
    }
  }

  return points.filter((_, i) => keep[i]);
}

function perpendicularDistanceMeters(
  p: LatLng,
  a: LatLng,
  b: LatLng,
): number {
  const ab = distanceMeters(a, b);
  if (ab < 1e-6) return distanceMeters(p, a);

  // Project onto local equirectangular plane around segment midpoint
  const midLat = ((a.lat + b.lat) / 2) * (Math.PI / 180);
  const cosLat = Math.max(0.2, Math.cos(midLat));
  const ax = a.lng * cosLat;
  const ay = a.lat;
  const bx = b.lng * cosLat;
  const by = b.lat;
  const px = p.lng * cosLat;
  const py = p.lat;

  const dx = bx - ax;
  const dy = by - ay;
  const t = Math.max(
    0,
    Math.min(1, ((px - ax) * dx + (py - ay) * dy) / (dx * dx + dy * dy)),
  );
  const proj = { lat: ay + t * dy, lng: (ax + t * dx) / cosLat };
  return distanceMeters(p, proj);
}
