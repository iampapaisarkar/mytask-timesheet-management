import { useEffect, useMemo, useRef, useState } from "react";
import { loadGoogleMaps } from "@/lib/googleMaps";

export type TrackingPoint = {
  latitude?: number | string | null;
  longitude?: number | string | null;
  start_at?: string | null;
  end_at?: string | null;
  type?: { code?: string; name?: string } | null;
};

export type TrackingLogs = {
  travels?: TrackingPoint[][];
  workings?: TrackingPoint[][];
  breaks?: TrackingPoint[][];
};

export type MapJob = {
  id?: number | string;
  name?: string;
  radius?: number | string | null;
  latitude?: number | string | null;
  longitude?: number | string | null;
  address?: {
    latitude?: number | string | null;
    longitude?: number | string | null;
    formatted?: string;
    address_1?: string;
    city?: string;
  } | null;
};

const TYPE_COLORS: Record<string, string> = {
  working: "#04B6B1",
  break: "#F59E0B",
  travel: "#3B82F6",
};

type GoogleMapsNs = {
  Map: new (el: HTMLElement, opts: Record<string, unknown>) => GoogleMap;
  Polyline: new (opts: Record<string, unknown>) => {
    setMap: (m: unknown) => void;
  };
  Circle: new (opts: Record<string, unknown>) => {
    setMap: (m: unknown) => void;
  };
  Marker: new (opts: Record<string, unknown>) => {
    setMap: (m: unknown) => void;
  };
  LatLngBounds: new () => {
    extend: (p: { lat: number; lng: number }) => void;
    isEmpty: () => boolean;
  };
  MapTypeId: { ROADMAP: string };
};

type GoogleMap = {
  fitBounds: (b: unknown) => void;
};

function getGoogleMaps(): GoogleMapsNs | undefined {
  const g = (window as Window & { google?: { maps?: GoogleMapsNs } }).google;
  return g?.maps;
}

function toLatLng(point: {
  latitude?: number | string | null;
  longitude?: number | string | null;
}): { lat: number; lng: number } | null {
  const lat = Number(point?.latitude);
  const lng = Number(point?.longitude);
  if (!Number.isFinite(lat) || !Number.isFinite(lng)) return null;
  return { lat, lng };
}

function segmentsFromLogs(logs?: TrackingLogs | null) {
  const segments: { type: string; points: TrackingPoint[] }[] = [];
  if (!logs) return segments;
  for (const key of ["travels", "breaks", "workings"] as const) {
    const groups = logs[key];
    if (!Array.isArray(groups)) continue;
    for (const group of groups) {
      if (Array.isArray(group) && group.length > 0) {
        segments.push({ type: key.slice(0, -1), points: group });
      }
    }
  }
  return segments;
}

function flattenCoords(logs?: TrackingLogs | null) {
  return segmentsFromLogs(logs).flatMap((seg) =>
    seg.points
      .map((p) => toLatLng(p))
      .filter((p): p is { lat: number; lng: number } => !!p)
      .map((p) => ({ ...p, type: seg.type })),
  );
}

