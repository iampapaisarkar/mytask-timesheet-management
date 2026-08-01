import type { ReactNode, RefObject } from "react";
import { StyleSheet, type StyleProp, type ViewStyle } from "react-native";
import {
  KeyboardAwareScrollView,
  type KeyboardAwareScrollViewRef,
} from "react-native-keyboard-controller";
import { spacing } from "@mytask/theme";
import { useThemeStore } from "../store/themeStore";

/**
 * Keyboard-safe scrollable form shell for full-screen (non-sheet) forms.
 * Focused inputs automatically scroll above the keyboard.
 */
export function FormKeyboardScroll({
  children,
  contentContainerStyle,
  style,
  scrollRef,
  bottomOffset = 24,
}: {
  children: ReactNode;
  contentContainerStyle?: StyleProp<ViewStyle>;
  style?: StyleProp<ViewStyle>;
  scrollRef?: RefObject<KeyboardAwareScrollViewRef | null>;
  /** Extra space between focused input and keyboard (e.g. sticky footer). */
  bottomOffset?: number;
}) {
  const c = useThemeStore((s) => s.colors);

  return (
    <KeyboardAwareScrollView
      ref={scrollRef}
      style={[{ flex: 1, backgroundColor: c.bg }, style]}
      contentContainerStyle={[styles.content, contentContainerStyle]}
      keyboardShouldPersistTaps="handled"
      keyboardDismissMode="interactive"
      showsVerticalScrollIndicator={false}
      showsHorizontalScrollIndicator={false}
      bottomOffset={bottomOffset}
      extraKeyboardSpace={16}
      bounces
    >
      {children}
    </KeyboardAwareScrollView>
  );
}

const styles = StyleSheet.create({
  content: {
    padding: spacing.lg,
    paddingBottom: spacing.xxl + 24,
    flexGrow: 1,
  },
});
