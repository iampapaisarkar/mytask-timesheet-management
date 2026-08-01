import { useBottomTabBarHeight } from "@react-navigation/bottom-tabs";
import { useSafeAreaInsets } from "react-native-safe-area-context";

/** Floating pill height (excl. safe-area / shell padding). */
export const ORG_TAB_BAR_PILL_HEIGHT = 72;

/**
 * Bottom padding so org tab screens can scroll clear of the floating tab bar.
 */
export function useOrgTabBarScrollInset(extra = 16): number {
  const reported = useBottomTabBarHeight();
  const insets = useSafeAreaInsets();
  if (reported > 0) return reported + extra;
  return ORG_TAB_BAR_PILL_HEIGHT + Math.max(insets.bottom, 10) + extra;
}