export function TrackingMapView({
  trackingLogs,
  jobs = [],
  height = 300,
}: {
  trackingLogs?: TrackingLogs | null;
  jobs?: MapJob[];
  height?: number;
}) {
  const mapRef = useRef<HTMLDivElement>(null);
  const [loadError, setLoadError] = useState<string | null>(null);
  const apiKey = import.meta.env.VITE_GOOGLE_MAPS_API_KEY || "";

  const segments = useMemo(
    () => segmentsFromLogs(trackingLogs),
    [trackingLogs],
  );
  const fallbackPoints = useMemo(
    () => flattenCoords(trackingLogs),
    [trackingLogs],
  );

  const jobPoints = useMemo(
    () =>
      jobs
        .map((job) => {
          const pos =
            toLatLng(job) ||
            toLatLng({
              latitude: job.address?.latitude,
              longitude: job.address?.longitude,
            });
          if (!pos) return null;
          return { job, pos };
        })
        .filter(
          (row): row is { job: MapJob; pos: { lat: number; lng: number } } =>
            !!row,
        ),
    [jobs],
  );

  const hasData = segments.length > 0 || jobPoints.length > 0;

  useEffect(() => {
    if (!apiKey || !hasData || !mapRef.current) return;

    let cancelled = false;
    const overlays: Array<{ setMap: (m: unknown) => void }> = [];

    void (async () => {
      try {
        await loadGoogleMaps(apiKey);
        if (cancelled || !mapRef.current) return;
        const maps = getGoogleMaps();
        if (!maps) return;

        const map = new maps.Map(mapRef.current, {
          // Neutral world view until fitBounds runs on real points
          center: { lat: 20, lng: 0 },
          zoom: 2,
          mapTypeId: maps.MapTypeId.ROADMAP,
          disableDefaultUI: true,
          zoomControl: true,
        });
        const bounds = new maps.LatLngBounds();

        for (const segment of segments) {
          const path = segment.points
            .map((p) => toLatLng(p))
            .filter((p): p is { lat: number; lng: number } => !!p);
          if (!path.length) continue;
          path.forEach((p) => bounds.extend(p));

          overlays.push(
            new maps.Polyline({
              path,
              strokeColor: "#646464",
              strokeWeight: 6,
              map,
            }),
          );
          overlays.push(
            new maps.Polyline({
              path,
              strokeColor: TYPE_COLORS[segment.type] || "#EF4444",
              strokeWeight: 4,
              map,
            }),
          );

          for (const point of segment.points) {
            if (!point.start_at && !point.end_at) continue;
            const pos = toLatLng(point);
            if (!pos) continue;
            overlays.push(
              new maps.Marker({
                position: pos,
                map,
                title: point.type?.name || segment.type,
              }),
            );
          }
        }

        for (const { job, pos } of jobPoints) {
          bounds.extend(pos);
          overlays.push(
            new maps.Circle({
              center: pos,
              radius: Number(job.radius) || 0,
              strokeColor: "#04B6B1",
              fillColor: "#04B6B1",
              fillOpacity: 0.2,
              strokeWeight: 1,
              map,
            }),
          );
          overlays.push(
            new maps.Marker({
              position: pos,
              map,
              title: job.name || "Job",
            }),
          );
        }

        if (!bounds.isEmpty()) map.fitBounds(bounds);
      } catch (err) {
        setLoadError(
          err instanceof Error ? err.message : "Unable to load map",
        );
      }
    })();

    return () => {
      cancelled = true;
      overlays.forEach((o) => o.setMap(null));
    };
  }, [apiKey, hasData, segments, jobPoints]);

  if (!hasData) {
    return (
      <div
        className="flex items-center justify-center rounded-xl border border-dashed border-border text-sm text-muted"
        style={{ height }}
      >
        No tracking data found
      </div>
    );
  }

  if (!apiKey || loadError) {
    return (
      <div
        className="overflow-auto rounded-xl border border-border bg-[var(--mt-bg)] p-3 text-sm"
        style={{ maxHeight: height }}
      >
        <p className="mb-2 font-medium text-[var(--mt-text)]">
          {loadError
            ? `Map unavailable (${loadError})`
            : "Map unavailable — set VITE_GOOGLE_MAPS_API_KEY"}
        </p>
        <ul className="space-y-1 font-mono text-xs text-muted">
          {fallbackPoints.map((p, i) => (
            <li key={`${p.lat}-${p.lng}-${i}`}>
              [{p.type}] {p.lat.toFixed(6)}, {p.lng.toFixed(6)}
            </li>
          ))}
          {jobPoints.map(({ job, pos }) => (
            <li key={`job-${String(job.id)}`}>
              [job:{job.name || job.id}] {pos.lat.toFixed(6)},{" "}
              {pos.lng.toFixed(6)}
              {job.radius != null ? ` · r=${job.radius}m` : ""}
            </li>
          ))}
        </ul>
      </div>
    );
  }

  return (
    <div
      ref={mapRef}
      className="w-full overflow-hidden rounded-xl border border-border"
      style={{ height }}
    />
  );
}

export function hasTrackingMapData(logs?: TrackingLogs | null) {
  return segmentsFromLogs(logs).some((seg) =>
    seg.points.some((p) => toLatLng(p)),
  );
}
