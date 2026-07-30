import { useCallback, useEffect, useRef, useState } from "react";
import {
  emptyGlobalAddress,
  normalizeAddress,
  parseGooglePlaceComponents,
  type GlobalAddress,
} from "@mytask/utils";
import {
  getGoogleMapsApiKey,
  loadGoogleMaps,
} from "@/lib/googleMaps";

/** Default map center when geolocation is unavailable (Sydney, AU). */
const FALLBACK_CENTER = { lat: -33.8688, lng: 151.2093 };
const REVERSE_GEOCODE_DEBOUNCE_MS = 450;

type MapInstance = {
  setCenter: (c: { lat: number; lng: number }) => void;
  setZoom: (z: number) => void;
  addListener: (
    event: string,
    handler: (e: {
      latLng?: { lat: () => number; lng: () => number };
    }) => void,
  ) => void;
};

type MarkerInstance = {
  setMap: (m: unknown) => void;
  setPosition: (c: { lat: number; lng: number }) => void;
  addListener: (event: string, handler: () => void) => void;
  getPosition: () => { lat: () => number; lng: () => number } | null;
};

type MapsApi = {
  Map: new (el: HTMLElement, opts: Record<string, unknown>) => MapInstance;
  Marker: new (opts: Record<string, unknown>) => MarkerInstance;
  Geocoder: new () => {
    geocode: (
      req: { location: { lat: number; lng: number } },
      cb: (
        results: Array<{
          formatted_address?: string;
          place_id?: string;
          address_components?: Array<{
            long_name: string;
            short_name: string;
            types: string[];
          }>;
        }> | null,
        status: string,
      ) => void,
    ) => void;
  };
  event?: { clearInstanceListeners?: (instance: unknown) => void };
};

function getMaps(): MapsApi | undefined {
  return (window as Window & { google?: { maps?: MapsApi } }).google?.maps;
}

function addressFromGeocode(
  result: {
    formatted_address?: string;
    place_id?: string;
    address_components?: Array<{
      long_name: string;
      short_name: string;
      types: string[];
    }>;
  },
  lat: number,
  lng: number,
): GlobalAddress {
  return parseGooglePlaceComponents(result.address_components, {
    formatted_address: result.formatted_address,
    place_id: result.place_id,
    latitude: lat,
    longitude: lng,
  });
}

function coordsFromValue(value?: Partial<GlobalAddress> | null) {
  const lat = Number(value?.latitude);
  const lng = Number(value?.longitude);
  if (Number.isFinite(lat) && Number.isFinite(lng)) {
    return { lat, lng };
  }
  return null;
}

/**
 * Interactive Google Map pin picker.
 * - On first open without coords: requests current location, reverse-geocodes.
 * - Permission denied / GPS unavailable: falls back to a safe default center.
 * - Click / drag: reverse-geocodes (debounced) into all address fields.
 */
