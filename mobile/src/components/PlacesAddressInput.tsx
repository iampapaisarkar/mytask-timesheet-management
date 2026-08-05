import { useCallback, useEffect, useRef, useState } from "react";
import {
  ActivityIndicator,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  View,
} from "react-native";
import { BottomSheetTextInput } from "../ui/AppBottomSheet";
import {
  emptyGlobalAddress,
  hasAddressContent,
  normalizeAddress,
  parseGooglePlaceComponents,
  type GlobalAddress,
} from "@mytask/utils";
import { spacing } from "@mytask/theme";
import { ENV } from "../config/env";
import { useThemeStore } from "../store/themeStore";
import { useDebouncedValue } from "../hooks/useDebouncedValue";
import { MapLocationPicker } from "./MapLocationPicker";

type Prediction = {
  place_id: string;
  description: string;
};

type PlaceDetailsResponse = {
  result?: {
    place_id?: string;
    formatted_address?: string;
    address_components?: Array<{
      long_name: string;
      short_name: string;
      types: string[];
    }>;
    geometry?: {
      location?: { lat: number; lng: number };
    };
  };
  status?: string;
};

type AutocompleteResponse = {
  predictions?: Array<{ place_id: string; description: string }>;
  status?: string;
};

function DetailField({
  label,
  value,
  onChangeText,
  Input,
  editable,
  colors,
  keyboardType,
}: {
  label: string;
  value: string;
  onChangeText: (text: string) => void;
  Input: typeof TextInput;
  editable: boolean;
  colors: { muted: string; border: string; text: string; bg: string };
  keyboardType?: "default" | "numeric" | "decimal-pad";
}) {
  return (
    <View style={styles.detailField}>
      <Text style={[styles.detailLabel, { color: colors.muted }]}>{label}</Text>
      <Input
        value={value}
        onChangeText={onChangeText}
        editable={editable}
        placeholderTextColor={colors.muted}
        keyboardType={keyboardType}
        style={[
          styles.input,
          {
            borderColor: colors.border,
            color: colors.text,
            backgroundColor: colors.bg,
            opacity: editable ? 1 : 0.7,
          },
        ]}
      />
    </View>
  );
}

/**
 * Worldwide Google Places address input + editable structured fields.
 * Optionally embeds MapLocationPicker for geolocation / pin drag (jobs).
 */
