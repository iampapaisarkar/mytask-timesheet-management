import { useEffect, useMemo, useRef, useState } from "react";
import { mapStyleForTheme } from "@mytask/theme";
import type { TrackingLogs, TimesheetActivityType } from "@mytask/types";
import {
  hasTrackingRouteData,
  markerIconSvgDataUri,
  processTrackingRoute,
} from "@mytask/utils";
import { loadGoogleMaps } from "@/lib/googleMaps";
import { useThemeStore } from "@/store/themeStore";

export type { TrackingPoint, TrackingLogs } from "@mytask/types";

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
  Size: new (w: number, h: number) => unknown;
  Point: new (x: number, y: number) => unknown;
  MapTypeId: { ROADMAP: string };
};

type GoogleMap = {
  fitBounds: (b: unknown) => void;
  setOptions: (opts: Record<string, unknown>) => void;
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

export function TrackingMapView({
  trackingLogs,
  jobs = [],
  height = 300,
  selectedType = null,
  currentLocation = null,
  className,
}: {
  trackingLogs?: TrackingLogs | null;
  jobs?: MapJob[];
  height?: number | string;
  /** Highlight segments of this activity type */
  selectedType?: TimesheetActivityType | null;
  /** Optional live position drawn above activity markers */
  currentLocation?: { lat: number; lng: number } | null;
  className?: string;
}) {
  const mapRef = useRef<HTMLDivElement>(null);
  const mapInstanceRef = useRef<GoogleMap | null>(null);
  const [loadError, setLoadError] = useState<string | null>(null);
  const apiKey = import.meta.env.VITE_GOOGLE_MAPS_API_KEY || "";
  const themeMode = useThemeStore((s) => s.mode);

  const route = useMemo(
    () => processTrackingRoute(trackingLogs, { selectedType }),
    [trackingLogs, selectedType],
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

  const hasData = route.segments.length > 0 || jobPoints.length > 0;

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
          center: { lat: 20, lng: 0 },
          zoom: 2,
          mapTypeId: maps.MapTypeId.ROADMAP,
          disableDefaultUI: true,
          zoomControl: true,
          styles: [...mapStyleForTheme(themeMode)],
        });
        mapInstanceRef.current = map;
        const bounds = new maps.LatLngBounds();

        // 1) Polylines (bottom layer)
        for (const segment of route.segments) {
          if (!segment.path.length) continue;
          segment.path.forEach((p) => bounds.extend(p));

          overlays.push(
            new maps.Polyline({
              path: segment.path,
              strokeColor: segment.style.underlayColor,
              strokeWeight: segment.style.underlayWidth,
              strokeOpacity: segment.style.underlayOpacity,
              geodesic: segment.style.geodesic,
              zIndex: segment.style.zIndex,
              map,
            }),
          );
          overlays.push(
            new maps.Polyline({
              path: segment.path,
              strokeColor: segment.style.color,
              strokeWeight: segment.style.width,
              strokeOpacity: segment.style.opacity,
              geodesic: segment.style.geodesic,
              zIndex: segment.style.zIndex + 0.1,
              map,
            }),
          );
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
              zIndex: 0,
              map,
            }),
          );
          overlays.push(
            new maps.Marker({
              position: pos,
              map,
              title: job.name || "Job",
              zIndex: 1,
            }),
          );
        }

        // 2) End markers, then 3) start markers (already sorted by zIndex)
        for (const marker of route.markers) {
          bounds.extend(marker.displayPosition);
          const size = marker.size;
          overlays.push(
            new maps.Marker({
              position: marker.displayPosition,
              map,
              title: marker.title,
              zIndex: marker.zIndex,
              icon: {
                url: markerIconSvgDataUri(marker, themeMode),
                scaledSize: new maps.Size(size, size),
                anchor: new maps.Point(size / 2, size / 2),
              },
            }),
          );
        }

        // 4) Current location on top
        if (currentLocation) {
          bounds.extend(currentLocation);
          overlays.push(
            new maps.Marker({
              position: currentLocation,
              map,
              title: "Current location",
              zIndex: 4,
              icon: {
                url: markerIconSvgDataUri(
                  {
                    id: "current",
                    kind: "current",
                    activityType: null,
                    position: currentLocation,
                    displayPosition: currentLocation,
                    color: "#04B6B1",
                    title: "Current location",
                    size: 16,
                    zIndex: 4,
                    glyph: "dot",
                  },
                  themeMode,
                ),
                scaledSize: new maps.Size(16, 16),
                anchor: new maps.Point(8, 8),
              },
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
      mapInstanceRef.current = null;
      overlays.forEach((o) => o.setMap(null));
    };
    // themeMode chrome updates via setOptions; marker icons rebuild when route changes
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [apiKey, hasData, route, jobPoints, selectedType, currentLocation]);

  useEffect(() => {
    mapInstanceRef.current?.setOptions({
      styles: [...mapStyleForTheme(themeMode)],
    });
  }, [themeMode]);

  if (!hasData) {
    return (
      <div
        className={`flex items-center justify-center rounded-xl border border-dashed border-border text-sm text-muted ${className || ""}`}
        style={{ height }}
      >
        No tracking data found
      </div>
    );
  }

  if (!apiKey || loadError) {
    return (
      <div
        className={`overflow-auto rounded-xl border border-border bg-[var(--mt-bg)] p-3 text-sm ${className || ""}`}
        style={{
          maxHeight: typeof height === "number" ? height : undefined,
          height,
        }}
      >
        <p className="mb-2 font-medium text-[var(--mt-text)]">
          {loadError
            ? `Map unavailable (${loadError})`
            : "Map unavailable — set VITE_GOOGLE_MAPS_API_KEY"}
        </p>
        <ul className="space-y-1 font-mono text-xs text-muted">
          {route.allPoints.map((p, i) => (
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
      className={`w-full overflow-hidden rounded-xl border border-border ${className || ""}`}
      style={{ height }}
    />
  );
}

export function hasTrackingMapData(logs?: TrackingLogs | null) {
  return hasTrackingRouteData(logs);
}
