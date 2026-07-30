import { useEffect, useId, useRef, useState } from "react";
import { useSystemStates } from "@mytask/hooks";
import { TextInput } from "@/components/ui/TextInput";
import {
  getGoogleMapsApiKey,
  hasGooglePlaces,
  loadGoogleMaps,
  type GoogleAutocomplete,
  type GooglePlaceComponents,
} from "@/lib/googleMaps";

/**
 * Canonical worldwide address value from Google Places.
 * Missing components (no state, no postal code, etc.) are null/empty — never assumed.
 */
export type AddressValue = {
  /** Google-formatted full address */
  formatted_address: string;
  /** Street line (number + route) */
  street_address: string;
  /** @deprecated Prefer street_address — kept for API payload compatibility */
  address_1: string;
  address_2?: string;
  city: string;
  /** State / province / emirate — id optional; backend upserts by name */
  state: { id?: number; name?: string; code?: string } | null;
  administrative_area: string;
  postcode: string;
  postal_code: string;
  country: string;
  country_code: string;
  place_id: string;
  latitude: string | number | null;
  longitude: string | number | null;
};

export const emptyAddress = (): AddressValue => ({
  formatted_address: "",
  street_address: "",
  address_1: "",
  address_2: "",
  city: "",
  state: null,
  administrative_area: "",
  postcode: "",
  postal_code: "",
  country: "",
  country_code: "",
  place_id: "",
  latitude: "",
  longitude: "",
});

const inputClass =
  "mt-focus rounded-xl border border-border bg-[var(--mt-surface)] px-3.5 py-3 text-[var(--mt-text)] outline-none focus:border-primary";

function component(
  components: GooglePlaceComponents,
  type: string,
  short = false,
): string {
  const match = components.find((c) => c.types.includes(type));
  if (!match) return "";
  return short ? match.short_name : match.long_name;
}

function buildStreetLine(parts: GooglePlaceComponents): string {
  const number = component(parts, "street_number");
  const route = component(parts, "route");
  const line = [number, route].filter(Boolean).join(" ").trim();
  if (line) return line;
  return (
    component(parts, "premise") ||
    component(parts, "subpremise") ||
    ""
  );
}

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
  if (!code || !name) return null;
  return (
    stateList.find(
      (s) =>
        (s.code || "").toLowerCase() === code.toLowerCase() &&
        s.name.toLowerCase() === name.toLowerCase(),
    ) || null
  );
}

function hasAddressContent(value?: Partial<AddressValue> | null): boolean {
  if (!value) return false;
  return Boolean(
    value.formatted_address?.trim() ||
      value.street_address?.trim() ||
      value.address_1?.trim() ||
      value.place_id?.trim(),
  );
}

export type GoogleAddressAutocompleteProps = {
  value?: Partial<AddressValue> | null;
  onChange: (next: AddressValue) => void;
  /** Show lat/lng after selection (jobs). Default false. */
  requireCoordinates?: boolean;
  /** Allow editing populated fields after selection. Default false (read-only details). */
  allowManualEdit?: boolean;
  placeholder?: string;
  label?: string;
  error?: string;
  className?: string;
  /** Force showing detail fields even before selection (rare). */
  alwaysShowDetails?: boolean;
};

/**
 * Worldwide Google Places address input.
 * Shows only the autocomplete until a place is selected, then fills structured fields.
 */
