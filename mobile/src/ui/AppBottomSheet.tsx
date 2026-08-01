import {
  forwardRef,
  useCallback,
  useMemo,
  type ReactNode,
} from "react";
import { Pressable, StyleSheet, Text, View } from "react-native";
import {
  BottomSheetBackdrop,
  BottomSheetModal,
  BottomSheetScrollView,
  BottomSheetTextInput,
  BottomSheetView,
  useBottomSheetModal,
  type BottomSheetBackdropProps,
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
 * Standard form / filter sheet. Present via ref.present() / ref.dismiss().
 * Prefer this over RN Modal for create/edit/filter flows.
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
    () => snapPointsProp ?? ["50%", "92%"],
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

  const Body = scrollable ? BottomSheetScrollView : BottomSheetView;

  return (
    <BottomSheetModal
      ref={ref}
      snapPoints={snapPoints}
      enablePanDownToClose={enablePanDownToClose}
      onDismiss={onDismiss}
      stackBehavior={stackBehavior}
      backdropComponent={renderBackdrop}
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
          { paddingBottom: Math.max(insets.bottom, spacing.md) + (footer ? 72 : 0) },
        ]}
        keyboardShouldPersistTaps="handled"
      >
        {children}
      </Body>
      {footer ? (
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
      ) : null}
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
    position: "absolute",
    left: 0,
    right: 0,
    bottom: 0,
    borderTopWidth: StyleSheet.hairlineWidth,
    paddingHorizontal: spacing.lg,
    paddingTop: spacing.sm,
  },
});
