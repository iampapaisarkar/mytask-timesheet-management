/** Colour tokens recovered from Quasar build (`--q-primary`, etc.). */
export const colors = {
  primary: "#6900ff",
  secondary: "#26a69a",
  accent: "#9c27b0",
  positive: "#21ba45",
  negative: "#c10015",
  info: "#31ccec",
  warning: "#f2c037",
  dark: "#1d272d",
  darkPage: "#1d272d",
  white: "#ffffff",
  grey: "#9e9e9e",
  greyDark: "#757575",
  border: "#e0e0e0",
  background: "#f5f5f5",
} as const;

export const typography = {
  fontFamily:
    'Roboto, "Helvetica Neue", Helvetica, Arial, sans-serif',
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
} as const;

export const radii = {
  sm: 4,
  md: 8,
  lg: 12,
} as const;

export const theme = { colors, typography, spacing, radii } as const;
export type Theme = typeof theme;
