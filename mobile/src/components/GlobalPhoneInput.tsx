import { useMemo, useState } from "react";
import {
  FlatList,
  Modal,
  Pressable,
  StyleSheet,
  Text,
  TextInput,
  View,
} from "react-native";
import {
  emptyPhoneValue,
  formatPhoneDisplay,
  getDialCode,
  isValidInternationalPhone,
  listCountryIsos,
  phoneValueFromE164,
  countryFlagEmoji,
  detectLocalePreferences,
  type PhoneValue,
} from "@mytask/utils";
import { useThemeStore } from "../store/themeStore";

export type GlobalPhoneInputProps = {
  label?: string;
  value?: PhoneValue | null;
  defaultCountry?: string;
  required?: boolean;
  disabled?: boolean;
  error?: string;
  onChange: (value: PhoneValue) => void;
};

/**
 * Shared international phone input for React Native.
 * Country list comes from libphonenumber-js (ISO), not a hardcoded set.
 * Default country follows device locale when not provided.
 */
export function GlobalPhoneInput({
  label,
  value,
  defaultCountry,
  required,
  disabled,
  error,
  onChange,
}: GlobalPhoneInputProps) {
  const c = useThemeStore((s) => s.colors);
  const [pickerOpen, setPickerOpen] = useState(false);
  const [search, setSearch] = useState("");
  const [touched, setTouched] = useState(false);
  const resolvedDefault =
    defaultCountry ||
    detectLocalePreferences().defaultCountryIso ||
    "US";
  const iso = (value?.phone_country_iso || resolvedDefault).toUpperCase();
  const dial = value?.phone_country_code || getDialCode(iso) || "+1";

  const countries = useMemo(() => {
    const q = search.trim().toLowerCase();
    return listCountryIsos()
      .map((code) => ({
        iso: code,
        dial: getDialCode(code) || "",
        flag: countryFlagEmoji(code),
      }))
      .filter((row) => {
        if (!q) return true;
        return (
          row.iso.toLowerCase().includes(q) ||
          row.dial.includes(q) ||
          row.dial.replace("+", "").includes(q)
        );
      });
  }, [search]);

  const localError = useMemo(() => {
    if (!touched && !error) return undefined;
    if (error) return error;
    if (required && !value?.phone_number) return "Phone number is required";
    if (
      value?.phone_number &&
      !isValidInternationalPhone(value.phone_number, iso)
    ) {
      return "Enter a valid phone number for the selected country";
    }
    return undefined;
  }, [touched, error, required, value?.phone_number, iso]);

  function applyNationalDigits(digits: string) {
    const cleaned = digits.replace(/[^\d]/g, "");
    if (!cleaned) {
      onChange({
        phone_number: null,
        phone_country_code: dial,
        phone_country_iso: iso,
      });
      return;
    }
    const candidate = `${dial}${cleaned}`;
    onChange(phoneValueFromE164(candidate, iso));
  }

  const nationalDisplay = (value?.phone_number || "")
    .replace(dial, "")
    .replace(/^\+/, "");

  return (
    <View style={styles.wrap}>
      {label ? (
        <Text style={[styles.label, { color: c.text }]}>
          {label}
          {required ? <Text style={{ color: c.negative || "#ef4444" }}> *</Text> : null}
        </Text>
      ) : null}
      <View
        style={[
          styles.row,
          {
            backgroundColor: c.surface,
            borderColor: localError ? c.negative || "#ef4444" : c.border,
          },
        ]}
      >
        <Pressable
          disabled={disabled}
          accessibilityRole="button"
          accessibilityLabel="Select country"
          onPress={() => setPickerOpen(true)}
          style={styles.countryBtn}
        >
          <Text style={{ fontSize: 18 }}>{countryFlagEmoji(iso)}</Text>
          <Text style={{ color: c.text, marginLeft: 6 }}>{dial}</Text>
        </Pressable>
        <TextInput
          editable={!disabled}
          keyboardType="phone-pad"
          value={nationalDisplay}
          onChangeText={applyNationalDigits}
          onBlur={() => setTouched(true)}
          placeholder="Phone number"
          placeholderTextColor={c.muted}
          style={[styles.input, { color: c.text }]}
          accessibilityLabel={label || "Phone number"}
        />
      </View>
      {localError ? (
        <Text style={[styles.error, { color: c.negative || "#ef4444" }]}>
          {localError}
        </Text>
      ) : null}

      <Modal visible={pickerOpen} animationType="slide" transparent>
        <View style={styles.modalBackdrop}>
          <View style={[styles.modalCard, { backgroundColor: c.surface }]}>
            <Text style={[styles.modalTitle, { color: c.text }]}>
              Select country
            </Text>
            <TextInput
              value={search}
              onChangeText={setSearch}
              placeholder="Search country or code"
              placeholderTextColor={c.muted}
              style={[
                styles.search,
                { color: c.text, borderColor: c.border, backgroundColor: c.bg },
              ]}
            />
            <FlatList
              data={countries}
              keyExtractor={(item) => item.iso}
              keyboardShouldPersistTaps="handled"
              renderItem={({ item }) => (
                <Pressable
                  style={styles.countryRow}
                  onPress={() => {
                    const nextDial = item.dial || dial;
                    onChange({
                      phone_number: value?.phone_number
                        ? phoneValueFromE164(
                            `${nextDial}${nationalDisplay}`,
                            item.iso,
                          ).phone_number
                        : null,
                      phone_country_code: nextDial,
                      phone_country_iso: item.iso,
                    });
                    setPickerOpen(false);
                    setSearch("");
                  }}
                >
                  <Text style={{ fontSize: 18 }}>{item.flag}</Text>
                  <Text style={{ color: c.text, marginLeft: 10, flex: 1 }}>
                    {item.iso}
                  </Text>
                  <Text style={{ color: c.muted }}>{item.dial}</Text>
                </Pressable>
              )}
            />
            <Pressable
              onPress={() => {
                setPickerOpen(false);
                setSearch("");
              }}
              style={styles.closeBtn}
            >
              <Text style={{ color: c.primary, fontWeight: "600" }}>Close</Text>
            </Pressable>
          </View>
        </View>
      </Modal>
    </View>
  );
}

