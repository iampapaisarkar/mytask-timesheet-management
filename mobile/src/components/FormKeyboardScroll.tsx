import type { ReactNode, RefObject } from "react";
import {
  KeyboardAvoidingView,
  Platform,
  ScrollView,
  StyleSheet,
  type StyleProp,
  type ViewStyle,
} from "react-native";
import { spacing } from "@mytask/theme";
import { useThemeStore } from "../store/themeStore";

/**
 * Keyboard-safe scrollable form shell for full-screen (non-sheet) forms.
 * Keeps focused inputs and footer actions reachable when the keyboard opens.
 */
export function FormKeyboardScroll({
  children,
  contentContainerStyle,
  style,
  scrollRef,
}: {
  children: ReactNode;
  contentContainerStyle?: StyleProp<ViewStyle>;
  style?: StyleProp<ViewStyle>;
  scrollRef?: RefObject<ScrollView | null>;
}) {
  const c = useThemeStore((s) => s.colors);

  return (
    <KeyboardAvoidingView
      style={[{ flex: 1, backgroundColor: c.bg }, style]}
      behavior={Platform.OS === "ios" ? "padding" : undefined}
      keyboardVerticalOffset={Platform.OS === "ios" ? 88 : 0}
    >
      <ScrollView
        ref={scrollRef}
        style={{ flex: 1 }}
        contentContainerStyle={[styles.content, contentContainerStyle]}
        keyboardShouldPersistTaps="handled"
        keyboardDismissMode="interactive"
        showsVerticalScrollIndicator={false}
        showsHorizontalScrollIndicator={false}
        automaticallyAdjustKeyboardInsets={Platform.OS === "ios"}
      >
        {children}
      </ScrollView>
    </KeyboardAvoidingView>
  );
}

const styles = StyleSheet.create({
  content: {
    padding: spacing.lg,
    paddingBottom: spacing.xxl + 24,
    flexGrow: 1,
  },
});
