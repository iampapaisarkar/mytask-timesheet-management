import type { NativeStackNavigationOptions } from "@react-navigation/native-stack";
import { Platform } from "react-native";
import { StandaloneHeader } from "../components/StandaloneHeader";

export const orgStackAnimation = Platform.select<
  "default" | "slide_from_right" | "fade_from_bottom"
>({
  ios: "default",
  android: "slide_from_right",
  default: "default",
});

/**
 * Shared options for org-level standalone screens (no OrgHeader / no tabs).
 * Native swipe-back + hardware back remain enabled.
 */
export function standaloneScreenOptions(
  title: string,
): NativeStackNavigationOptions {
  return {
    headerShown: true,
    header: ({ navigation }) => (
      <StandaloneHeader
        title={title}
        onBack={() => {
          if (navigation.canGoBack()) navigation.goBack();
        }}
      />
    ),
    gestureEnabled: true,
    fullScreenGestureEnabled: true,
    animation: orgStackAnimation,
    animationDuration: Platform.OS === "ios" ? undefined : 260,
  };
}
