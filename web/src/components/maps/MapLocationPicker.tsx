import { useCallback, useEffect, useRef, useState } from "react";
import {
  getGoogleMapsApiKey,
  loadGoogleMaps,
} from "@/lib/googleMaps";
import {
  emptyAddress,
  type AddressValue,
} from "@/components/GoogleAddress";

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

function component(
  components: Array<{ long_name: string; short_name: string; types: string[] }> | undefined,
  type: string,
  short = false,
): string {
  const hit = components?.find((c) => c.types.includes(type));
  return short ? hit?.short_name || "" : hit?.long_name || "";
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
): AddressValue {
  const comps = result.address_components;
  const streetNumber = component(comps, "street_number");
  const route = component(comps, "route");
  const street = [streetNumber, route].filter(Boolean).join(" ").trim();
  const adminArea =
    component(comps, "administrative_area_level_1") ||
    component(comps, "administrative_area_level_2");
  const adminShort =
    component(comps, "administrative_area_level_1", true) ||
    component(comps, "administrative_area_level_2", true);
  return {
    ...emptyAddress(),
    formatted_address: result.formatted_address || "",
    street_address: street || result.formatted_address || "",
    address_1: street || result.formatted_address || "",
    city:
      component(comps, "locality") ||
      component(comps, "postal_town") ||
      component(comps, "sublocality") ||
      "",
    administrative_area: adminArea,
    postcode: component(comps, "postal_code"),
    postal_code: component(comps, "postal_code"),
    country: component(comps, "country"),
    country_code: component(comps, "country", true),
    place_id: result.place_id || "",
    latitude: lat,
    longitude: lng,
    state: adminArea ? { name: adminArea, code: adminShort || undefined } : null,
  };
}

/**
 * Interactive Google Map pin picker. Click / drag to set coordinates,
 * reverse-geocode into AddressValue (keeps autocomplete in sync via onChange).
 */
export function MapLocationPicker({
  value,
  onChange,
  height = 280,
}: {
  value: AddressValue;
  onChange: (next: AddressValue) => void;
  height?: number;
}) {
  const containerRef = useRef<HTMLDivElement | null>(null);
  const mapRef = useRef<MapInstance | null>(null);
  const markerRef = useRef<MarkerInstance | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [ready, setReady] = useState(false);
  const onChangeRef = useRef(onChange);
  onChangeRef.current = onChange;

  const applyLatLng = useCallback(async (lat: number, lng: number) => {
    const maps = getMaps();
    if (!maps) return;
    markerRef.current?.setPosition({ lat, lng });
    mapRef.current?.setCenter({ lat, lng });

    await new Promise<void>((resolve) => {
      const geocoder = new maps.Geocoder();
      geocoder.geocode({ location: { lat, lng } }, (results, status) => {
        if (status === "OK" && results?.[0]) {
          onChangeRef.current(addressFromGeocode(results[0], lat, lng));
        } else {
          onChangeRef.current({
            ...emptyAddress(),
            formatted_address: `${lat.toFixed(6)}, ${lng.toFixed(6)}`,
            street_address: `${lat.toFixed(6)}, ${lng.toFixed(6)}`,
            address_1: `${lat.toFixed(6)}, ${lng.toFixed(6)}`,
            latitude: lat,
            longitude: lng,
          });
        }
        resolve();
      });
    });
  }, []);

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
      .then(() => {
        if (cancelled || !containerRef.current) return;
        const maps = getMaps();
        if (!maps) {
          setError("Google Maps unavailable");
          return;
        }

        const lat = Number(value.latitude);
        const lng = Number(value.longitude);
        const hasCoords = Number.isFinite(lat) && Number.isFinite(lng);
        const center = hasCoords
          ? { lat, lng }
          : { lat: -33.8688, lng: 151.2093 };

        const map = new maps.Map(containerRef.current, {
          center,
          zoom: hasCoords ? 16 : 4,
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
          void applyLatLng(pos.lat(), pos.lng());
        });
        marker.addListener("dragend", () => {
          const pos = marker.getPosition();
          if (!pos) return;
          void applyLatLng(pos.lat(), pos.lng());
        });

        setReady(true);
        setError(null);
      })
      .catch((err: Error) => {
        if (!cancelled) setError(err.message || "Failed to load map");
      });

    return () => {
      cancelled = true;
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
    const lat = Number(value.latitude);
    const lng = Number(value.longitude);
    if (!Number.isFinite(lat) || !Number.isFinite(lng)) return;
    markerRef.current.setPosition({ lat, lng });
    mapRef.current.setCenter({ lat, lng });
    mapRef.current.setZoom(16);
  }, [ready, value.latitude, value.longitude]);

  return (
    <div className="flex flex-col gap-2">
      <p className="text-sm font-medium text-[var(--mt-text)]">
        Map location
      </p>
      <p className="text-xs text-[var(--mt-muted)]">
        Click the map or drag the pin to set the exact job coordinates.
      </p>
      {error ? (
        <p className="rounded-xl border border-amber-500/40 bg-amber-500/10 px-3 py-2 text-sm text-amber-800 dark:text-amber-200">
          {error}
        </p>
      ) : null}
      <div
        ref={containerRef}
        className="w-full overflow-hidden rounded-xl border border-border"
        style={{ height }}
      />
      {value.latitude !== "" && value.longitude !== "" ? (
        <p className="text-xs text-[var(--mt-muted)]">
          Lat {Number(value.latitude).toFixed(6)}, Lng{" "}
          {Number(value.longitude).toFixed(6)}
        </p>
      ) : null}
    </div>
  );
}

export default MapLocationPicker;
