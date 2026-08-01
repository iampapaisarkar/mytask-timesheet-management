import { Platform, StyleSheet } from "react-native";
import { radii, spacing, typography } from "@mytask/theme";

/** Shared elevation used across cards and chrome. */
export const elevation = {
  tabBar: Platform.select({
    ios: {
      shadowColor: "#0F172A",
      shadowOffset: { width: 0, height: -4 },
      shadowOpacity: 0.06,
      shadowRadius: 12,
    },
    android: { elevation: 12 },
    default: {},
  }),
  sheet: Platform.select({
    ios: {
      shadowColor: "#0F172A",
      shadowOffset: { width: 0, height: -8 },
      shadowOpacity: 0.12,
      shadowRadius: 24,
    },
    android: { elevation: 16 },
    default: {},
  }),
  card: Platform.select({
    ios: {
      shadowColor: "#0F172A",
      shadowOffset: { width: 0, height: 4 },
      shadowOpacity: 0.06,
      shadowRadius: 10,
    },
    android: { elevation: 2 },
    default: {},
  }),
} as const;

export const touchTarget = {
  min: 44,
} as const;

export const ui = {
  spacing,
  radii,
  typography,
  elevation,
  touchTarget,
  hairline: StyleSheet.hairlineWidth,
} as const;
