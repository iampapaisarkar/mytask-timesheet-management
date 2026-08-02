/** myTask design tokens — primary #04B6B1 */

export const colors = {
  primary: "#04B6B1",
  primaryHover: "#039E9A",
  primaryMuted: "rgba(4, 182, 177, 0.12)",
  primarySoft: "#E6F8F7",
  secondary: "#0F766E",
  accent: "#14B8A6",
  positive: "#10B981",
  positiveSoft: "#D1FAE5",
  positiveText: "#047857",
  negative: "#EF4444",
  negativeSoft: "#FEE2E2",
  negativeText: "#B91C1C",
  info: "#6366F1",
  infoSoft: "#E0E7FF",
  infoText: "#4338CA",
  warning: "#F59E0B",
  warningSoft: "#FEF3C7",
  warningText: "#B45309",
  neutral: "#94A3B8",
  neutralSoft: "#F1F5F9",
  neutralText: "#475569",
  white: "#FFFFFF",
  black: "#0B1220",
  /** Light-mode defaults for React Native StyleSheet usage */
  background: "#F8F9FB",
  surface: "#FFFFFF",
  border: "#E6ECF0",
  text: "#0F172A",
  textMuted: "#64748B",
} as const;

export const light = {
  bg: "#F8F9FB",
  bgElevated: "#FFFFFF",
  bgMuted: "#EEF2F5",
  bgSoft: "#F1F5F9",
  text: "#0F172A",
  textMuted: "#64748B",
  textSubtle: "#94A3B8",
  border: "#E6ECF0",
  borderStrong: "#D7E0E4",
  sidebar: "#0B1F24",
  sidebarText: "#E6F4F3",
  shadow: "0 10px 30px rgba(15, 23, 42, 0.08)",
  overlay: "rgba(15, 23, 42, 0.45)",
} as const;

export const dark = {
  bg: "#071316",
  bgElevated: "#0E1C20",
  bgMuted: "#13262B",
  bgSoft: "#0A181C",
  text: "#E8F2F2",
  textMuted: "#94A8AE",
  textSubtle: "#6B8086",
  border: "#1F3338",
  borderStrong: "#2A4248",
  sidebar: "#050D10",
  sidebarText: "#D7EDEB",
  shadow: "0 12px 32px rgba(0, 0, 0, 0.35)",
  overlay: "rgba(0, 0, 0, 0.55)",
} as const;

export const typography = {
  fontFamily:
    '"DM Sans", "Segoe UI", Roboto, "Helvetica Neue", Helvetica, Arial, sans-serif',
  sizes: {
    xs: 11,
    sm: 13,
    md: 15,
    lg: 17,
    xl: 20,
    xxl: 24,
    display: 32,
  },
  weights: {
    regular: "400" as const,
    medium: "500" as const,
    semibold: "600" as const,
    bold: "700" as const,
  },
  lineHeights: {
    tight: 1.2,
    normal: 1.4,
    relaxed: 1.55,
  },
} as const;

export const spacing = {
  xxs: 2,
  xs: 4,
  sm: 8,
  md: 16,
  lg: 24,
  xl: 32,
  xxl: 48,
  xxxl: 64,
} as const;

export const radii = {
  xs: 6,
  sm: 8,
  md: 12,
  lg: 16,
  xl: 20,
  xxl: 24,
  full: 999,
} as const;

export const opacity = {
  disabled: 0.4,
  pressed: 0.72,
  muted: 0.64,
  overlay: 0.45,
  soft: 0.12,
} as const;

export const motion = {
  duration: {
    instant: 100,
    fast: 160,
    normal: 240,
    slow: 360,
    shimmer: 900,
  },
  spring: {
    snappy: { damping: 20, stiffness: 280, mass: 0.7 },
    soft: { damping: 18, stiffness: 180, mass: 0.9 },
    bouncy: { damping: 14, stiffness: 220, mass: 0.75 },
  },
} as const;

export const iconSize = {
  xs: 14,
  sm: 18,
  md: 22,
  lg: 28,
  xl: 36,
} as const;

export const theme = {
  colors,
  light,
  dark,
  typography,
  spacing,
  radii,
  opacity,
  motion,
  iconSize,
} as const;

export type Theme = typeof theme;

export {
  MINIMAL_MAP_STYLE,
  MINIMAL_MAP_STYLE_DARK,
  MINIMAL_MAP_STYLE_LIGHT,
  mapStyleForTheme,
  type MapThemeMode,
} from "./mapStyle";