export function GoogleAddressAutocomplete({
  value,
  onChange,
  requireCoordinates = false,
  allowManualEdit = false,
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
  const form: AddressValue = { ...emptyAddress(), ...(value || {}) };
  const { data: states } = useSystemStates();
  const [mapsReady, setMapsReady] = useState(false);
  const [mapsError, setMapsError] = useState<string | null>(null);
  const [selected, setSelected] = useState(() => hasAddressContent(value));

  useEffect(() => {
    if (hasAddressContent(value)) setSelected(true);
  }, [value?.place_id, value?.formatted_address, value?.address_1]);

  function patch(partial: Partial<AddressValue>) {
    const next = { ...form, ...partial };
    if (partial.postcode != null && partial.postal_code == null) {
      next.postal_code = String(partial.postcode);
    }
    if (partial.postal_code != null && partial.postcode == null) {
      next.postcode = String(partial.postal_code);
    }
    if (partial.street_address != null && partial.address_1 == null) {
      next.address_1 = partial.street_address;
    }
    if (partial.address_1 != null && partial.street_address == null) {
      next.street_address = partial.address_1;
    }
    onChange(next);
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

        // No componentRestrictions — all countries supported by Google Places.
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
          const stateName = component(parts, "administrative_area_level_1");
          const stateCode = component(
            parts,
            "administrative_area_level_1",
            true,
          );
          const matchedState = matchKnownState(
            statesRef.current as
              | Array<{ id: number; name: string; code?: string }>
              | undefined,
            stateName,
            stateCode,
          );
          const street =
            buildStreetLine(parts) || place.formatted_address || "";
          const postal = component(parts, "postal_code");
          const countryName = component(parts, "country");
          const countryCode = component(parts, "country", true);
          const city =
            component(parts, "locality") ||
            component(parts, "postal_town") ||
            component(parts, "sublocality") ||
            component(parts, "administrative_area_level_2") ||
            "";

          const next: AddressValue = {
            formatted_address: place.formatted_address || street,
            street_address: street,
            address_1: street,
            address_2: "",
            city,
            state:
              stateName || stateCode
                ? matchedState
                  ? {
                      id: matchedState.id,
                      name: matchedState.name,
                      code: matchedState.code,
                    }
                  : {
                      name: stateName || stateCode,
                      code: stateCode || undefined,
                    }
                : null,
            administrative_area: stateName || stateCode || "",
            postcode: postal,
            postal_code: postal,
            country: countryName,
            country_code: countryCode,
            place_id: place.place_id || "",
            latitude: place.geometry?.location?.lat() ?? "",
            longitude: place.geometry?.location?.lng() ?? "",
          };
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
  const readOnly = !allowManualEdit;

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
            defaultValue={form.formatted_address || form.address_1 || ""}
          />
          {mapsError ? (
            <span className="text-xs text-negative">{mapsError}</span>
          ) : !mapsReady ? (
            <span className="text-xs text-muted">Loading Google Places…</span>
          ) : (
            <span className="text-xs text-muted">
              Select a suggestion to fill address details automatically
              (worldwide).
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
          for Google Places autocomplete.
        </p>
      )}

      {showDetails ? (
        <div className="flex flex-col gap-3 rounded-xl border border-border bg-[var(--mt-surface)]/60 p-3">
          <div className="flex items-center justify-between gap-2">
            <p className="text-xs font-medium uppercase tracking-wide text-muted">
              Address details
            </p>
            <button
              type="button"
              className="text-xs font-medium text-primary"
              onClick={clearAddress}
            >
              Change address
            </button>
          </div>

          {form.formatted_address ? (
            <p className="text-sm text-[var(--mt-text)]">
              {form.formatted_address}
            </p>
          ) : null}

          {allowManualEdit || !hasMaps ? (
            <>
              <TextInput
                label="Street address"
                value={form.street_address || form.address_1}
                onChange={(e) =>
                  patch({
                    street_address: e.target.value,
                    address_1: e.target.value,
                  })
                }
                readOnly={readOnly && hasMaps}
              />
              {form.city ? (
                <TextInput
                  label="City / locality"
                  value={form.city}
                  onChange={(e) => patch({ city: e.target.value })}
                  readOnly={readOnly && hasMaps}
                />
              ) : null}
              {form.administrative_area || form.state?.name ? (
                <TextInput
                  label="State / province / emirate"
                  value={
                    form.administrative_area ||
                    form.state?.name ||
                    form.state?.code ||
                    ""
                  }
                  onChange={(e) => {
                    const name = e.target.value;
                    patch({
                      administrative_area: name,
                      state: name ? { name } : null,
                    });
                  }}
                  readOnly={readOnly && hasMaps}
                />
              ) : null}
              {form.postal_code || form.postcode ? (
                <TextInput
                  label="Postal code"
                  value={form.postal_code || form.postcode}
                  onChange={(e) =>
                    patch({
                      postal_code: e.target.value,
                      postcode: e.target.value,
                    })
                  }
                  readOnly={readOnly && hasMaps}
                />
              ) : null}
              {form.country ? (
                <TextInput
                  label="Country"
                  value={
                    form.country_code
                      ? `${form.country} (${form.country_code})`
                      : form.country
                  }
                  readOnly
                />
              ) : null}
            </>
          ) : (
            <dl className="grid gap-2 text-sm sm:grid-cols-2">
              {(form.street_address || form.address_1) && (
                <div>
                  <dt className="text-xs text-muted">Street</dt>
                  <dd>{form.street_address || form.address_1}</dd>
                </div>
              )}
              {form.city ? (
                <div>
                  <dt className="text-xs text-muted">City</dt>
                  <dd>{form.city}</dd>
                </div>
              ) : null}
              {form.administrative_area || form.state?.name ? (
                <div>
                  <dt className="text-xs text-muted">Administrative area</dt>
                  <dd>
                    {form.administrative_area ||
                      form.state?.name ||
                      form.state?.code}
                  </dd>
                </div>
              ) : null}
              {form.postal_code || form.postcode ? (
                <div>
                  <dt className="text-xs text-muted">Postal code</dt>
                  <dd>{form.postal_code || form.postcode}</dd>
                </div>
              ) : null}
              {form.country ? (
                <div>
                  <dt className="text-xs text-muted">Country</dt>
                  <dd>
                    {form.country}
                    {form.country_code ? ` (${form.country_code})` : ""}
                  </dd>
                </div>
              ) : null}
              {requireCoordinates &&
              form.latitude !== "" &&
              form.latitude != null ? (
                <div className="sm:col-span-2">
                  <dt className="text-xs text-muted">Coordinates</dt>
                  <dd>
                    {String(form.latitude)}, {String(form.longitude)}
                  </dd>
                </div>
              ) : null}
            </dl>
          )}
        </div>
      ) : null}
    </div>
  );
}

/** @deprecated Prefer GoogleAddressAutocomplete */
export const GoogleAddress = GoogleAddressAutocomplete;
