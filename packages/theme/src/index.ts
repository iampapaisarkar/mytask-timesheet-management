/** myTask design tokens — primary #04B6B1 */
export const colors = {
  primary: "#04B6B1",
  primaryHover: "#039E9A",
  primaryMuted: "rgba(4, 182, 177, 0.12)",
  secondary: "#0F766E",
  accent: "#14B8A6",
  positive: "#10B981",
  negative: "#EF4444",
  info: "#3B82F6",
  warning: "#F59E0B",
  white: "#FFFFFF",
  black: "#0B1220",
  /** Light-mode defaults for React Native StyleSheet usage */
  background: "#F4F7F8",
  surface: "#FFFFFF",
  border: "#D7E0E4",
  text: "#0F172A",
  textMuted: "#64748B",
} as const;

export const light = {
  bg: "#F4F7F8",
  bgElevated: "#FFFFFF",
  bgMuted: "#E8EEF0",
  text: "#0F172A",
  textMuted: "#64748B",
  border: "#D7E0E4",
  sidebar: "#0B1F24",
  sidebarText: "#E6F4F3",
  shadow: "0 10px 30px rgba(15, 23, 42, 0.08)",
} as const;

export const dark = {
  bg: "#071316",
  bgElevated: "#0E1C20",
  bgMuted: "#13262B",
  text: "#E8F2F2",
  textMuted: "#94A8AE",
  border: "#1F3338",
  sidebar: "#050D10",
  sidebarText: "#D7EDEB",
  shadow: "0 12px 32px rgba(0, 0, 0, 0.35)",
} as const;

export const typography = {
  fontFamily:
    '"DM Sans", "Segoe UI", Roboto, "Helvetica Neue", Helvetica, Arial, sans-serif',
  sizes: {
    xs: 12,
    sm: 14,
    md: 16,
    lg: 20,
    xl: 24,
    display: 32,
  },
} as const;

export const spacing = {
  xs: 4,
  sm: 8,
  md: 16,
  lg: 24,
  xl: 32,
  xxl: 48,
} as const;

export const radii = {
  sm: 8,
  md: 12,
  lg: 16,
  xl: 24,
  full: 999,
} as const;

export const theme = {
  colors,
  light,
  dark,
  typography,
  spacing,
  radii,
} as const;

export type Theme = typeof theme;
