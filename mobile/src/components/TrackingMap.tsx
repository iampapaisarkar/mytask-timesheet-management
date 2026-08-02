import { Fragment, useMemo, type ComponentType, type ReactNode } from "react";
import {
  NativeModules,
  Platform,
  ScrollView,
  StyleSheet,
  Text,
  View,
  type StyleProp,
  type ViewStyle,
} from "react-native";
import { mapStyleForTheme, spacing } from "@mytask/theme";
import { useThemeStore } from "../store/themeStore";

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

type FlatPoint = {
  lat: number;
  lng: number;
  type: "working" | "break" | "travel";
  label: string;
};

const TYPE_COLORS: Record<FlatPoint["type"], string> = {
  working: "#04B6B1",
  break: "#F59E0B",
  travel: "#3B82F6",
};

function toLatLng(point: {
  latitude?: number | string | null;
  longitude?: number | string | null;
}): { lat: number; lng: number } | null {
  const lat = Number(point?.latitude);
  const lng = Number(point?.longitude);
  if (!Number.isFinite(lat) || !Number.isFinite(lng)) return null;
  return { lat, lng };
}

function flattenTrackingLogs(logs?: TrackingLogs | null): FlatPoint[] {
  if (!logs) return [];
  const out: FlatPoint[] = [];
  for (const key of ["travels", "breaks", "workings"] as const) {
    const groups = logs[key];
    if (!Array.isArray(groups)) continue;
    const type = key.slice(0, -1) as FlatPoint["type"];
    for (const group of groups) {
      if (!Array.isArray(group)) continue;
      for (const point of group) {
        const pos = toLatLng(point);
        if (!pos) continue;
        out.push({
          ...pos,
          type,
          label: point.type?.name || point.type?.code || type,
        });
      }
    }
  }
  return out;
}

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
    initialRegion?: {
      latitude: number;
      longitude: number;
      latitudeDelta: number;
      longitudeDelta: number;
    };
    children?: ReactNode;
  }>;
  Marker: ComponentType<{
    coordinate: { latitude: number; longitude: number };
    pinColor?: string;
    title?: string;
    description?: string;
    tracksViewChanges?: boolean;
  }>;
  Polyline: ComponentType<{
    coordinates: Array<{ latitude: number; longitude: number }>;
    strokeColor?: string;
    strokeWidth?: number;
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

function PointsList({ points }: { points: FlatPoint[] }) {
  const c = useThemeStore((s) => s.colors);

  if (!points.length) {
    return (
      <Text style={[styles.empty, { color: c.muted }]}>
        No tracking points for this day
      </Text>
    );
  }

  return (
    <ScrollView style={styles.list} nestedScrollEnabled>
      {points.map((p, i) => (
        <View
          key={`${p.type}-${p.lat}-${p.lng}-${i}`}
          style={[styles.row, { borderBottomColor: c.border }]}
        >
          <View
            style={[styles.dot, { backgroundColor: TYPE_COLORS[p.type] }]}
          />
          <View style={styles.rowBody}>
            <Text style={[styles.type, { color: c.text }]}>
              {p.label || p.type}
            </Text>
            <Text style={[styles.coords, { color: c.muted }]}>
              {p.lat.toFixed(6)}, {p.lng.toFixed(6)}
            </Text>
          </View>
        </View>
      ))}
    </ScrollView>
  );
}

export function TrackingMap({
  trackingLogs,
  selectedType = null,
}: {
  trackingLogs?: TrackingLogs | null;
  selectedType?: FlatPoint["type"] | null;
}) {
  const c = useThemeStore((s) => s.colors);
  const mode = useThemeStore((s) => s.mode);
  const points = useMemo(
    () => flattenTrackingLogs(trackingLogs),
    [trackingLogs],
  );

  const MapView = mapsModule?.default;
  const Marker = mapsModule?.Marker;
  const Polyline = mapsModule?.Polyline;
  const provider =
    mapsModule?.PROVIDER_GOOGLE ??
    (Platform.OS === "android" ? "google" : "google");
  const canRenderMap = Boolean(MapView && Marker && points.length > 0);

  if (!canRenderMap || !MapView || !Marker) {
    return (
      <View style={[styles.fallback, { backgroundColor: c.surface }]}>
        <Text style={[styles.fallbackTitle, { color: c.text }]}>
          Tracking points
        </Text>
        {!mapsModule ? (
          <Text style={[styles.hint, { color: c.muted }]}>
            Map view unavailable until react-native-maps is linked (pods /
            rebuild). Showing coordinate list.
          </Text>
        ) : null}
        <PointsList points={points} />
      </View>
    );
  }

  const first = points[0];
  const byType = points.reduce(
    (acc, p) => {
      (acc[p.type] ||= []).push(p);
      return acc;
    },
    {} as Record<FlatPoint["type"], FlatPoint[]>,
  );

  return (
    <View style={[styles.mapWrap, { backgroundColor: c.surface }]}>
      <MapView
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
          latitude: first.lat,
          longitude: first.lng,
          latitudeDelta: 0.04,
          longitudeDelta: 0.04,
        }}
      >
        {(Object.keys(byType) as FlatPoint["type"][]).map((type) => {
          const coords = byType[type].map((p) => ({
            latitude: p.lat,
            longitude: p.lng,
          }));
          return (
            <Fragment key={type}>
              {Polyline ? (
                <Polyline
                  coordinates={coords}
                  strokeColor={TYPE_COLORS[type]}
                  strokeWidth={
                    selectedType && selectedType === type
                      ? 5
                      : selectedType
                        ? 2
                        : 3
                  }
                />
              ) : null}
              {byType[type].map((p, i) => (
                <Marker
                  key={`${type}-${i}`}
                  coordinate={{ latitude: p.lat, longitude: p.lng }}
                  pinColor={TYPE_COLORS[type]}
                  title={p.label || type}
                  description={`${p.lat.toFixed(5)}, ${p.lng.toFixed(5)}`}
                  tracksViewChanges={false}
                />
              ))}
            </Fragment>
          );
        })}
      </MapView>
    </View>
  );
}

export function hasTrackingMapData(logs?: TrackingLogs | null) {
  return flattenTrackingLogs(logs).length > 0;
}

const styles = StyleSheet.create({
  mapWrap: {
    flex: 1,
    overflow: "hidden",
  },
  fallback: {
    flex: 1,
    padding: spacing.md,
  },
  fallbackTitle: { fontSize: 14, fontWeight: "700", marginBottom: 4 },
  hint: { fontSize: 11, marginBottom: spacing.sm },
  list: { flex: 1 },
  row: {
    flexDirection: "row",
    alignItems: "center",
    paddingVertical: 8,
    borderBottomWidth: StyleSheet.hairlineWidth,
    gap: 10,
  },
  dot: { width: 10, height: 10, borderRadius: 5 },
  rowBody: { flex: 1 },
  type: { fontSize: 13, fontWeight: "600", textTransform: "capitalize" },
  coords: { fontSize: 11, fontFamily: "Menlo", marginTop: 2 },
  empty: { textAlign: "center", marginTop: spacing.md, fontSize: 13 },
});
