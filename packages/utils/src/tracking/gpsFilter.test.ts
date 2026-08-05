import assert from "node:assert/strict";
import { describe, it } from "node:test";
import { filterGpsSamples } from "./gpsFilter";
import { processTrackingRoute } from "./routeProcessor";
import { simplifyDouglasPeucker } from "./routeSimplify";
import { distanceMeters } from "./geo";

describe("filterGpsSamples", () => {
  it("drops duplicate coordinates", () => {
    const out = filterGpsSamples([
      { lat: 51.5, lng: -0.12, timeMs: 1_000 },
      { lat: 51.5, lng: -0.12, timeMs: 2_000 },
      { lat: 51.5001, lng: -0.12, timeMs: 3_000 },
    ]);
    assert.equal(out.length, 2);
  });

  it("drops unrealistic speed spikes", () => {
    const out = filterGpsSamples([
      { lat: 51.5, lng: -0.12, timeMs: 0 },
      // ~1km away in 1 second → impossible
      { lat: 51.509, lng: -0.12, timeMs: 1_000 },
      { lat: 51.5002, lng: -0.1201, timeMs: 30_000 },
    ]);
    assert.equal(out.length, 2);
    assert.ok(out.every((p) => p.lat < 51.501));
  });

  it("drops low-accuracy readings when accuracy is present", () => {
    const out = filterGpsSamples(
      [
        { lat: 51.5, lng: -0.12, accuracy: 10, timeMs: 0 },
        { lat: 51.5003, lng: -0.12, accuracy: 200, timeMs: 10_000 },
        { lat: 51.5005, lng: -0.12, accuracy: 15, timeMs: 20_000 },
      ],
      { maxAccuracyMeters: 80 },
    );
    assert.equal(out.length, 2);
    assert.ok(out.every((p) => (p.accuracy ?? 0) <= 80));
  });

  it("ignores micro-jitter while stationary", () => {
    const out = filterGpsSamples(
      [
        { lat: 51.5, lng: -0.12, timeMs: 0 },
        { lat: 51.500001, lng: -0.120001, timeMs: 5_000 },
        { lat: 51.500002, lng: -0.120002, timeMs: 10_000 },
      ],
      { minMoveMeters: 2.5 },
    );
    assert.equal(out.length, 1);
  });
});

describe("simplifyDouglasPeucker", () => {
  it("keeps endpoints and reduces colinear midpoints", () => {
    const points = [
      { lat: 0, lng: 0 },
      { lat: 0.00001, lng: 0.00001 },
      { lat: 0.00002, lng: 0.00002 },
      { lat: 0.001, lng: 0.001 },
    ];
    const simplified = simplifyDouglasPeucker(points, 5);
    assert.ok(simplified.length >= 2);
    assert.ok(simplified.length <= points.length);
    assert.deepEqual(simplified[0], points[0]);
    assert.deepEqual(simplified[simplified.length - 1], points[points.length - 1]);
  });
});

describe("processTrackingRoute", () => {
  it("builds color-separated activity segments with start/end markers", () => {
    const route = processTrackingRoute({
      workings: [
        [
          {
            latitude: 51.5,
            longitude: -0.12,
            start_at: "2026-08-05T09:00:00Z",
            track_at: "2026-08-05T09:00:00Z",
          },
          {
            latitude: 51.5004,
            longitude: -0.1202,
            track_at: "2026-08-05T09:10:00Z",
          },
          {
            latitude: 51.5008,
            longitude: -0.1204,
            end_at: "2026-08-05T09:20:00Z",
            track_at: "2026-08-05T09:20:00Z",
          },
        ],
      ],
      travels: [
        [
          {
            latitude: 51.501,
            longitude: -0.121,
            start_at: "2026-08-05T09:20:00Z",
            track_at: "2026-08-05T09:20:00Z",
          },
          {
            latitude: 51.502,
            longitude: -0.122,
            end_at: "2026-08-05T09:40:00Z",
            track_at: "2026-08-05T09:40:00Z",
          },
        ],
      ],
      breaks: [
        [
          {
            latitude: 51.5021,
            longitude: -0.1221,
            start_at: "2026-08-05T09:40:00Z",
            track_at: "2026-08-05T09:40:00Z",
            end_at: "2026-08-05T10:00:00Z",
          },
        ],
      ],
    });

    assert.equal(route.segments.length, 3);
    assert.deepEqual(
      route.segments.map((s) => s.type),
      ["working", "travel", "break"],
    );
    assert.ok(route.segments.every((s) => s.style.color));
    assert.ok(route.markers.some((m) => m.kind === "activity_start"));
    assert.ok(route.markers.some((m) => m.kind === "activity_end"));
  });

  it("filters GPS spikes inside a segment", () => {
    const route = processTrackingRoute({
      travels: [
        [
          {
            latitude: 51.5,
            longitude: -0.12,
            start_at: "2026-08-05T09:00:00Z",
            track_at: "2026-08-05T09:00:00Z",
          },
          // spike ~800m away in 2s
          {
            latitude: 51.5072,
            longitude: -0.12,
            track_at: "2026-08-05T09:00:02Z",
          },
          {
            latitude: 51.5005,
            longitude: -0.1203,
            end_at: "2026-08-05T09:05:00Z",
            track_at: "2026-08-05T09:05:00Z",
          },
        ],
      ],
    });

    assert.equal(route.segments.length, 1);
    const path = route.segments[0].filteredPath;
    assert.ok(path.length >= 2);
    for (let i = 1; i < path.length; i++) {
      assert.ok(distanceMeters(path[i - 1], path[i]) < 500);
    }
  });
});
