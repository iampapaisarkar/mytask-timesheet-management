import {
  Fragment,
  memo,
  useMemo,
  type ComponentType,
  type ReactNode,
} from "react";
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
import {
  activityColors,
  mapStyleForTheme,
  mapRouteStyle,
  spacing,
} from "@mytask/theme";
import type {
  LatLng,
  TimesheetActivityType,
  TrackingLogs,
} from "@mytask/types";
import {
  hasTrackingRouteData,
  processTrackingRoute,
  type MapMarkerDescriptor,
  type ProcessedRoute,
} from "@mytask/utils";
import { useThemeStore } from "../store/themeStore";

export type { TrackingPoint, TrackingLogs } from "@mytask/types";

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
    zIndex?: number;
    anchor?: { x: number; y: number };
    children?: ReactNode;
  }>;
  Polyline: ComponentType<{
    coordinates: Array<{ latitude: number; longitude: number }>;
    strokeColor?: string;
    strokeWidth?: number;
    strokeColors?: string[];
    lineCap?: "butt" | "round" | "square";
    lineJoin?: "miter" | "round" | "bevel";
    geodesic?: boolean;
    zIndex?: number;
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

function regionFromRoute(route: ProcessedRoute, first: LatLng) {
  if (!route.bounds) {
    return {
      latitude: first.lat,
      longitude: first.lng,
      latitudeDelta: 0.04,
      longitudeDelta: 0.04,
    };
  }
  const { minLat, maxLat, minLng, maxLng } = route.bounds;
  const latDelta = Math.max(0.01, (maxLat - minLat) * 1.4);
  const lngDelta = Math.max(0.01, (maxLng - minLng) * 1.4);
  return {
    latitude: (minLat + maxLat) / 2,
    longitude: (minLng + maxLng) / 2,
    latitudeDelta: latDelta,
    longitudeDelta: lngDelta,
  };
}

const ActivityMarkerView = memo(function ActivityMarkerView({
  marker,
}: {
  marker: MapMarkerDescriptor;
}) {
  const size = marker.size;
  const inner =
    marker.glyph === "end" ? (
      <View
        style={{
          width: size * 0.32,
          height: size * 0.32,
          borderRadius: 2,
          backgroundColor: "#fff",
        }}
      />
    ) : marker.glyph === "travel" ? (
      <View
        style={{
          width: 0,
          height: 0,
          borderLeftWidth: 5,
          borderRightWidth: 5,
          borderBottomWidth: 9,
          borderLeftColor: "transparent",
          borderRightColor: "transparent",
          borderBottomColor: "#fff",
        }}
      />
    ) : marker.glyph === "break" ? (
      <View style={{ flexDirection: "row", gap: 3 }}>
        <View
          style={{
            width: 2.5,
            height: size * 0.34,
            borderRadius: 1,
            backgroundColor: "#fff",
          }}
        />
        <View
          style={{
            width: 2.5,
            height: size * 0.34,
            borderRadius: 1,
            backgroundColor: "#fff",
          }}
        />
      </View>
    ) : (
      <View
        style={{
          width: size * 0.28,
          height: size * 0.28,
          borderRadius: size,
          backgroundColor: "#fff",
        }}
      />
    );

  return (
    <View
      style={{
        width: size,
        height: size,
        borderRadius: size / 2,
        backgroundColor: marker.color,
        borderWidth: 2,
        borderColor: "#fff",
        alignItems: "center",
        justifyContent: "center",
        shadowColor: "#000",
        shadowOpacity: 0.2,
        shadowRadius: 2,
        shadowOffset: { width: 0, height: 1 },
        elevation: 3,
      }}
    >
      {inner}
    </View>
  );
});

function PointsList({
  points,
}: {
  points: Array<LatLng & { type: TimesheetActivityType }>;
}) {
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
            style={[
              styles.dot,
              {
                backgroundColor:
                  activityColors[p.type] ?? activityColors.working,
              },
            ]}
          />
          <View style={styles.rowBody}>
            <Text style={[styles.type, { color: c.text }]}>{p.type}</Text>
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
  currentLocation = null,
}: {
  trackingLogs?: TrackingLogs | null;
  selectedType?: TimesheetActivityType | null;
  currentLocation?: { latitude: number; longitude: number } | null;
}) {
  const c = useThemeStore((s) => s.colors);
  const mode = useThemeStore((s) => s.mode);

  const route = useMemo(
    () => processTrackingRoute(trackingLogs, { selectedType }),
    [trackingLogs, selectedType],
  );

  const MapView = mapsModule?.default;
  const Marker = mapsModule?.Marker;
  const Polyline = mapsModule?.Polyline;
  const provider =
    mapsModule?.PROVIDER_GOOGLE ??
    (Platform.OS === "android" ? "google" : "google");
  const canRenderMap = Boolean(MapView && Marker && route.segments.length > 0);

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
        <PointsList points={route.allPoints} />
      </View>
    );
  }

  const first = route.allPoints[0];
  const routeKey = `${route.segments.length}-${route.allPoints.length}-${route.allPoints[route.allPoints.length - 1]?.lat}`;

  return (
    <View style={[styles.mapWrap, { backgroundColor: c.surface }]}>
      <MapView
        key={`track-map-${routeKey}`}
        style={StyleSheet.absoluteFill}
        provider={provider}
        customMapStyle={mapStyleForTheme(mode)}
        mapType="standard"
        showsPointsOfInterest={false}
        showsBuildings={false}
        showsTraffic={false}
        showsCompass={false}
        toolbarEnabled={false}
        initialRegion={regionFromRoute(route, first)}
      >
        {/* Polylines first (under markers) */}
        {route.segments.map((segment) => {
          const coords = segment.path.map((p) => ({
            latitude: p.lat,
            longitude: p.lng,
          }));
          if (coords.length < 2 && coords.length === 1) {
            // Single-point segment: still draw a tiny stub so the color shows
            coords.push(coords[0]);
          }
          return (
            <Fragment key={segment.id}>
              {Polyline ? (
                <>
                  <Polyline
                    coordinates={coords}
                    strokeColor={segment.style.underlayColor}
                    strokeWidth={segment.style.underlayWidth}
                    lineCap={segment.style.lineCap}
                    lineJoin={segment.style.lineJoin}
                    geodesic={segment.style.geodesic}
                    zIndex={segment.style.zIndex}
                  />
                  <Polyline
                    coordinates={coords}
                    strokeColor={segment.style.color}
                    strokeWidth={segment.style.width}
                    lineCap={segment.style.lineCap}
                    lineJoin={segment.style.lineJoin}
                    geodesic={segment.style.geodesic}
                    zIndex={segment.style.zIndex + 0.1}
                  />
                </>
              ) : null}
            </Fragment>
          );
        })}

        {/* End then start markers (sorted by zIndex ascending) */}
        {route.markers.map((marker) => (
          <Marker
            key={marker.id}
            coordinate={{
              latitude: marker.displayPosition.lat,
              longitude: marker.displayPosition.lng,
            }}
            title={marker.title}
            tracksViewChanges={false}
            zIndex={marker.zIndex}
            anchor={{ x: 0.5, y: 0.5 }}
          >
            <ActivityMarkerView marker={marker} />
          </Marker>
        ))}

        {currentLocation ? (
          <Marker
            coordinate={currentLocation}
            title="Current location"
            tracksViewChanges={false}
            zIndex={4}
            anchor={{ x: 0.5, y: 0.5 }}
          >
            <View
              style={{
                width: mapRouteStyle.markerCurrentSize,
                height: mapRouteStyle.markerCurrentSize,
                borderRadius: mapRouteStyle.markerCurrentSize / 2,
                backgroundColor: activityColors.working,
                borderWidth: 2,
                borderColor: "#fff",
              }}
            />
          </Marker>
        ) : null}
      </MapView>
    </View>
  );
}

export function hasTrackingMapData(logs?: TrackingLogs | null) {
  return hasTrackingRouteData(logs);
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
