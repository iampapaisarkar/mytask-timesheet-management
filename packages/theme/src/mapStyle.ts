/**
 * Minimal Google Maps styles — light and dark variants matched to myTask chrome.
 * Shared by web (Maps JS `styles`) and mobile (`customMapStyle`).
 */

export type MapThemeMode = "light" | "dark";

export const MINIMAL_MAP_STYLE_LIGHT = [
  { elementType: "geometry", stylers: [{ color: "#f5f7f8" }] },
  { elementType: "labels.icon", stylers: [{ visibility: "off" }] },
  { elementType: "labels.text.fill", stylers: [{ color: "#5b6b73" }] },
  { elementType: "labels.text.stroke", stylers: [{ color: "#f5f7f8" }] },
  {
    featureType: "administrative",
    elementType: "geometry",
    stylers: [{ visibility: "off" }],
  },
  { featureType: "administrative.land_parcel", stylers: [{ visibility: "off" }] },
  {
    featureType: "administrative.neighborhood",
    stylers: [{ visibility: "off" }],
  },
  {
    featureType: "poi",
    elementType: "labels.icon",
    stylers: [{ visibility: "off" }],
  },
  { featureType: "poi", elementType: "geometry", stylers: [{ color: "#e8eef0" }] },
  {
    featureType: "poi.park",
    elementType: "geometry",
    stylers: [{ color: "#d7ebe4" }],
  },
  {
    featureType: "poi.park",
    elementType: "labels.text.fill",
    stylers: [{ color: "#3d7a6a" }],
  },
  {
    featureType: "road",
    elementType: "geometry",
    stylers: [{ color: "#ffffff" }],
  },
  {
    featureType: "road",
    elementType: "labels.icon",
    stylers: [{ visibility: "off" }],
  },
  {
    featureType: "road.highway",
    elementType: "geometry",
    stylers: [{ color: "#dfe8ea" }],
  },
  {
    featureType: "road.highway",
    elementType: "geometry.stroke",
    stylers: [{ color: "#c5d3d7" }],
  },
  {
    featureType: "road.local",
    elementType: "labels.text.fill",
    stylers: [{ color: "#8a9aa2" }],
  },
  { featureType: "transit", stylers: [{ visibility: "off" }] },
  {
    featureType: "water",
    elementType: "geometry",
    stylers: [{ color: "#c9e4ef" }],
  },
  {
    featureType: "water",
    elementType: "labels.text.fill",
    stylers: [{ color: "#5a8aa0" }],
  },
] as const;

export const MINIMAL_MAP_STYLE_DARK = [
  { elementType: "geometry", stylers: [{ color: "#1c2428" }] },
  { elementType: "labels.icon", stylers: [{ visibility: "off" }] },
  { elementType: "labels.text.fill", stylers: [{ color: "#9aadb6" }] },
  { elementType: "labels.text.stroke", stylers: [{ color: "#1c2428" }] },
  {
    featureType: "administrative",
    elementType: "geometry",
    stylers: [{ visibility: "off" }],
  },
  { featureType: "administrative.land_parcel", stylers: [{ visibility: "off" }] },
  {
    featureType: "administrative.neighborhood",
    stylers: [{ visibility: "off" }],
  },
  {
    featureType: "poi",
    elementType: "labels.icon",
    stylers: [{ visibility: "off" }],
  },
  { featureType: "poi", elementType: "geometry", stylers: [{ color: "#243036" }] },
  {
    featureType: "poi.park",
    elementType: "geometry",
    stylers: [{ color: "#1e3a34" }],
  },
  {
    featureType: "poi.park",
    elementType: "labels.text.fill",
    stylers: [{ color: "#6fb39f" }],
  },
  {
    featureType: "road",
    elementType: "geometry",
    stylers: [{ color: "#2a343a" }],
  },
  {
    featureType: "road",
    elementType: "labels.icon",
    stylers: [{ visibility: "off" }],
  },
  {
    featureType: "road.highway",
    elementType: "geometry",
    stylers: [{ color: "#343f46" }],
  },
  {
    featureType: "road.highway",
    elementType: "geometry.stroke",
    stylers: [{ color: "#1a2226" }],
  },
  {
    featureType: "road.local",
    elementType: "labels.text.fill",
    stylers: [{ color: "#7f9199" }],
  },
  { featureType: "transit", stylers: [{ visibility: "off" }] },
  {
    featureType: "water",
    elementType: "geometry",
    stylers: [{ color: "#0f2a36" }],
  },
  {
    featureType: "water",
    elementType: "labels.text.fill",
    stylers: [{ color: "#5a8aa0" }],
  },
] as const;

/** @deprecated Prefer theme-aware helper */
export const MINIMAL_MAP_STYLE = MINIMAL_MAP_STYLE_LIGHT;

export function mapStyleForTheme(mode: MapThemeMode) {
  return mode === "dark" ? MINIMAL_MAP_STYLE_DARK : MINIMAL_MAP_STYLE_LIGHT;
}
