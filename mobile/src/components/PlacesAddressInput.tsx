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
  hasAddressContent,
  normalizeAddress,
  parseGooglePlaceComponents,
  type GlobalAddress,
} from "@mytask/utils";
import { spacing } from "@mytask/theme";
import { ENV } from "../config/env";
import { useThemeStore } from "../store/themeStore";
import { useDebouncedValue } from "../hooks/useDebouncedValue";

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

export function PlacesAddressInput({
  value,
  onChange,
  placeholder = "Start typing an address…",
  label = "Address",
  requireCoordinates = false,
  inBottomSheet = false,
}: {
  value?: Partial<GlobalAddress> | null;
  onChange: (next: GlobalAddress) => void;
  placeholder?: string;
  label?: string;
  requireCoordinates?: boolean;
  /** Use BottomSheetTextInput so the sheet scrolls the field above the keyboard. */
  inBottomSheet?: boolean;
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
  const skipNextFetch = useRef(false);

  useEffect(() => {
    const next = address.formatted_address || address.address_line_1 || "";
    if (next && next !== query) {
      skipNextFetch.current = true;
      setQuery(next);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps -- sync external value only
  }, [address.place_id, address.formatted_address]);

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
      setQuery(parsed.formatted_address || prediction.description);
      setPredictions([]);
      onChange(parsed);
    } catch {
      setError("Unable to load place details");
    } finally {
      setLoading(false);
    }
  }

  if (!apiKey) {
    return (
      <View style={styles.wrap}>
        <Text style={[styles.label, { color: c.muted }]}>{label}</Text>
        <Text style={{ color: c.muted, fontSize: 12, marginBottom: 8 }}>
          Set GOOGLE_MAPS_API_KEY (Places API enabled) for address autofill.
        </Text>
        <Input
          value={query}
          onChangeText={(text: string) => {
            setQuery(text);
            onChange(
              normalizeAddress({
                ...address,
                address_line_1: text,
                formatted_address: text,
              }),
            );
          }}
          placeholder={placeholder}
          placeholderTextColor={c.muted}
          style={[
            styles.input,
            { borderColor: c.border, color: c.text, backgroundColor: c.bg },
          ]}
        />
      </View>
    );
  }

  return (
    <View style={styles.wrap}>
      <Text style={[styles.label, { color: c.muted }]}>{label}</Text>
      <View style={{ position: "relative" }}>
        <Input
          value={query}
          onChangeText={(text: string) => {
            setQuery(text);
            setOpen(true);
            if (!text.trim()) {
              onChange(normalizeAddress({}));
            }
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
          {/* ScrollView (not FlatList) — this field sits inside form ScrollViews / sheets. */}
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
      {hasAddressContent(address) ? (
        <Text style={{ color: c.muted, marginTop: 8, fontSize: 12 }}>
          {[address.city, address.state_region_province, address.country]
            .filter(Boolean)
            .join(", ")}
          {requireCoordinates &&
          address.latitude != null &&
          address.longitude != null
            ? ` · ${Number(address.latitude).toFixed(5)}, ${Number(address.longitude).toFixed(5)}`
            : ""}
        </Text>
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
});