export function GlobalPhoneDisplay({
  phoneNumber,
  countryIso,
}: {
  phoneNumber?: string | null;
  countryIso?: string | null;
}) {
  if (!phoneNumber) return null;
  return <Text>{formatPhoneDisplay(phoneNumber, countryIso)}</Text>;
}

export { emptyPhoneValue };

const styles = StyleSheet.create({
  wrap: { width: "100%", gap: 6 },
  label: { fontSize: 14, fontWeight: "600" },
  row: {
    flexDirection: "row",
    alignItems: "center",
    borderWidth: 1,
    borderRadius: 12,
    paddingHorizontal: 10,
    minHeight: 48,
  },
  countryBtn: {
    flexDirection: "row",
    alignItems: "center",
    paddingRight: 10,
    borderRightWidth: StyleSheet.hairlineWidth,
    borderRightColor: "#9993",
    marginRight: 8,
  },
  input: { flex: 1, paddingVertical: 10, fontSize: 16 },
  error: { fontSize: 12 },
  modalBackdrop: {
    flex: 1,
    backgroundColor: "rgba(0,0,0,0.45)",
    justifyContent: "flex-end",
  },
  modalCard: {
    maxHeight: "80%",
    borderTopLeftRadius: 16,
    borderTopRightRadius: 16,
    padding: 16,
  },
  modalTitle: { fontSize: 18, fontWeight: "700", marginBottom: 10 },
  search: {
    borderWidth: 1,
    borderRadius: 10,
    paddingHorizontal: 12,
    paddingVertical: 10,
    marginBottom: 8,
  },
  countryRow: {
    flexDirection: "row",
    alignItems: "center",
    paddingVertical: 12,
  },
  closeBtn: { alignItems: "center", paddingVertical: 14 },
});