export function MapLocationPicker({
  value,
  onChange,
  height = 280,
  /** When true (default), request browser geolocation if no coords yet. */
  useCurrentLocation = true,
}: {
  value: GlobalAddress;
  onChange: (next: GlobalAddress) => void;
  height?: number;
  useCurrentLocation?: boolean;
}) {
  const containerRef = useRef<HTMLDivElement | null>(null);
  const mapRef = useRef<MapInstance | null>(null);
  const markerRef = useRef<MarkerInstance | null>(null);
  const debounceRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const geocodeSeq = useRef(0);
  const [error, setError] = useState<string | null>(null);
  const [statusNote, setStatusNote] = useState<string | null>(null);
  const [ready, setReady] = useState(false);
  const onChangeRef = useRef(onChange);
  onChangeRef.current = onChange;
  const valueRef = useRef(value);
  valueRef.current = value;
  const initializedLocation = useRef(false);

  const reverseGeocode = useCallback((lat: number, lng: number) => {
    const maps = getMaps();
    if (!maps) return;
    markerRef.current?.setPosition({ lat, lng });
    mapRef.current?.setCenter({ lat, lng });

    const seq = ++geocodeSeq.current;
    const geocoder = new maps.Geocoder();
    geocoder.geocode({ location: { lat, lng } }, (results, status) => {
      if (seq !== geocodeSeq.current) return;
      if (status === "OK" && results?.[0]) {
        onChangeRef.current(addressFromGeocode(results[0], lat, lng));
        setStatusNote(null);
      } else {
        onChangeRef.current(
          normalizeAddress({
            ...emptyGlobalAddress(),
            formatted_address: `${lat.toFixed(6)}, ${lng.toFixed(6)}`,
            address_line_1: `${lat.toFixed(6)}, ${lng.toFixed(6)}`,
            street: `${lat.toFixed(6)}, ${lng.toFixed(6)}`,
            latitude: lat,
            longitude: lng,
          }),
        );
        setStatusNote(
          "Could not reverse-geocode this location. Coordinates were kept; fill address fields manually.",
        );
      }
    });
  }, []);

  const scheduleReverseGeocode = useCallback(
    (lat: number, lng: number) => {
      if (debounceRef.current) clearTimeout(debounceRef.current);
      onChangeRef.current(
        normalizeAddress({
          ...valueRef.current,
          latitude: lat,
          longitude: lng,
        }),
      );
      debounceRef.current = setTimeout(() => {
        reverseGeocode(lat, lng);
      }, REVERSE_GEOCODE_DEBOUNCE_MS);
    },
    [reverseGeocode],
  );

  const scheduleRef = useRef(scheduleReverseGeocode);
  scheduleRef.current = scheduleReverseGeocode;

  useEffect(() => {
    const key = getGoogleMapsApiKey();
    if (!key || !containerRef.current) {
      setError(
        key
          ? null
          : "Google Maps API key missing (VITE_GOOGLE_MAPS_API_KEY).",
      );
      return;
    }

    let cancelled = false;
    void loadGoogleMaps(key)
      .then(async () => {
        if (cancelled || !containerRef.current) return;
        const maps = getMaps();
        if (!maps) {
          setError("Google Maps unavailable");
          return;
        }

        const existing = coordsFromValue(value);
        let center = existing || FALLBACK_CENTER;
        let zoom = existing ? 16 : 4;
        let shouldGeocode = false;

        if (!existing && useCurrentLocation && !initializedLocation.current) {
          initializedLocation.current = true;
          try {
            const position = await new Promise<GeolocationPosition>(
              (resolve, reject) => {
                if (!navigator.geolocation) {
                  reject(new Error("Geolocation unavailable"));
                  return;
                }
                navigator.geolocation.getCurrentPosition(resolve, reject, {
                  enableHighAccuracy: true,
                  timeout: 10000,
                  maximumAge: 60_000,
                });
              },
            );
            if (cancelled) return;
            center = {
              lat: position.coords.latitude,
              lng: position.coords.longitude,
            };
            zoom = 16;
            shouldGeocode = true;
            setStatusNote("Centered on your current location.");
          } catch {
            if (cancelled) return;
            center = FALLBACK_CENTER;
            zoom = 4;
            setStatusNote(
              "Location permission denied or unavailable. Showing a default map — search or drag the pin.",
            );
          }
        }

        const map = new maps.Map(containerRef.current, {
          center,
          zoom,
          mapTypeControl: false,
          streetViewControl: false,
          fullscreenControl: false,
        });
        mapRef.current = map;

        const marker = new maps.Marker({
          map,
          position: center,
          draggable: true,
        });
        markerRef.current = marker;

        map.addListener("click", (e) => {
          const pos = e.latLng;
          if (!pos) return;
          scheduleRef.current(pos.lat(), pos.lng());
        });
        marker.addListener("dragend", () => {
          const pos = marker.getPosition();
          if (!pos) return;
          scheduleRef.current(pos.lat(), pos.lng());
        });

        setReady(true);
        setError(null);

        if (shouldGeocode) {
          reverseGeocode(center.lat, center.lng);
        }
      })
      .catch((err: Error) => {
        if (!cancelled) setError(err.message || "Failed to load map");
      });

    return () => {
      cancelled = true;
      if (debounceRef.current) clearTimeout(debounceRef.current);
      const maps = getMaps();
      if (mapRef.current) maps?.event?.clearInstanceListeners?.(mapRef.current);
      if (markerRef.current) {
        maps?.event?.clearInstanceListeners?.(markerRef.current);
        markerRef.current.setMap(null);
      }
      mapRef.current = null;
      markerRef.current = null;
    };
    // Initialize once when mounted
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // Sync external address changes (e.g. autocomplete) onto the map pin
  useEffect(() => {
    if (!ready || !mapRef.current || !markerRef.current) return;
    const coords = coordsFromValue(value);
    if (!coords) return;
    markerRef.current.setPosition(coords);
    mapRef.current.setCenter(coords);
    mapRef.current.setZoom(16);
  }, [ready, value.latitude, value.longitude]);

  return (
    <div className="flex flex-col gap-2">
      <p className="text-sm font-medium text-[var(--mt-text)]">Map location</p>
      <p className="text-xs text-[var(--mt-muted)]">
        Click the map or drag the pin to update the full address (debounced
        reverse geocode).
      </p>
      {error ? (
        <p className="rounded-xl border border-amber-500/40 bg-amber-500/10 px-3 py-2 text-sm text-amber-800 dark:text-amber-200">
          {error}
        </p>
      ) : null}
      {statusNote && !error ? (
        <p className="text-xs text-[var(--mt-muted)]">{statusNote}</p>
      ) : null}
      <div
        ref={containerRef}
        className="w-full overflow-hidden rounded-xl border border-border"
        style={{ height }}
      />
      {value.latitude != null &&
      value.latitude !== "" &&
      value.longitude != null &&
      value.longitude !== "" ? (
        <p className="text-xs text-[var(--mt-muted)]">
          Lat {Number(value.latitude).toFixed(6)}, Lng{" "}
          {Number(value.longitude).toFixed(6)}
        </p>
      ) : null}
    </div>
  );
}

export default MapLocationPicker;
