import { useMemo, useState } from "react";
import {
  Modal,
  Platform,
  Pressable,
  StyleSheet,
  Text,
  View,
  type StyleProp,
  type ViewStyle,
} from "react-native";
import DateTimePicker, {
  type DateTimePickerEvent,
} from "@react-native-community/datetimepicker";
import { formatDisplayTime } from "@mytask/utils";
import { radii, spacing, typography } from "@mytask/theme";
import { useThemeStore } from "../store/themeStore";
import { touchTarget } from "../ui/tokens";
import { ChevronIcon } from "../ui/icons";
import { triggerHaptic } from "../utils/haptics";

const HH_MM_RE = /^(\d{1,2}):(\d{2})(?::\d{2})?$/;

/** Parse "HH:mm" / "HH:mm:ss" into a Date on today's calendar day. */
export function parseHhMm(value: string | null | undefined): Date | null {
  if (value == null) return null;
  const raw = String(value).trim();
  const m = raw.match(HH_MM_RE);
  if (!m) return null;
  const hours = Number(m[1]);
  const minutes = Number(m[2]);
  if (
    !Number.isFinite(hours) ||
    !Number.isFinite(minutes) ||
    hours < 0 ||
    hours > 23 ||
    minutes < 0 ||
    minutes > 59
  ) {
    return null;
  }
  const d = new Date();
  d.setHours(hours, minutes, 0, 0);
  return d;
}

/** Date → "HH:mm" (24h wire format for API). */
export function toHhMm(date: Date): string {
  const h = String(date.getHours()).padStart(2, "0");
  const m = String(date.getMinutes()).padStart(2, "0");
  return `${h}:${m}`;
}

export type TimeFieldProps = {
  label?: string;
  /** Wire value `HH:mm` or `HH:mm:ss` (or empty). */
  value?: string | null;
  onChange: (hhMm: string) => void;
  placeholder?: string;
  error?: string | null;
  hint?: string;
  disabled?: boolean;
  /** Allow clearing the value (e.g. open end time). */
  clearable?: boolean;
  /** Light-on-dark styling for colored sheet cards. */
  onColor?: boolean;
  containerStyle?: StyleProp<ViewStyle>;
};

/**
 * Native time picker showing 12-hour AM/PM in the UI while storing HH:mm.
 */
