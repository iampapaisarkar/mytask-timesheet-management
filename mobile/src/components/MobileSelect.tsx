import { useCallback, useMemo, useRef, useState, type ReactNode } from "react";
import {
  Pressable,
  StyleSheet,
  Text,
  View,
  type StyleProp,
  type ViewStyle,
} from "react-native";
import type { BottomSheetModal } from "@gorhom/bottom-sheet";
import { spacing } from "@mytask/theme";
import { AppBottomSheet, BottomSheetTextInput } from "../ui/AppBottomSheet";
import { ChevronIcon } from "../ui/icons";
import { useThemeStore } from "../store/themeStore";
import { triggerHaptic } from "../utils/haptics";

export type MobileSelectOption<T extends string | number = string> = {
  value: T;
  label: string;
  hint?: string;
};

type BaseProps<T extends string | number> = {
  label: string;
  options: MobileSelectOption<T>[];
  placeholder?: string;
  searchable?: boolean;
  disabled?: boolean;
  style?: StyleProp<ViewStyle>;
  emptyText?: string;
};

type SingleProps<T extends string | number> = BaseProps<T> & {
  multiple?: false;
  value: T | "" | null | undefined;
  onChange: (value: T) => void;
  values?: never;
};

type MultiProps<T extends string | number> = BaseProps<T> & {
  multiple: true;
  values: T[];
  onChange: (values: T[]) => void;
  value?: never;
};

type Props<T extends string | number> = SingleProps<T> | MultiProps<T>;

/**
 * Field that opens a searchable Bottom Sheet picker — mobile replacement for
 * long inline option lists. Supports single and multi select.
 */
