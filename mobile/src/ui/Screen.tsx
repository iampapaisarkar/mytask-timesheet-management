import type { ReactNode } from "react";
import {
  StyleSheet,
  View,
  type StyleProp,
  type ViewStyle,
} from "react-native";
import { KeyboardAwareScrollView } from "react-native-keyboard-controller";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { spacing } from "@mytask/theme";
import { useThemeStore } from "../store/themeStore";

type Edges = {
  top?: boolean;
  bottom?: boolean;
  left?: boolean;
  right?: boolean;
};

/**
 * Safe-area aware screen shell. Prefer this when a screen has no native stack
 * header, or when content must clear the home indicator.
 */
export function Screen({
  children,
  scroll = false,
  edges = { top: false, bottom: true, left: true, right: true },
  style,
  contentStyle,
  padded = true,
  keyboard = false,
}: {
  children: ReactNode;
  scroll?: boolean;
  edges?: Edges;
  style?: StyleProp<ViewStyle>;
  contentStyle?: StyleProp<ViewStyle>;
  padded?: boolean;
  /** Use keyboard-aware scrolling so focused inputs stay visible. */
  keyboard?: boolean;
}) {
  const c = useThemeStore((s) => s.colors);
  const insets = useSafeAreaInsets();

  const padStyle: ViewStyle = {
    paddingTop: edges.top ? insets.top : 0,
    paddingBottom: edges.bottom ? Math.max(insets.bottom, spacing.sm) : 0,
    paddingLeft: edges.left ? Math.max(insets.left, padded ? spacing.lg : 0) : 0,
    paddingRight: edges.right
      ? Math.max(insets.right, padded ? spacing.lg : 0)
      : 0,
  };

  if (scroll || keyboard) {
    return (
      <KeyboardAwareScrollView
        style={[{ flex: 1, backgroundColor: c.bg }, style]}
        contentContainerStyle={[
          padStyle,
          padded && styles.scrollPad,
          contentStyle,
        ]}
        keyboardShouldPersistTaps="handled"
        keyboardDismissMode="interactive"
        showsVerticalScrollIndicator={false}
        showsHorizontalScrollIndicator={false}
        bottomOffset={24}
        extraKeyboardSpace={16}
        enabled={keyboard || scroll}
      >
        {children}
      </KeyboardAwareScrollView>
    );
  }

  return (
    <View style={[{ flex: 1, backgroundColor: c.bg }, padStyle, style]}>
      <View style={[{ flex: 1 }, contentStyle]}>{children}</View>
    </View>
  );
}

const styles = StyleSheet.create({
  scrollPad: { paddingBottom: spacing.xxl },
});