export function PlacesAddressInput({
  value,
  onChange,
  placeholder = "Start typing an address…",
  label = "Address",
  requireCoordinates = false,
  inBottomSheet = false,
  showMap = false,
  alwaysShowDetails = false,
  allowManualEdit = true,
}: {
  value?: Partial<GlobalAddress> | null;
  onChange: (next: GlobalAddress) => void;
  placeholder?: string;
  label?: string;
  requireCoordinates?: boolean;
  /** Use BottomSheetTextInput so the sheet scrolls the field above the keyboard. */
  inBottomSheet?: boolean;
  /** Embed interactive map (geolocation + pin drag). Jobs typically enable this. */
  showMap?: boolean;
  /** Force showing detail fields even before selection. */
  alwaysShowDetails?: boolean;
  /** Allow editing populated fields after selection. Default true. */
  allowManualEdit?: boolean;
}) {
  const c = useThemeStore((s) => s.colors);
  const Input = inBottomSheet ? BottomSheetTextInput : TextInput;
  const apiKey = ENV.GOOGLE_MAPS_API_KEY;
  const address = normalizeAddress(value);
  const [query, setQuery] = useState(
    address.formatted_address || address.address_line_1 || "",
  );
  const debounced = useDebouncedValue(query.trim(), 350);
  const [predictions, setPredictions] = useState<Prediction[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [open, setOpen] = useState(false);
  const [selected, setSelected] = useState(() => hasAddressContent(value));
  const skipNextFetch = useRef(false);
  /** While true, ignore parent address sync so a second search is not overwritten. */
  const editingSearchRef = useRef(false);

  useEffect(() => {
    if (hasAddressContent(value)) setSelected(true);
  }, [
    value?.place_id,
    value?.formatted_address,
    value?.address_line_1,
    value?.address_1,
  ]);

  useEffect(() => {
    if (editingSearchRef.current) return;
    const next = address.formatted_address || address.address_line_1 || "";
    if (next !== query) {
      skipNextFetch.current = true;
      setQuery(next);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps -- sync external value only
  }, [
    address.place_id,
    address.formatted_address,
    address.latitude,
    address.longitude,
  ]);

  function emit(partial: Partial<GlobalAddress>) {
    onChange(normalizeAddress({ ...address, ...partial }));
  }

  function clearAddress() {
    editingSearchRef.current = false;
    skipNextFetch.current = true;
    setQuery("");
    setPredictions([]);
    setOpen(false);
    setSelected(false);
    setError(null);
    onChange(emptyGlobalAddress());
  }

  const fetchPredictions = useCallback(
    async (input: string) => {
      if (!apiKey || input.length < 3) {
        setPredictions([]);
        return;
      }
      setLoading(true);
      setError(null);
      try {
        const url =
          `https://maps.googleapis.com/maps/api/place/autocomplete/json` +
          `?input=${encodeURIComponent(input)}` +
          `&types=address&key=${encodeURIComponent(apiKey)}`;
        const res = await fetch(url);
        const json = (await res.json()) as AutocompleteResponse;
        if (json.status && json.status !== "OK" && json.status !== "ZERO_RESULTS") {
          setError(json.status);
          setPredictions([]);
          return;
        }
        setPredictions(
          (json.predictions || []).map((p) => ({
            place_id: p.place_id,
            description: p.description,
          })),
        );
        setOpen(true);
      } catch {
        setError("Unable to search addresses");
        setPredictions([]);
      } finally {
        setLoading(false);
      }
    },
    [apiKey],
  );

  useEffect(() => {
    if (skipNextFetch.current) {
      skipNextFetch.current = false;
      return;
    }
    void fetchPredictions(debounced);
  }, [debounced, fetchPredictions]);

  async function selectPrediction(prediction: Prediction) {
    if (!apiKey) return;
    setLoading(true);
    setOpen(false);
    setError(null);
    try {
      const url =
        `https://maps.googleapis.com/maps/api/place/details/json` +
        `?place_id=${encodeURIComponent(prediction.place_id)}` +
        `&fields=address_component,formatted_address,geometry,place_id` +
        `&key=${encodeURIComponent(apiKey)}`;
      const res = await fetch(url);
      const json = (await res.json()) as PlaceDetailsResponse;
      if (!json.result) {
        setError(json.status || "Place details failed");
        return;
      }
      const loc = json.result.geometry?.location;
      const parsed = parseGooglePlaceComponents(
        json.result.address_components || [],
        {
          place_id: json.result.place_id || prediction.place_id,
          formatted_address:
            json.result.formatted_address || prediction.description,
          latitude: loc?.lat,
          longitude: loc?.lng,
        },
      );
      skipNextFetch.current = true;
      editingSearchRef.current = false;
      setQuery(parsed.formatted_address || prediction.description);
      setPredictions([]);
      setSelected(true);
      onChange(parsed);
    } catch {
      setError("Unable to load place details");
    } finally {
      setLoading(false);
    }
  }

  const showDetails =
    alwaysShowDetails || selected || hasAddressContent(address) || !apiKey;
  const fieldColors = {
    muted: c.muted,
    border: c.border,
    text: c.text,
    bg: c.bg,
  };

  return (
    <View style={styles.wrap}>
      <Text style={[styles.label, { color: c.muted }]}>{label}</Text>
      {apiKey ? (
        <View style={{ position: "relative" }}>
          <Input
            value={query}
            onChangeText={(text: string) => {
              editingSearchRef.current = true;
              setQuery(text);
              setOpen(true);
              setSelected(false);
              if (!text.trim()) {
                onChange(emptyGlobalAddress());
              }
            }}
            onBlur={() => {
              // Allow place selection / parent sync after the user finishes typing
              setTimeout(() => {
                editingSearchRef.current = false;
              }, 250);
            }}
            placeholder={placeholder}
            placeholderTextColor={c.muted}
            style={[
              styles.input,
              { borderColor: c.border, color: c.text, backgroundColor: c.bg },
            ]}
            autoCorrect={false}
          />
          {loading ? (
            <ActivityIndicator
              style={styles.spinner}
              color={c.primary}
              size="small"
            />
          ) : null}
        </View>
      ) : (
        <Text style={{ color: c.muted, fontSize: 12, marginBottom: 8 }}>
          Set GOOGLE_MAPS_API_KEY (Places API enabled) for address autofill. You
          can still enter address fields manually below.
        </Text>
      )}
      {error ? (
        <Text style={{ color: c.negative, marginTop: 6, fontSize: 12 }}>
          {error}
        </Text>
      ) : null}
      {open && predictions.length > 0 ? (
        <View
          style={[
            styles.dropdown,
            { backgroundColor: c.surface, borderColor: c.border },
          ]}
        >
          <ScrollView
            keyboardShouldPersistTaps="handled"
            nestedScrollEnabled
            style={styles.dropdownScroll}
          >
            {predictions.map((item) => (
              <Pressable
                key={item.place_id}
                onPress={() => void selectPrediction(item)}
                style={[styles.row, { borderBottomColor: c.border }]}
              >
                <Text style={{ color: c.text, fontSize: 13 }}>
                  {item.description}
                </Text>
              </Pressable>
            ))}
          </ScrollView>
        </View>
      ) : null}

      {showMap ? (
        <MapLocationPicker value={address} onChange={onChange} />
      ) : null}

      {showDetails ? (
        <View
          style={[
            styles.details,
            { borderColor: c.border, backgroundColor: c.surface },
          ]}
        >
          <View style={styles.detailsHeader}>
            <Text style={[styles.detailsTitle, { color: c.muted }]}>
              Address details
            </Text>
            {apiKey ? (
              <Pressable onPress={clearAddress} hitSlop={8}>
                <Text style={{ color: c.primary, fontSize: 12, fontWeight: "600" }}>
                  Clear address
                </Text>
              </Pressable>
            ) : null}
          </View>

          <DetailField
            label="Address Line 1"
            value={address.address_line_1}
            onChangeText={(text) =>
              emit({ address_line_1: text, address_1: text })
            }
            Input={Input}
            editable={allowManualEdit}
            colors={fieldColors}
          />
          <DetailField
            label="Address Line 2 (optional)"
            value={address.address_line_2}
            onChangeText={(text) =>
              emit({ address_line_2: text, address_2: text })
            }
            Input={Input}
            editable={allowManualEdit}
            colors={fieldColors}
          />
          <DetailField
            label="Street"
            value={address.street}
            onChangeText={(text) =>
              emit({ street: text, street_address: text })
            }
            Input={Input}
            editable={allowManualEdit}
            colors={fieldColors}
          />
          <DetailField
            label="City"
            value={address.city}
            onChangeText={(text) => emit({ city: text })}
            Input={Input}
            editable={allowManualEdit}
            colors={fieldColors}
          />
          <DetailField
            label="State / Region / Province"
            value={address.state_region_province}
            onChangeText={(text) =>
              emit({
                state_region_province: text,
                administrative_area: text,
                state: text ? { name: text } : null,
              })
            }
            Input={Input}
            editable={allowManualEdit}
            colors={fieldColors}
          />
          <DetailField
            label="Postal Code"
            value={address.postal_code}
            onChangeText={(text) =>
              emit({ postal_code: text, postcode: text })
            }
            Input={Input}
            editable={allowManualEdit}
            colors={fieldColors}
          />
          <DetailField
            label="Country"
            value={address.country}
            onChangeText={(text) => emit({ country: text })}
            Input={Input}
            editable={allowManualEdit}
            colors={fieldColors}
          />

          {requireCoordinates ? (
            <View style={styles.coordsRow}>
              <View style={styles.coordsHalf}>
                <DetailField
                  label="Latitude"
                  value={
                    address.latitude === null || address.latitude === undefined
                      ? ""
                      : String(address.latitude)
                  }
                  onChangeText={(text) =>
                    emit({ latitude: text === "" ? null : text })
                  }
                  Input={Input}
                  editable={allowManualEdit}
                  colors={fieldColors}
                  keyboardType="decimal-pad"
                />
              </View>
              <View style={styles.coordsHalf}>
                <DetailField
                  label="Longitude"
                  value={
                    address.longitude === null ||
                    address.longitude === undefined
                      ? ""
                      : String(address.longitude)
                  }
                  onChangeText={(text) =>
                    emit({ longitude: text === "" ? null : text })
                  }
                  Input={Input}
                  editable={allowManualEdit}
                  colors={fieldColors}
                  keyboardType="decimal-pad"
                />
              </View>
            </View>
          ) : null}
        </View>
      ) : null}
    </View>
  );
}

const styles = StyleSheet.create({
  wrap: { marginBottom: spacing.md },
  label: { fontSize: 12, fontWeight: "600", marginBottom: 6 },
  input: {
    borderWidth: 1,
    borderRadius: 12,
    paddingHorizontal: 12,
    paddingVertical: 12,
    fontSize: 15,
  },
  spinner: { position: "absolute", right: 12, top: 14 },
  dropdown: {
    marginTop: 6,
    borderWidth: 1,
    borderRadius: 12,
    overflow: "hidden",
  },
  dropdownScroll: {
    maxHeight: 180,
  },
  row: {
    paddingHorizontal: 12,
    paddingVertical: 12,
    borderBottomWidth: StyleSheet.hairlineWidth,
  },
  details: {
    marginTop: 10,
    borderWidth: 1,
    borderRadius: 12,
    padding: 12,
    gap: 4,
  },
  detailsHeader: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    marginBottom: 8,
  },
  detailsTitle: {
    fontSize: 11,
    fontWeight: "700",
    letterSpacing: 0.6,
    textTransform: "uppercase",
  },
  detailField: { marginBottom: 8 },
  detailLabel: { fontSize: 12, fontWeight: "600", marginBottom: 4 },
  coordsRow: { flexDirection: "row", gap: 8 },
  coordsHalf: { flex: 1 },
});