export function MobileSelect<T extends string | number = string>(
  props: Props<T>,
) {
  const {
    label,
    options,
    placeholder = "Select…",
    searchable = true,
    disabled = false,
    style,
    emptyText = "No options",
    multiple = false,
  } = props;
  const c = useThemeStore((s) => s.colors);
  const sheetRef = useRef<BottomSheetModal>(null);
  const [query, setQuery] = useState("");
  const [draft, setDraft] = useState<T[]>([]);

  const selectedValues = useMemo(() => {
    if (multiple) return (props as MultiProps<T>).values ?? [];
    const v = (props as SingleProps<T>).value;
    if (v === undefined || v === null) return [];
    return [v as T];
  }, [multiple, props]);

  const selectedLabels = useMemo(() => {
    return options
      .filter((o) => selectedValues.some((v) => String(v) === String(o.value)))
      .map((o) => o.label);
  }, [options, selectedValues]);

  const filtered = useMemo(() => {
    const q = query.trim().toLowerCase();
    if (!q) return options;
    return options.filter(
      (o) =>
        o.label.toLowerCase().includes(q) ||
        (o.hint && o.hint.toLowerCase().includes(q)) ||
        String(o.value).toLowerCase().includes(q),
    );
  }, [options, query]);

  const open = useCallback(() => {
    if (disabled) return;
    setQuery("");
    if (multiple) setDraft([...(props as MultiProps<T>).values]);
    void triggerHaptic("selection");
    sheetRef.current?.present();
  }, [disabled, multiple, props]);

  const pickSingle = useCallback(
    (next: T) => {
      (props as SingleProps<T>).onChange(next);
      void triggerHaptic("light");
      sheetRef.current?.dismiss();
    },
    [props],
  );

  const toggleMulti = useCallback((next: T) => {
    setDraft((prev) => {
      const exists = prev.some((v) => String(v) === String(next));
      return exists
        ? prev.filter((v) => String(v) !== String(next))
        : [...prev, next];
    });
    void triggerHaptic("selection");
  }, []);

  const confirmMulti = useCallback(() => {
    (props as MultiProps<T>).onChange(draft);
    void triggerHaptic("light");
    sheetRef.current?.dismiss();
  }, [draft, props]);

  const displayText =
    selectedLabels.length === 0
      ? placeholder
      : multiple && selectedLabels.length > 2
        ? `${selectedLabels.slice(0, 2).join(", ")} +${selectedLabels.length - 2}`
        : selectedLabels.join(", ");

  return (
    <View style={style}>
      <Text style={[styles.label, { color: c.muted }]}>{label}</Text>
      <Pressable
        onPress={open}
        disabled={disabled}
        accessibilityRole="button"
        accessibilityLabel={label}
        style={({ pressed }) => [
          styles.field,
          {
            borderColor: c.border,
            backgroundColor: c.bg,
            opacity: disabled ? 0.55 : pressed ? 0.85 : 1,
          },
        ]}
      >
        <Text
          style={[
            styles.value,
            { color: selectedLabels.length ? c.text : c.muted },
          ]}
          numberOfLines={1}
        >
          {displayText}
        </Text>
        <ChevronIcon color={c.muted} size={16} />
      </Pressable>

      <AppBottomSheet
        ref={sheetRef}
        title={label}
        snapPoints={["55%", "90%"]}
        scrollable
        footer={
          multiple ? (
            <Pressable
              onPress={confirmMulti}
              style={[styles.doneBtn, { backgroundColor: c.primary }]}
            >
              <Text style={styles.doneText}>
                Done{draft.length ? ` (${draft.length})` : ""}
              </Text>
            </Pressable>
          ) : undefined
        }
      >
        {searchable ? (
          <BottomSheetTextInput
            value={query}
            onChangeText={setQuery}
            placeholder="Search…"
            placeholderTextColor={c.muted}
            style={[
              styles.search,
              {
                borderColor: c.border,
                backgroundColor: c.surface,
                color: c.text,
              },
            ]}
            autoCorrect={false}
            autoCapitalize="none"
          />
        ) : null}

        {filtered.length === 0 ? (
          <Text style={{ color: c.muted, marginTop: spacing.md }}>
            {emptyText}
          </Text>
        ) : (
          filtered.map((opt) => {
            const active = multiple
              ? draft.some((v) => String(v) === String(opt.value))
              : selectedValues.some((v) => String(v) === String(opt.value));
            return (
              <Pressable
                key={String(opt.value)}
                onPress={() =>
                  multiple ? toggleMulti(opt.value) : pickSingle(opt.value)
                }
                style={[
                  styles.option,
                  {
                    borderColor: active ? c.primary : c.border,
                    backgroundColor: active ? c.primary + "14" : c.bg,
                  },
                ]}
              >
                <View style={{ flex: 1, minWidth: 0 }}>
                  <Text
                    style={{
                      color: c.text,
                      fontWeight: active ? "700" : "600",
                    }}
                    numberOfLines={1}
                  >
                    {opt.label}
                  </Text>
                  {opt.hint ? (
                    <Text
                      style={{ color: c.muted, fontSize: 12, marginTop: 2 }}
                      numberOfLines={1}
                    >
                      {opt.hint}
                    </Text>
                  ) : null}
                </View>
                {active ? (
                  <Text style={{ color: c.primary, fontWeight: "800" }}>✓</Text>
                ) : null}
              </Pressable>
            );
          })
        )}
      </AppBottomSheet>
    </View>
  );
}

export function MobileSelectField(props: {
  label: string;
  children?: ReactNode;
}) {
  return <View>{props.children}</View>;
}

const styles = StyleSheet.create({
  label: { marginBottom: 6, fontWeight: "600", fontSize: 13 },
  field: {
    borderWidth: 1,
    borderRadius: 12,
    paddingHorizontal: 14,
    paddingVertical: 13,
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
    marginBottom: spacing.md,
  },
  value: { flex: 1, fontSize: 16, minWidth: 0 },
  search: {
    borderWidth: 1,
    borderRadius: 12,
    paddingHorizontal: 14,
    paddingVertical: 12,
    fontSize: 16,
    marginBottom: spacing.sm,
  },
  option: {
    borderWidth: 1,
    borderRadius: 12,
    paddingHorizontal: 14,
    paddingVertical: 12,
    marginBottom: 8,
    flexDirection: "row",
    alignItems: "center",
    gap: 10,
  },
  doneBtn: {
    borderRadius: 12,
    paddingVertical: 14,
    alignItems: "center",
  },
  doneText: { color: "#fff", fontWeight: "700", fontSize: 16 },
});