export function TimeField({
  label,
  value,
  onChange,
  placeholder = "Select time",
  error,
  hint,
  disabled = false,
  clearable = false,
  onColor = false,
  containerStyle,
}: TimeFieldProps) {
  const c = useThemeStore((s) => s.colors);
  const mode = useThemeStore((s) => s.mode);
  const [open, setOpen] = useState(false);
  const hasError = Boolean(error);

  const selected = useMemo(() => parseHhMm(value), [value]);
  const defaultTime = useMemo(() => {
    const d = new Date();
    d.setHours(9, 0, 0, 0);
    return d;
  }, []);
  const [draft, setDraft] = useState(selected ?? defaultTime);

  const display =
    selected && value?.trim() ? formatDisplayTime(value) : "";

  const labelColor = onColor ? "rgba(255,255,255,0.85)" : c.muted;
  const fieldBg = onColor ? "rgba(0,0,0,0.12)" : c.surface;
  const fieldBorder = hasError
    ? onColor
      ? "#fecaca"
      : c.negative
    : onColor
      ? "rgba(255,255,255,0.35)"
      : c.border;
  const valueColor = display
    ? onColor
      ? "#fff"
      : c.text
    : onColor
      ? "rgba(255,255,255,0.55)"
      : c.subtle;
  const metaColor = hasError
    ? onColor
      ? "#fecaca"
      : c.negative
    : onColor
      ? "rgba(255,255,255,0.8)"
      : c.muted;
  const clearColor = onColor ? "#fff" : c.primary;

  function openPicker() {
    if (disabled) return;
    setDraft(selected ?? defaultTime);
    void triggerHaptic("selection");
    setOpen(true);
  }

  function commit(date: Date) {
    onChange(toHhMm(date));
    void triggerHaptic("light");
    setOpen(false);
  }

  function clear() {
    onChange("");
    void triggerHaptic("light");
    setOpen(false);
  }

  function onAndroidChange(event: DateTimePickerEvent, date?: Date) {
    setOpen(false);
    if (event.type === "set" && date) {
      commit(date);
    }
  }

  function onIosChange(_event: DateTimePickerEvent, date?: Date) {
    if (date) setDraft(date);
  }

  return (
    <View style={[styles.wrap, containerStyle]}>
      {label ? (
        <Text style={[styles.label, { color: labelColor }]}>{label}</Text>
      ) : null}
      <Pressable
        onPress={openPicker}
        disabled={disabled}
        accessibilityRole="button"
        accessibilityLabel={label || "Time"}
        accessibilityHint={
          hasError && error ? `Error: ${error}` : "Opens time picker"
        }
        accessibilityState={{ disabled }}
        style={({ pressed }) => [
          styles.field,
          {
            backgroundColor: fieldBg,
            borderColor: fieldBorder,
            opacity: disabled ? 0.55 : pressed ? 0.85 : 1,
          },
        ]}
      >
        <Text
          style={[styles.value, { color: valueColor }]}
          numberOfLines={1}
        >
          {display || placeholder}
        </Text>
        <ChevronIcon color={onColor ? "rgba(255,255,255,0.85)" : c.muted} size={16} />
      </Pressable>
      {hasError ? (
        <Text
          style={[styles.meta, { color: metaColor }]}
          accessibilityRole="alert"
          accessibilityLiveRegion="polite"
        >
          {error}
        </Text>
      ) : hint ? (
        <Text style={[styles.meta, { color: metaColor }]}>{hint}</Text>
      ) : clearable && display ? (
        <Pressable
          onPress={clear}
          disabled={disabled}
          hitSlop={8}
          accessibilityRole="button"
          accessibilityLabel={`Clear ${label || "time"}`}
        >
          <Text style={[styles.meta, { color: clearColor }]}>Clear</Text>
        </Pressable>
      ) : null}

      {Platform.OS === "android" && open ? (
        <DateTimePicker
          value={draft}
          mode="time"
          display="default"
          is24Hour={false}
          onChange={onAndroidChange}
        />
      ) : null}

      {Platform.OS === "ios" ? (
        <Modal
          visible={open}
          transparent
          animationType="slide"
          onRequestClose={() => setOpen(false)}
        >
          <Pressable
            style={[styles.backdrop, { backgroundColor: c.overlay }]}
            onPress={() => setOpen(false)}
            accessibilityLabel="Dismiss time picker"
          />
          <View
            style={[
              styles.sheet,
              { backgroundColor: c.surface, borderColor: c.border },
            ]}
          >
            <View style={styles.toolbar}>
              <Pressable
                onPress={() => setOpen(false)}
                hitSlop={8}
                accessibilityRole="button"
                accessibilityLabel="Cancel"
              >
                <Text style={[styles.toolbarBtn, { color: c.muted }]}>
                  Cancel
                </Text>
              </Pressable>
              <Text style={[styles.toolbarTitle, { color: c.text }]}>
                {label || "Time"}
              </Text>
              <Pressable
                onPress={() => commit(draft)}
                hitSlop={8}
                accessibilityRole="button"
                accessibilityLabel="Done"
              >
                <Text
                  style={[
                    styles.toolbarBtn,
                    styles.toolbarDone,
                    { color: c.primary },
                  ]}
                >
                  Done
                </Text>
              </Pressable>
            </View>
            {clearable ? (
              <Pressable
                onPress={clear}
                style={styles.clearRow}
                accessibilityRole="button"
                accessibilityLabel="Clear time"
              >
                <Text style={[styles.clearText, { color: c.primary }]}>
                  Clear time
                </Text>
              </Pressable>
            ) : null}
            <DateTimePicker
              value={draft}
              mode="time"
              display="spinner"
              is24Hour={false}
              locale="en_US"
              onChange={onIosChange}
              themeVariant={mode}
              style={styles.iosPicker}
            />
          </View>
        </Modal>
      ) : null}
    </View>
  );
}

const styles = StyleSheet.create({
  wrap: { flex: 1, marginBottom: spacing.md },
  label: {
    fontSize: typography.sizes.xs,
    fontWeight: "700",
    letterSpacing: 0.4,
    textTransform: "uppercase",
    marginBottom: 8,
  },
  field: {
    minHeight: touchTarget.comfortable,
    borderRadius: radii.lg,
    borderWidth: StyleSheet.hairlineWidth,
    paddingHorizontal: spacing.md,
    flexDirection: "row",
    alignItems: "center",
    gap: spacing.sm,
  },
  value: {
    flex: 1,
    fontSize: typography.sizes.md,
    paddingVertical: 12,
  },
  meta: {
    marginTop: 6,
    fontSize: typography.sizes.xs,
    fontWeight: "500",
  },
  backdrop: {
    flex: 1,
  },
  sheet: {
    borderTopLeftRadius: radii.xxl,
    borderTopRightRadius: radii.xxl,
    borderTopWidth: StyleSheet.hairlineWidth,
    paddingBottom: spacing.lg,
  },
  toolbar: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    paddingHorizontal: spacing.lg,
    paddingVertical: spacing.md,
  },
  toolbarBtn: {
    fontSize: typography.sizes.md,
    fontWeight: "600",
    minWidth: 64,
  },
  toolbarDone: {
    textAlign: "right",
  },
  toolbarTitle: {
    fontSize: typography.sizes.sm,
    fontWeight: "700",
  },
  clearRow: {
    alignItems: "center",
    paddingBottom: spacing.sm,
  },
  clearText: {
    fontSize: typography.sizes.sm,
    fontWeight: "600",
  },
  iosPicker: {
    alignSelf: "stretch",
  },
});
