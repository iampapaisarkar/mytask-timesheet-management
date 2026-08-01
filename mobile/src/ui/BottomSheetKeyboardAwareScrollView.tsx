import { memo } from "react";
import {
  KeyboardAwareScrollView,
  type KeyboardAwareScrollViewProps,
} from "react-native-keyboard-controller";
import {
  SCROLLABLE_TYPE,
  createBottomSheetScrollableComponent,
  type BottomSheetScrollViewMethods,
} from "@gorhom/bottom-sheet";
import Reanimated from "react-native-reanimated";

const AnimatedScrollView =
  Reanimated.createAnimatedComponent(KeyboardAwareScrollView);

type SheetScrollProps = KeyboardAwareScrollViewProps & Record<string, unknown>;

const BottomSheetScrollViewComponent = createBottomSheetScrollableComponent<
  BottomSheetScrollViewMethods,
  SheetScrollProps
>(SCROLLABLE_TYPE.SCROLLVIEW, AnimatedScrollView);

/**
 * Bottom-sheet scroll view that scrolls the focused input above the keyboard.
 * Official integration pattern from react-native-keyboard-controller docs.
 */
export const BottomSheetKeyboardAwareScrollView = memo(
  BottomSheetScrollViewComponent,
);
BottomSheetKeyboardAwareScrollView.displayName =
  "BottomSheetKeyboardAwareScrollView";
