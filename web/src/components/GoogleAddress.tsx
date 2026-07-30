import { lazy, Suspense, useEffect, useId, useRef, useState } from "react";
import { useSystemStates } from "@mytask/hooks";
import {
  emptyGlobalAddress,
  hasAddressContent,
  normalizeAddress,
  parseGooglePlaceComponents,
  type GlobalAddress,
} from "@mytask/utils";
import { TextInput } from "@/components/ui/TextInput";
import {
  getGoogleMapsApiKey,
  hasGooglePlaces,
  loadGoogleMaps,
  type GoogleAutocomplete,
} from "@/lib/googleMaps";

const MapLocationPicker = lazy(() =>
  import("@/components/maps/MapLocationPicker").then((m) => ({
    default: m.MapLocationPicker,
  })),
);
/** @deprecated Prefer GlobalAddress — kept as web alias */
export type AddressValue = GlobalAddress;

export const emptyAddress = (): AddressValue => emptyGlobalAddress();

const inputClass =
  "mt-focus rounded-xl border border-border bg-[var(--mt-surface)] px-3.5 py-3 text-[var(--mt-text)] outline-none focus:border-primary";

function matchKnownState(
  stateList: Array<{ id: number; name: string; code?: string }> | undefined,
  name: string,
  code: string,
) {
  if (!stateList?.length || (!name && !code)) return null;
  const byName = stateList.find(
    (s) => s.name.toLowerCase() === name.toLowerCase(),
  );
  if (byName) return byName;
  if (!code) return null;
  return (
    stateList.find(
      (s) => (s.code || "").toLowerCase() === code.toLowerCase(),
    ) || null
  );
}

export type GoogleAddressAutocompleteProps = {
  value?: Partial<AddressValue> | null;
  onChange: (next: AddressValue) => void;
  /** Show lat/lng fields + map coordinates. Default false. */
  requireCoordinates?: boolean;
  /**
   * Allow editing populated fields after selection.
   * Always true by default — auto-filled fields are never locked.
   */
  allowManualEdit?: boolean;
  /** Embed interactive map (geolocation + pin drag). Jobs typically enable this. */
  showMap?: boolean;
  placeholder?: string;
  label?: string;
  error?: string;
  className?: string;
  /** Force showing detail fields even before selection. */
  alwaysShowDetails?: boolean;
};

/**
 * Worldwide Google Places address input + editable structured fields.
 * Optionally embeds MapLocationPicker for geolocation / pin drag.
 */
