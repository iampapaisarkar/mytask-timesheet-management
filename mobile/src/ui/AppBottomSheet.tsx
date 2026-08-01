import { forwardRef, useCallback, useMemo, useRef, type ReactNode } from "react";
import { Pressable, StyleSheet, Text, View } from "react-native";
import {
  BottomSheetBackdrop,
  BottomSheetFooter,
  BottomSheetModal,
  BottomSheetScrollView,
  BottomSheetTextInput,
  useBottomSheetModal,
  type BottomSheetBackdropProps,
  type BottomSheetFooterProps,
  type BottomSheetModalProps,
} from "@gorhom/bottom-sheet";
import { useKeyboardController } from "react-native-keyboard-controller";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { radii, spacing } from "@mytask/theme";
import { useThemeStore } from "../store/themeStore";
import { elevation } from "./tokens";
import { CloseIcon } from "./icons";

/** Use this (or TextField inputType="bottomSheet") for every field in a sheet. */
export { BottomSheetTextInput };

/** Nested sheets (e.g. MobileSelect) must not re-enable KeyboardProvider early. */
let openSheetCount = 0;

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
  /** Sticky Save/Create above the keypad. */
  footer?: ReactNode;
  /** @deprecated Always scrolls; kept for call-site compatibility. */
  scrollable?: boolean;
  onDismiss?: () => void;
  enablePanDownToClose?: boolean;
  stackBehavior?: BottomSheetModalProps["stackBehavior"];
};

/**
 * Grubly keyboard pattern for form sheets:
 * interactive + BottomSheetScrollView + BottomSheetTextInput + footer.
 * Disables KeyboardProvider while open so gorhom receives real keyboard events.
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
    onDismiss,
    enablePanDownToClose = true,
    stackBehavior = "push",
  },
  ref,
) {
  const c = useThemeStore((s) => s.colors);
  const insets = useSafeAreaInsets();
  const { setEnabled: setKeyboardControllerEnabled } = useKeyboardController();
  const isOpenRef = useRef(false);

  const snapPoints = useMemo(
    () => snapPointsProp ?? ["75%", "92%"],
    [snapPointsProp],
  );
  const initialIndex = Math.max(0, snapPoints.length - 1);

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

  const setSheetOpen = useCallback(
    (open: boolean) => {
      if (open === isOpenRef.current) return;
      isOpenRef.current = open;
      if (open) {
        openSheetCount += 1;
        setKeyboardControllerEnabled(false);
      } else {
        openSheetCount = Math.max(0, openSheetCount - 1);
        if (openSheetCount === 0) {
          setKeyboardControllerEnabled(true);
        }
      }
    },
    [setKeyboardControllerEnabled],
  );

  const handleChange = useCallback(
    (index: number) => {
      setSheetOpen(index >= 0);
    },
    [setSheetOpen],
  );

  const handleDismiss = useCallback(() => {
    setSheetOpen(false);
    onDismiss?.();
  }, [onDismiss, setSheetOpen]);

  return (
    <BottomSheetModal
      ref={ref}
      snapPoints={snapPoints}
      index={initialIndex}
      enablePanDownToClose={enablePanDownToClose}
      onDismiss={handleDismiss}
      onChange={handleChange}
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
      enableContentPanningGesture
      enableHandlePanningGesture
    >
      <BottomSheetScrollView
        enableFooterMarginAdjustment={Boolean(footer)}
        contentContainerStyle={[
          styles.bodyContent,
          {
            paddingBottom:
              (footer
                ? 72 + Math.max(insets.bottom, spacing.sm)
                : Math.max(insets.bottom, spacing.sm)) + spacing.lg,
          },
        ]}
        keyboardShouldPersistTaps="handled"
        showsVerticalScrollIndicator
        showsHorizontalScrollIndicator={false}
        bounces
        nestedScrollEnabled
      >
        <View style={[styles.header, { borderBottomColor: c.border }]}>
          <Text style={[styles.title, { color: c.text }]} numberOfLines={1}>
            {title || ""}
          </Text>
          <SheetCloseButton color={c.muted} />
        </View>
        {children}
      </BottomSheetScrollView>
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
    paddingBottom: spacing.sm,
    marginBottom: spacing.sm,
    borderBottomWidth: StyleSheet.hairlineWidth,
  },
  title: { flex: 1, fontSize: 17, fontWeight: "700" },
  closeBtn: {
    width: 40,
    height: 40,
    alignItems: "center",
    justifyContent: "center",
  },
  bodyContent: {
    paddingHorizontal: spacing.lg,
    paddingTop: spacing.sm,
  },
  footer: {
    borderTopWidth: StyleSheet.hairlineWidth,
    paddingHorizontal: spacing.lg,
    paddingTop: spacing.sm,
  },
});
