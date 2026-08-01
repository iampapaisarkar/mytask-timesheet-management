import { Platform, StyleSheet } from "react-native";
import {
  iconSize,
  motion,
  opacity,
  radii,
  spacing,
  typography,
} from "@mytask/theme";

/** Shared elevation used across cards and chrome. */
export const elevation = {
  none: Platform.select({
    ios: {
      shadowColor: "transparent",
      shadowOffset: { width: 0, height: 0 },
      shadowOpacity: 0,
      shadowRadius: 0,
    },
    android: { elevation: 0 },
    default: {},
  }),
  soft: Platform.select({
    ios: {
      shadowColor: "#0F172A",
      shadowOffset: { width: 0, height: 2 },
      shadowOpacity: 0.04,
      shadowRadius: 8,
    },
    android: { elevation: 1 },
    default: {},
  }),
  card: Platform.select({
    ios: {
      shadowColor: "#0F172A",
      shadowOffset: { width: 0, height: 4 },
      shadowOpacity: 0.06,
      shadowRadius: 12,
    },
    android: { elevation: 2 },
    default: {},
  }),
  raised: Platform.select({
    ios: {
      shadowColor: "#0F172A",
      shadowOffset: { width: 0, height: 8 },
      shadowOpacity: 0.1,
      shadowRadius: 20,
    },
    android: { elevation: 6 },
    default: {},
  }),
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
  fab: Platform.select({
    ios: {
      shadowColor: "#04B6B1",
      shadowOffset: { width: 0, height: 6 },
      shadowOpacity: 0.35,
      shadowRadius: 14,
    },
    android: { elevation: 8 },
    default: {},
  }),
} as const;

export const touchTarget = {
  min: 44,
  comfortable: 48,
} as const;

export { opacity, motion, iconSize };

export const ui = {
  spacing,
  radii,
  typography,
  elevation,
  touchTarget,
  opacity,
  motion,
  iconSize,
  hairline: StyleSheet.hairlineWidth,
} as const;
