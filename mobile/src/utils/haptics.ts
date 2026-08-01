import { Platform } from "react-native";

type HapticKind =
  | "light"
  | "medium"
  | "success"
  | "warning"
  | "error"
  | "selection";

/**
 * Subtle haptics for mobile interactions. No-ops gracefully when the native
 * module is unavailable (simulator / missing pod install).
 */
export async function triggerHaptic(kind: HapticKind = "light"): Promise<void> {
  try {
    const Haptic = require("react-native-haptic-feedback") as {
      trigger: (
        type: string,
        options?: { enableVibrateFallback?: boolean; ignoreAndroidSystemSettings?: boolean },
      ) => void;
    };
    const map: Record<HapticKind, string> = {
      light: Platform.OS === "ios" ? "impactLight" : "effectClick",
      medium: Platform.OS === "ios" ? "impactMedium" : "effectClick",
      success: Platform.OS === "ios" ? "notificationSuccess" : "effectTick",
      warning: Platform.OS === "ios" ? "notificationWarning" : "effectClick",
      error: Platform.OS === "ios" ? "notificationError" : "effectHeavyClick",
      selection: Platform.OS === "ios" ? "selection" : "effectClick",
    };
    Haptic.trigger(map[kind], {
      enableVibrateFallback: true,
      ignoreAndroidSystemSettings: false,
    });
  } catch {
    // Native module not linked yet — ignore.
  }
}
