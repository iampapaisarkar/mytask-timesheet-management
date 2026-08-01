import type { NativeStackNavigationOptions } from "@react-navigation/native-stack";
import { Platform } from "react-native";

export const orgStackAnimation = Platform.select<
  "default" | "slide_from_right" | "fade_from_bottom"
>({
  ios: "default",
  android: "slide_from_right",
  default: "default",
});

/** Chevron-only native back — no previous-screen label. */
export const nativeBackScreenOptions: Pick<
  NativeStackNavigationOptions,
  "headerBackTitle" | "headerBackButtonDisplayMode"
> = {
  headerBackTitle: "",
  headerBackButtonDisplayMode: "minimal",
};

/**
 * Shared options for org-level standalone screens (no OrgHeader / no tabs).
 * Native stack back (chevron only) + swipe-back.
 */
export function standaloneScreenOptions(
  title: string,
): NativeStackNavigationOptions {
  return {
    headerShown: true,
    title,
    ...nativeBackScreenOptions,
    gestureEnabled: true,
    fullScreenGestureEnabled: true,
    animation: orgStackAnimation,
    animationDuration: Platform.OS === "ios" ? undefined : 260,
  };
}
