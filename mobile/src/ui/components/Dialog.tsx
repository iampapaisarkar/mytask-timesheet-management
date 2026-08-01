import type { ReactNode } from "react";
import {
  Modal,
  Pressable,
  StyleSheet,
  Text,
  View,
} from "react-native";
import { radii, spacing, typography } from "@mytask/theme";
import { useThemeStore } from "../../store/themeStore";
import { elevation } from "../tokens";
import { Button } from "./Button";

type Props = {
  visible: boolean;
  title: string;
  message?: string;
  confirmLabel?: string;
  cancelLabel?: string;
  destructive?: boolean;
  loading?: boolean;
  onConfirm?: () => void;
  onCancel?: () => void;
  children?: ReactNode;
};

/**
 * Centered confirmation dialog with soft overlay.
 */
export function Dialog({
  visible,
  title,
  message,
  confirmLabel = "Confirm",
  cancelLabel = "Cancel",
  destructive = false,
  loading = false,
  onConfirm,
  onCancel,
  children,
}: Props) {
  const c = useThemeStore((s) => s.colors);

  return (
    <Modal
      visible={visible}
      transparent
      animationType="fade"
      onRequestClose={onCancel}
      statusBarTranslucent
    >
      <Pressable
        style={[styles.backdrop, { backgroundColor: c.overlay }]}
        onPress={onCancel}
        accessibilityLabel="Dismiss dialog"
      >
        <Pressable
          style={[
            styles.sheet,
            elevation.raised,
            { backgroundColor: c.surface },
          ]}
          onPress={(e) => e.stopPropagation()}
        >
          <Text style={[styles.title, { color: c.text }]}>{title}</Text>
          {message ? (
            <Text style={[styles.message, { color: c.muted }]}>{message}</Text>
          ) : null}
          {children}
          <View style={styles.actions}>
            <View style={styles.actionHalf}>
              <Button
                title={cancelLabel}
                variant="outline"
                onPress={onCancel}
                disabled={loading}
              />
            </View>
            <View style={styles.actionHalf}>
              <Button
                title={confirmLabel}
                variant={destructive ? "danger" : "primary"}
                onPress={onConfirm}
                loading={loading}
              />
            </View>
          </View>
        </Pressable>
      </Pressable>
    </Modal>
  );
}

const styles = StyleSheet.create({
  backdrop: {
    flex: 1,
    alignItems: "center",
    justifyContent: "center",
    padding: spacing.lg,
  },
  sheet: {
    width: "100%",
    maxWidth: 400,
    borderRadius: radii.xxl,
    padding: spacing.lg,
  },
  title: {
    fontSize: typography.sizes.xl,
    fontWeight: "700",
    letterSpacing: -0.3,
  },
  message: {
    marginTop: spacing.sm,
    fontSize: typography.sizes.sm,
    lineHeight: 20,
  },
  actions: {
    flexDirection: "row",
    gap: spacing.sm,
    marginTop: spacing.lg,
  },
  actionHalf: { flex: 1 },
});
