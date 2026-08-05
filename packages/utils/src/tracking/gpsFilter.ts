import type { LatLng } from "@mytask/types";
import { distanceMeters, parseTimestampMs, speedMps } from "./geo";

/**
 * A GPS sample with optional device accuracy and timestamp.
 * Filtering is conservative — prefer keeping the real path over aggressive cleanup.
 */
export type GpsSample = LatLng & {
  /** Horizontal accuracy in meters when the device reports it. */
  accuracy?: number | null;
  /** Epoch ms (`track_at` / `start_at`). */
  timeMs?: number | null;
};

export type GpsFilterOptions = {
  /** Drop readings worse than this (when accuracy is present). Default 80m. */
  maxAccuracyMeters?: number;
  /** Impossible jump without enough elapsed time. Default 350m. */
  maxJumpMeters?: number;
  /** Max plausible speed (m/s). Default 55 ≈ 198 km/h. */
  maxSpeedMps?: number;
  /** Ignore micro-jitter while nearly stationary. Default 2.5m. */
  minMoveMeters?: number;
  /** Treat coords closer than this as duplicates. Default 0.8m. */
  duplicateEpsilonMeters?: number;
};

const DEFAULTS: Required<GpsFilterOptions> = {
  maxAccuracyMeters: 80,
  maxJumpMeters: 350,
  maxSpeedMps: 55,
  minMoveMeters: 2.5,
  duplicateEpsilonMeters: 0.8,
};

function nearlySame(a: LatLng, b: LatLng, epsilonM: number): boolean {
  return distanceMeters(a, b) < epsilonM;
}

/**
 * Remove GPS spikes, duplicates, low-accuracy fixes, and stationary jitter.
 * Preserves order; never invents points. Safe for empty / single-point inputs.
 */
export function filterGpsSamples<T extends GpsSample>(
  samples: readonly T[],
  options: GpsFilterOptions = {},
): T[] {
  if (samples.length <= 1) return samples.slice();

  const opts = { ...DEFAULTS, ...options };
  const kept: T[] = [];

  for (const sample of samples) {
    if (!Number.isFinite(sample.lat) || !Number.isFinite(sample.lng)) continue;

    if (
      sample.accuracy != null &&
      Number.isFinite(sample.accuracy) &&
      sample.accuracy > opts.maxAccuracyMeters
    ) {
      continue;
    }

    const prev = kept[kept.length - 1];
    if (!prev) {
      kept.push(sample);
      continue;
    }

    if (nearlySame(prev, sample, opts.duplicateEpsilonMeters)) {
      continue;
    }

    const dist = distanceMeters(prev, sample);
    const spd = speedMps(prev, sample, prev.timeMs, sample.timeMs);

    // Unrealistic speed between consecutive fixes → spike
    if (spd != null && spd > opts.maxSpeedMps) {
      continue;
    }

    // Large jump with no usable timestamps (or tiny dt already handled via speed)
    if (
      dist > opts.maxJumpMeters &&
      (spd == null || spd > opts.maxSpeedMps * 0.85)
    ) {
      continue;
    }

    // Stationary jitter: keep first + later meaningful moves
    if (dist < opts.minMoveMeters) {
      // Prefer a later sample with better accuracy / fresher time when nearly still
      const prevAcc = prev.accuracy;
      const nextAcc = sample.accuracy;
      if (
        nextAcc != null &&
        Number.isFinite(nextAcc) &&
        (prevAcc == null || nextAcc < prevAcc)
      ) {
        kept[kept.length - 1] = sample;
      }
      continue;
    }

    kept.push(sample);
  }

  // Always keep the original last point if it was dropped as jitter —
  // end markers need the activity boundary.
  const last = samples[samples.length - 1];
  if (kept.length && last) {
    const tail = kept[kept.length - 1];
    if (!nearlySame(tail, last, opts.duplicateEpsilonMeters)) {
      if (
        last.accuracy == null ||
        !Number.isFinite(last.accuracy) ||
        last.accuracy <= opts.maxAccuracyMeters
      ) {
        const dist = distanceMeters(tail, last);
        const spd = speedMps(tail, last, tail.timeMs, last.timeMs);
        const okSpeed = spd == null || spd <= opts.maxSpeedMps;
        const okJump = dist <= opts.maxJumpMeters || okSpeed;
        if (okSpeed && okJump) kept.push(last);
      }
    }
  }

  return kept;
}

/** Convenience: attach timeMs from a raw ISO / date string field. */
export function withParsedTime<T extends LatLng>(
  point: T,
  rawTime?: string | number | null,
): T & { timeMs: number | null } {
  return { ...point, timeMs: parseTimestampMs(rawTime) };
}
