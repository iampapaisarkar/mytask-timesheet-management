import { useCallback, useEffect, useRef, useState } from "react";
import {
  NativeModules,
  Platform,
  StyleSheet,
  Text,
  View,
  type ComponentType,
  type ReactNode,
  type StyleProp,
  type ViewStyle,
} from "react-native";
import {
  emptyGlobalAddress,
  normalizeAddress,
  parseGooglePlaceComponents,
  type GlobalAddress,
} from "@mytask/utils";
import { mapStyleForTheme, spacing } from "@mytask/theme";
import { ENV } from "../config/env";
import { useThemeStore } from "../store/themeStore";
import { getCurrentPosition } from "../services/backgroundGeolocation";

/** Default map center when geolocation is unavailable (Sydney, AU). */
const FALLBACK_CENTER = { latitude: -33.8688, longitude: 151.2093 };
const REVERSE_GEOCODE_DEBOUNCE_MS = 450;
const REGION_DELTA = 0.01;

type MapsModule = {
  default: ComponentType<{
    style?: StyleProp<ViewStyle>;
    provider?: string;
    customMapStyle?: readonly unknown[];
    mapType?: string;
    showsPointsOfInterest?: boolean;
    showsBuildings?: boolean;
    showsTraffic?: boolean;
    showsCompass?: boolean;
    toolbarEnabled?: boolean;
    scrollEnabled?: boolean;
    zoomEnabled?: boolean;
    initialRegion?: {
      latitude: number;
      longitude: number;
      latitudeDelta: number;
      longitudeDelta: number;
    };
    onPress?: (e: {
      nativeEvent: { coordinate: { latitude: number; longitude: number } };
    }) => void;
    children?: ReactNode;
  }>;
  Marker: ComponentType<{
    coordinate: { latitude: number; longitude: number };
    draggable?: boolean;
    tracksViewChanges?: boolean;
    onDragEnd?: (e: {
      nativeEvent: { coordinate: { latitude: number; longitude: number } };
    }) => void;
  }>;
  PROVIDER_GOOGLE?: string;
};

function loadMapsModule(): MapsModule | null {
  const linked = Boolean(
    NativeModules.AirMapsModule ||
      NativeModules.RNMapsAirModule ||
      NativeModules.RNMapsModule,
  );
  if (!linked) return null;
  try {
    // eslint-disable-next-line @typescript-eslint/no-require-imports
    return require("react-native-maps") as MapsModule;
  } catch {
    return null;
  }
}

const mapsModule = loadMapsModule();

type GeocodeResult = {
  formatted_address?: string;
  place_id?: string;
  address_components?: Array<{
    long_name: string;
    short_name: string;
    types: string[];
  }>;
};

function coordsFromValue(value?: Partial<GlobalAddress> | null) {
  const lat = Number(value?.latitude);
  const lng = Number(value?.longitude);
  if (Number.isFinite(lat) && Number.isFinite(lng)) {
    return { latitude: lat, longitude: lng };
  }
  return null;
}

async function reverseGeocode(
  lat: number,
  lng: number,
  apiKey: string,
): Promise<GlobalAddress> {
  const url =
    `https://maps.googleapis.com/maps/api/geocode/json` +
    `?latlng=${encodeURIComponent(`${lat},${lng}`)}` +
    `&key=${encodeURIComponent(apiKey)}`;
  const res = await fetch(url);
  const json = (await res.json()) as {
    results?: GeocodeResult[];
    status?: string;
  };
  const result = json.results?.[0];
  if (result) {
    return parseGooglePlaceComponents(result.address_components, {
      formatted_address: result.formatted_address,
      place_id: result.place_id,
      latitude: lat,
      longitude: lng,
    });
  }
  return normalizeAddress({
    ...emptyGlobalAddress(),
    formatted_address: `${lat.toFixed(6)}, ${lng.toFixed(6)}`,
    address_line_1: `${lat.toFixed(6)}, ${lng.toFixed(6)}`,
    street: `${lat.toFixed(6)}, ${lng.toFixed(6)}`,
    latitude: lat,
    longitude: lng,
  });
}

/**
 * Interactive Google Map pin picker (mobile parity with web MapLocationPicker).
 * Tap or drag the pin → debounced reverse geocode into GlobalAddress.
 */