export function GoogleAddressAutocomplete({
  value,
  onChange,
  requireCoordinates = false,
  allowManualEdit = true,
  showMap = false,
  placeholder = "Start typing an address…",
  label = "Address",
  error,
  className,
  alwaysShowDetails = false,
}: GoogleAddressAutocompleteProps) {
  const apiKey = getGoogleMapsApiKey();
  const hasMaps = Boolean(apiKey);
  const searchId = useId();
  const searchRef = useRef<HTMLInputElement>(null);
  const form = normalizeAddress(value);
  const { data: states } = useSystemStates();
  const [mapsReady, setMapsReady] = useState(false);
  const [mapsError, setMapsError] = useState<string | null>(null);
  const [selected, setSelected] = useState(() => hasAddressContent(value));

  useEffect(() => {
    if (hasAddressContent(value)) setSelected(true);
  }, [
    value?.place_id,
    value?.formatted_address,
    value?.address_line_1,
    value?.address_1,
  ]);

  function emit(partial: Partial<AddressValue>) {
    onChange(normalizeAddress({ ...form, ...partial }));
  }

  const onChangeRef = useRef(onChange);
  onChangeRef.current = onChange;
  const statesRef = useRef(states);
  statesRef.current = states;

  useEffect(() => {
    if (!hasMaps || !apiKey) return;
    let cancelled = false;
    let autocomplete: GoogleAutocomplete | null = null;

    void loadGoogleMaps(apiKey)
      .then(() => {
        if (cancelled || !searchRef.current || !hasGooglePlaces()) {
          return;
        }
        setMapsReady(true);
        setMapsError(null);

        const Places = window.google?.maps?.places;
        if (!Places) return;

        autocomplete = new Places.Autocomplete(searchRef.current, {
          fields: [
            "place_id",
            "formatted_address",
            "address_components",
            "geometry",
          ],
          types: ["address"],
        });

        const instance = autocomplete;
        instance.addListener("place_changed", () => {
          const place = instance.getPlace();
          if (!place?.address_components?.length && !place?.formatted_address) {
            return;
          }
          const parts = place.address_components || [];
          const parsed = parseGooglePlaceComponents(parts, {
            formatted_address: place.formatted_address,
            place_id: place.place_id,
            latitude: place.geometry?.location?.lat() ?? null,
            longitude: place.geometry?.location?.lng() ?? null,
          });
          const matchedState = matchKnownState(
            statesRef.current as
              | Array<{ id: number; name: string; code?: string }>
              | undefined,
            parsed.state_region_province,
            parsed.country_code === "AU"
              ? parsed.state?.code || ""
              : parsed.state?.code || "",
          );
          const next = normalizeAddress({
            ...parsed,
            state: matchedState
              ? {
                  id: matchedState.id,
                  name: matchedState.name,
                  code: matchedState.code,
                }
              : parsed.state,
          });
          setSelected(true);
          onChangeRef.current(next);
          if (searchRef.current && place.formatted_address) {
            searchRef.current.value = place.formatted_address;
          }
        });
      })
      .catch((err: unknown) => {
        if (!cancelled) {
          setMapsError(
            err instanceof Error ? err.message : "Google Maps unavailable",
          );
        }
      });

    return () => {
      cancelled = true;
      if (autocomplete && window.google?.maps?.event?.clearInstanceListeners) {
        window.google.maps.event.clearInstanceListeners(autocomplete);
      }
    };
  }, [hasMaps, apiKey]);

  const showDetails = alwaysShowDetails || selected || hasAddressContent(form);

  function clearAddress() {
    setSelected(false);
    onChange(emptyAddress());
    if (searchRef.current) searchRef.current.value = "";
  }

  return (
    <div className={className ?? "flex flex-col gap-3"}>
      {hasMaps ? (
        <label className="flex w-full flex-col gap-1.5 text-sm">
          <span className="font-medium text-[var(--mt-text)]">{label}</span>
          <input
            ref={searchRef}
            id={searchId}
            type="text"
            placeholder={placeholder}
            className={inputClass}
            autoComplete="off"
            aria-invalid={Boolean(error)}
            defaultValue={
              form.formatted_address || form.address_line_1 || form.address_1 || ""
            }
            key={form.place_id || "search"}
          />
          {mapsError ? (
            <span className="text-xs text-negative">{mapsError}</span>
          ) : !mapsReady ? (
            <span className="text-xs text-muted">Loading Google Places…</span>
          ) : (
            <span className="text-xs text-muted">
              Select a suggestion to fill address details automatically
              (worldwide). All fields remain editable.
            </span>
          )}
          {error ? (
            <span className="text-xs text-negative" role="alert">
              {error}
            </span>
          ) : null}
        </label>
      ) : (
        <p className="text-xs text-muted">
          Set{" "}
          <code className="text-[var(--mt-text)]">VITE_GOOGLE_MAPS_API_KEY</code>{" "}
          for Google Places autocomplete. You can still enter address fields
          manually below.
        </p>
      )}

      {showMap ? (
        <Suspense
          fallback={
            <p className="text-xs text-muted">Loading map…</p>
          }
        >
          <MapLocationPicker value={form} onChange={onChange} />
        </Suspense>
      ) : null}

      {showDetails || !hasMaps ? (
        <div className="flex flex-col gap-3 rounded-xl border border-border bg-[var(--mt-surface)]/60 p-3">
          <div className="flex items-center justify-between gap-2">
            <p className="text-xs font-medium uppercase tracking-wide text-muted">
              Address details
            </p>
            {hasMaps ? (
              <button
                type="button"
                className="text-xs font-medium text-primary"
                onClick={clearAddress}
              >
                Clear address
              </button>
            ) : null}
          </div>

          <TextInput
            label="Address Line 1"
            value={form.address_line_1}
            onChange={(e) =>
              emit({
                address_line_1: e.target.value,
                address_1: e.target.value,
              })
            }
            readOnly={!allowManualEdit}
          />
          <TextInput
            label="Address Line 2 (optional)"
            value={form.address_line_2}
            onChange={(e) =>
              emit({
                address_line_2: e.target.value,
                address_2: e.target.value,
              })
            }
            readOnly={!allowManualEdit}
          />
          <TextInput
            label="Street"
            value={form.street}
            onChange={(e) =>
              emit({
                street: e.target.value,
                street_address: e.target.value,
              })
            }
            readOnly={!allowManualEdit}
          />
          <TextInput
            label="City"
            value={form.city}
            onChange={(e) => emit({ city: e.target.value })}
            readOnly={!allowManualEdit}
          />
          <TextInput
            label="State / Region / Province"
            value={form.state_region_province}
            onChange={(e) => {
              const name = e.target.value;
              emit({
                state_region_province: name,
                administrative_area: name,
                state: name ? { name } : null,
              });
            }}
            readOnly={!allowManualEdit}
          />
          <TextInput
            label="Postal Code"
            value={form.postal_code}
            onChange={(e) =>
              emit({
                postal_code: e.target.value,
                postcode: e.target.value,
              })
            }
            readOnly={!allowManualEdit}
          />
          <TextInput
            label="Country"
            value={form.country}
            onChange={(e) => emit({ country: e.target.value })}
            readOnly={!allowManualEdit}
          />

          {requireCoordinates ? (
            <div className="grid gap-3 sm:grid-cols-2">
              <TextInput
                label="Latitude"
                value={
                  form.latitude === null || form.latitude === undefined
                    ? ""
                    : String(form.latitude)
                }
                onChange={(e) =>
                  emit({
                    latitude: e.target.value === "" ? null : e.target.value,
                  })
                }
                readOnly={!allowManualEdit}
              />
              <TextInput
                label="Longitude"
                value={
                  form.longitude === null || form.longitude === undefined
                    ? ""
                    : String(form.longitude)
                }
                onChange={(e) =>
                  emit({
                    longitude: e.target.value === "" ? null : e.target.value,
                  })
                }
                readOnly={!allowManualEdit}
              />
            </div>
          ) : null}
        </div>
      ) : null}
    </div>
  );
}

/** @deprecated Prefer GoogleAddressAutocomplete */
export const GoogleAddress = GoogleAddressAutocomplete;

/** Unified address form alias */
export const AddressForm = GoogleAddressAutocomplete;
