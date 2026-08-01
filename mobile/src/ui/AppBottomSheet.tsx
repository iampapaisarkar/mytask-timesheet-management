import {
  forwardRef,
  useCallback,
  useMemo,
  type ReactNode,
} from "react";
import { Pressable, StyleSheet, Text, View } from "react-native";
import {
  BottomSheetBackdrop,
  BottomSheetFooter,
  BottomSheetModal,
  BottomSheetScrollView,
  BottomSheetTextInput,
  BottomSheetView,
  useBottomSheetModal,
  type BottomSheetBackdropProps,
  type BottomSheetFooterProps,
  type BottomSheetModalProps,
} from "@gorhom/bottom-sheet";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { radii, spacing } from "@mytask/theme";
import { useThemeStore } from "../store/themeStore";
import { elevation } from "./tokens";
import { CloseIcon } from "./icons";

export { BottomSheetTextInput };

function SheetCloseButton({ color }: { color: string }) {
  const { dismiss } = useBottomSheetModal();
  return (
    <Pressable
      onPress={() => dismiss()}
      hitSlop={12}
      accessibilityRole="button"
      accessibilityLabel="Close"
      style={styles.closeBtn}
    >
      <CloseIcon color={color} />
    </Pressable>
  );
}

export type AppBottomSheetProps = {
  title?: string;
  children: ReactNode;
  snapPoints?: (string | number)[];
  footer?: ReactNode;
  scrollable?: boolean;
  onDismiss?: () => void;
  enablePanDownToClose?: boolean;
  stackBehavior?: BottomSheetModalProps["stackBehavior"];
};

/**
 * Form / filter sheet with keyboard-aware footer via BottomSheetFooter.
 * Save actions stay visible above the home indicator and keyboard.
 */
export const AppBottomSheet = forwardRef<
  BottomSheetModal,
  AppBottomSheetProps
>(function AppBottomSheet(
  {
    title,
    children,
    snapPoints: snapPointsProp,
    footer,
    scrollable = true,
    onDismiss,
    enablePanDownToClose = true,
    stackBehavior = "push",
  },
  ref,
) {
  const c = useThemeStore((s) => s.colors);
  const insets = useSafeAreaInsets();
  const snapPoints = useMemo(
    () => snapPointsProp ?? ["55%", "92%"],
    [snapPointsProp],
  );

  const renderBackdrop = useCallback(
    (props: BottomSheetBackdropProps) => (
      <BottomSheetBackdrop
        {...props}
        appearsOnIndex={0}
        disappearsOnIndex={-1}
        opacity={0.45}
        pressBehavior="close"
      />
    ),
    [],
  );

  const renderFooter = useCallback(
    (props: BottomSheetFooterProps) => {
      if (!footer) return null;
      return (
        <BottomSheetFooter {...props} bottomInset={0}>
          <View
            style={[
              styles.footer,
              {
                borderTopColor: c.border,
                backgroundColor: c.surface,
                paddingBottom: Math.max(insets.bottom, spacing.sm),
              },
            ]}
          >
            {footer}
          </View>
        </BottomSheetFooter>
      );
    },
    [c.border, c.surface, footer, insets.bottom],
  );

  const Body = scrollable ? BottomSheetScrollView : BottomSheetView;
  const footerPad = footer ? 88 + Math.max(insets.bottom - spacing.sm, 0) : Math.max(insets.bottom, spacing.md);

  return (
    <BottomSheetModal
      ref={ref}
      snapPoints={snapPoints}
      enablePanDownToClose={enablePanDownToClose}
      onDismiss={onDismiss}
      stackBehavior={stackBehavior}
      backdropComponent={renderBackdrop}
      footerComponent={footer ? renderFooter : undefined}
      handleIndicatorStyle={{ backgroundColor: c.border, width: 40 }}
      backgroundStyle={[
        styles.sheetBg,
        { backgroundColor: c.surface },
        elevation.sheet,
      ]}
      keyboardBehavior="interactive"
      keyboardBlurBehavior="restore"
      android_keyboardInputMode="adjustResize"
      topInset={insets.top}
      enableDynamicSizing={false}
    >
      <View style={[styles.header, { borderBottomColor: c.border }]}>
        <Text style={[styles.title, { color: c.text }]} numberOfLines={1}>
          {title || ""}
        </Text>
        <SheetCloseButton color={c.muted} />
      </View>
      <Body
        style={styles.body}
        contentContainerStyle={[
          styles.bodyContent,
          { paddingBottom: footerPad },
        ]}
        keyboardShouldPersistTaps="handled"
        showsVerticalScrollIndicator={false}
        showsHorizontalScrollIndicator={false}
      >
        {children}
      </Body>
    </BottomSheetModal>
  );
});

const styles = StyleSheet.create({
  sheetBg: {
    borderTopLeftRadius: radii.xl,
    borderTopRightRadius: radii.xl,
  },
  header: {
    flexDirection: "row",
    alignItems: "center",
    paddingHorizontal: spacing.lg,
    paddingBottom: spacing.sm,
    borderBottomWidth: StyleSheet.hairlineWidth,
  },
  title: { flex: 1, fontSize: 17, fontWeight: "700" },
  closeBtn: {
    width: 40,
    height: 40,
    alignItems: "center",
    justifyContent: "center",
  },
  body: { flex: 1 },
  bodyContent: {
    paddingHorizontal: spacing.lg,
    paddingTop: spacing.md,
  },
  footer: {
    borderTopWidth: StyleSheet.hairlineWidth,
    paddingHorizontal: spacing.lg,
    paddingTop: spacing.sm,
  },
});