export function MapLocationPicker({
  value,
  onChange,
  height = 220,
  useCurrentLocation = true,
}: {
  value: GlobalAddress;
  onChange: (next: GlobalAddress) => void;
  height?: number;
  useCurrentLocation?: boolean;
}) {
  const c = useThemeStore((s) => s.colors);
  const mode = useThemeStore((s) => s.mode);
  const apiKey = ENV.GOOGLE_MAPS_API_KEY;
  const existing = coordsFromValue(value);
  const [center, setCenter] = useState(existing || FALLBACK_CENTER);
  const [statusNote, setStatusNote] = useState<string | null>(null);
  const [ready, setReady] = useState(Boolean(existing));
  const initialized = useRef(false);
  const debounceRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const geocodeSeq = useRef(0);
  const onChangeRef = useRef(onChange);
  onChangeRef.current = onChange;
  const valueRef = useRef(value);
  valueRef.current = value;

  const MapView = mapsModule?.default;
  const Marker = mapsModule?.Marker;
  const provider =
    mapsModule?.PROVIDER_GOOGLE ??
    (Platform.OS === "android" ? "google" : "google");
  const mapRef = useRef<{
    animateToRegion?: (region: {
      latitude: number;
      longitude: number;
      latitudeDelta: number;
      longitudeDelta: number;
    }) => void;
  } | null>(null);

  const applyCoords = useCallback(
    (lat: number, lng: number, geocode: boolean) => {
      setCenter({ latitude: lat, longitude: lng });
      onChangeRef.current(
        normalizeAddress({
          ...valueRef.current,
          latitude: lat,
          longitude: lng,
        }),
      );
      if (!geocode || !apiKey) return;
      if (debounceRef.current) clearTimeout(debounceRef.current);
      debounceRef.current = setTimeout(() => {
        const seq = ++geocodeSeq.current;
        void reverseGeocode(lat, lng, apiKey).then((next) => {
          if (seq !== geocodeSeq.current) return;
          onChangeRef.current(next);
          setStatusNote(null);
        });
      }, REVERSE_GEOCODE_DEBOUNCE_MS);
    },
    [apiKey],
  );

  useEffect(() => {
    if (initialized.current) return;
    initialized.current = true;
    if (existing) {
      setReady(true);
      return;
    }
    if (!useCurrentLocation) {
      setReady(true);
      return;
    }
    let cancelled = false;
    void (async () => {
      try {
        const pos = await getCurrentPosition();
        if (cancelled || !pos) {
          setStatusNote(
            "Location unavailable. Showing a default map — tap or drag the pin.",
          );
          setReady(true);
          return;
        }
        const lat = pos.coords.latitude;
        const lng = pos.coords.longitude;
        setCenter({ latitude: lat, longitude: lng });
        setStatusNote("Centered on your current location.");
        setReady(true);
        if (apiKey) {
          const next = await reverseGeocode(lat, lng, apiKey);
          if (!cancelled) onChangeRef.current(next);
        } else {
          onChangeRef.current(
            normalizeAddress({
              ...emptyGlobalAddress(),
              latitude: lat,
              longitude: lng,
            }),
          );
        }
      } catch {
        if (!cancelled) {
          setStatusNote(
            "Location permission denied or unavailable. Showing a default map — tap or drag the pin.",
          );
          setReady(true);
        }
      }
    })();
    return () => {
      cancelled = true;
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps -- init once
  }, []);

  // Sync pin when external address (e.g. Places autocomplete) updates coords
  useEffect(() => {
    if (!ready) return;
    const coords = coordsFromValue(value);
    if (!coords) return;
    setCenter((prev) => {
      if (
        Math.abs(prev.latitude - coords.latitude) < 1e-7 &&
        Math.abs(prev.longitude - coords.longitude) < 1e-7
      ) {
        return prev;
      }
      mapRef.current?.animateToRegion?.({
        ...coords,
        latitudeDelta: REGION_DELTA,
        longitudeDelta: REGION_DELTA,
      });
      return coords;
    });
  }, [ready, value.latitude, value.longitude]);

  useEffect(() => {
    return () => {
      if (debounceRef.current) clearTimeout(debounceRef.current);
    };
  }, []);

  if (!MapView || !Marker) {
    return (
      <View style={styles.wrap}>
        <Text style={[styles.title, { color: c.text }]}>Map location</Text>
        <Text style={[styles.hint, { color: c.muted }]}>
          Map unavailable until react-native-maps is linked. Use address search
          or enter coordinates manually.
        </Text>
      </View>
    );
  }

  return (
    <View style={styles.wrap}>
      <Text style={[styles.title, { color: c.text }]}>Map location</Text>
      <Text style={[styles.hint, { color: c.muted }]}>
        Tap the map or drag the pin to update the full address.
      </Text>
      {statusNote ? (
        <Text style={[styles.hint, { color: c.muted, marginBottom: 6 }]}>
          {statusNote}
        </Text>
      ) : null}
      <View
        style={[
          styles.mapBox,
          { height, borderColor: c.border, backgroundColor: c.surface },
        ]}
      >
        {ready ? (
          <MapView
            ref={mapRef as never}
            style={StyleSheet.absoluteFill}
            provider={provider}
            customMapStyle={mapStyleForTheme(mode)}
            mapType="standard"
            showsPointsOfInterest={false}
            showsBuildings={false}
            showsTraffic={false}
            showsCompass={false}
            toolbarEnabled={false}
            initialRegion={{
              ...center,
              latitudeDelta: REGION_DELTA,
              longitudeDelta: REGION_DELTA,
            }}
            onPress={(e) => {
              const { latitude, longitude } = e.nativeEvent.coordinate;
              applyCoords(latitude, longitude, true);
            }}
          >
            <Marker
              coordinate={center}
              draggable
              tracksViewChanges={false}
              onDragEnd={(e) => {
                const { latitude, longitude } = e.nativeEvent.coordinate;
                applyCoords(latitude, longitude, true);
              }}
            />
          </MapView>
        ) : (
          <Text style={[styles.hint, { color: c.muted, padding: 12 }]}>
            Locating…
          </Text>
        )}
      </View>
      {value.latitude != null &&
      value.latitude !== "" &&
      value.longitude != null &&
      value.longitude !== "" ? (
        <Text style={[styles.hint, { color: c.muted, marginTop: 6 }]}>
          Lat {Number(value.latitude).toFixed(6)}, Lng{" "}
          {Number(value.longitude).toFixed(6)}
        </Text>
      ) : null}
    </View>
  );
}

const styles = StyleSheet.create({
  wrap: { marginBottom: spacing.md },
  title: { fontSize: 13, fontWeight: "600", marginBottom: 4 },
  hint: { fontSize: 12, marginBottom: 8 },
  mapBox: {
    width: "100%",
    borderWidth: 1,
    borderRadius: 12,
    overflow: "hidden",
  },
});
