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
import { radii, spacing, typography } from "@mytask/theme";
import { useThemeStore } from "../store/themeStore";
import { touchTarget } from "../ui/tokens";
import { ChevronIcon } from "../ui/icons";
import { triggerHaptic } from "../utils/haptics";

const ISO_DATE_RE = /^\d{4}-\d{2}-\d{2}$/;

export function yearsAgo(years: number, from = new Date()): Date {
  const d = new Date(from.getFullYear(), from.getMonth(), from.getDate());
  d.setFullYear(d.getFullYear() - years);
  return d;
}

export function toIsoDate(date: Date): string {
  const y = date.getFullYear();
  const m = String(date.getMonth() + 1).padStart(2, "0");
  const day = String(date.getDate()).padStart(2, "0");
  return `${y}-${m}-${day}`;
}

export function parseIsoDate(value: string | null | undefined): Date | null {
  if (value == null) return null;
  const raw = String(value).trim();
  if (!ISO_DATE_RE.test(raw)) return null;
  const [y, m, d] = raw.split("-").map(Number);
  const date = new Date(y, m - 1, d);
  if (
    Number.isNaN(date.getTime()) ||
    date.getFullYear() !== y ||
    date.getMonth() !== m - 1 ||
    date.getDate() !== d
  ) {
    return null;
  }
  return date;
}

export function formatDisplayDate(value: string | null | undefined): string {
  const date = parseIsoDate(value);
  if (!date) return value?.trim() || "";
  return date.toLocaleDateString(undefined, {
    year: "numeric",
    month: "short",
    day: "numeric",
  });
}

export type DateFieldProps = {
  label?: string;
  value?: string | null;
  onChange: (isoDate: string) => void;
  placeholder?: string;
  error?: string | null;
  hint?: string;
  disabled?: boolean;
  /**
   * Adult DOB: picker opens on the date 18 years ago and blocks any
   * later date (only ages 18+ from today).
   */
  adultDob?: boolean;
  minimumDate?: Date;
  maximumDate?: Date;
  containerStyle?: StyleProp<ViewStyle>;
};

export function DateField({
  label,
  value,
  onChange,
  placeholder = "Select date",
  error,
  hint,
  disabled = false,
  adultDob = false,
  minimumDate: minimumDateProp,
  maximumDate: maximumDateProp,
  containerStyle,
}: DateFieldProps) {
  const c = useThemeStore((s) => s.colors);
  const mode = useThemeStore((s) => s.mode);
  const [open, setOpen] = useState(false);
  const hasError = Boolean(error);

  const adultMax = useMemo(() => yearsAgo(18), []);
  const defaultMin = useMemo(() => yearsAgo(120), []);

  const maximumDate = adultDob
    ? (maximumDateProp ?? adultMax)
    : maximumDateProp;
  const minimumDate = minimumDateProp ?? (adultDob ? defaultMin : undefined);

  const selected = parseIsoDate(value);
  const pickerValue = selected ?? maximumDate ?? adultMax ?? new Date();

  const [draft, setDraft] = useState(pickerValue);

  const display = selected ? formatDisplayDate(value) : "";

  function openPicker() {
    if (disabled) return;
    setDraft(selected ?? maximumDate ?? adultMax ?? new Date());
    void triggerHaptic("selection");
    setOpen(true);
  }

  function commit(date: Date) {
    onChange(toIsoDate(date));
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
        <Text style={[styles.label, { color: c.muted }]}>{label}</Text>
      ) : null}
      <Pressable
        onPress={openPicker}
        disabled={disabled}
        accessibilityRole="button"
        accessibilityLabel={label || "Date"}
        accessibilityHint={
          hasError && error ? `Error: ${error}` : "Opens date picker"
        }
        accessibilityState={{ disabled }}
        style={({ pressed }) => [
          styles.field,
          {
            backgroundColor: c.surface,
            borderColor: hasError ? c.negative : c.border,
            opacity: disabled ? 0.55 : pressed ? 0.85 : 1,
          },
        ]}
      >
        <Text
          style={[
            styles.value,
            { color: display ? c.text : c.subtle },
          ]}
          numberOfLines={1}
        >
          {display || placeholder}
        </Text>
        <ChevronIcon color={c.muted} size={16} />
      </Pressable>
      {hasError ? (
        <Text
          style={[styles.meta, { color: c.negative }]}
          accessibilityRole="alert"
          accessibilityLiveRegion="polite"
        >
          {error}
        </Text>
      ) : hint ? (
        <Text style={[styles.meta, { color: c.muted }]}>{hint}</Text>
      ) : null}

      {Platform.OS === "android" && open ? (
        <DateTimePicker
          value={draft}
          mode="date"
          display="default"
          onChange={onAndroidChange}
          maximumDate={maximumDate}
          minimumDate={minimumDate}
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
            accessibilityLabel="Dismiss date picker"
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
                {label || "Date"}
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
            <DateTimePicker
              value={draft}
              mode="date"
              display="spinner"
              onChange={onIosChange}
              maximumDate={maximumDate}
              minimumDate={minimumDate}
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
  wrap: { marginBottom: spacing.md },
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
  iosPicker: {
    alignSelf: "stretch",
  },
});
