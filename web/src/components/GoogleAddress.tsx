import { useEffect, useId, useRef, useState } from "react";
import { useSystemStates } from "@mytask/hooks";
import { TextInput } from "@/components/ui/TextInput";
import {
  hasGooglePlaces,
  loadGoogleMaps,
  type GoogleAutocomplete,
  type GooglePlaceComponents,
} from "@/lib/googleMaps";

export type AddressValue = {
  address_1: string;
  address_2?: string;
  city: string;
  /** Region / state / province — id optional; backend upserts by name when missing */
  state: { id?: number; name?: string; code?: string } | null;
  postcode: string;
  country?: string;
  latitude: string | number | null;
  longitude: string | number | null;
};

const emptyAddress = (): AddressValue => ({
  address_1: "",
  address_2: "",
  city: "",
  state: null,
  postcode: "",
  country: "",
  latitude: "",
  longitude: "",
});

const selectClass =
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
  if (!stateList?.length) return null;
  const byName = stateList.find(
    (s) => s.name.toLowerCase() === name.toLowerCase(),
  );
  if (byName) return byName;
  if (!code) return null;
  return (
    stateList.find(
      (s) =>
        (s.code || "").toLowerCase() === code.toLowerCase() &&
        s.name.toLowerCase() === name.toLowerCase(),
    ) || null
  );
}

export function GoogleAddress({
  value,
  onChange,
  requireCoordinates = true,
  className,
}: {
  value?: Partial<AddressValue> | null;
  onChange: (next: AddressValue) => void;
  requireCoordinates?: boolean;
  className?: string;
}) {
  const apiKey = import.meta.env.VITE_GOOGLE_MAPS_API_KEY as string | undefined;
  const hasMaps = Boolean(apiKey?.trim());
  const searchId = useId();
  const regionListId = useId();
  const searchRef = useRef<HTMLInputElement>(null);
  const form: AddressValue = { ...emptyAddress(), ...(value || {}) };
  const { data: states } = useSystemStates();
  const [mapsReady, setMapsReady] = useState(false);
  const [mapsError, setMapsError] = useState<string | null>(null);

  function patch(partial: Partial<AddressValue>) {
    onChange({ ...form, ...partial });
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
          fields: ["formatted_address", "address_components", "geometry"],
          types: ["address"],
        });

        const instance = autocomplete;
        instance.addListener("place_changed", () => {
          const place = instance.getPlace();
          if (!place?.address_components?.length) {
            return;
          }
          const parts = place.address_components;
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

          const street = buildStreetLine(parts);
          onChangeRef.current({
            address_1: street || place.formatted_address || "",
            address_2: "",
            city:
              component(parts, "locality") ||
              component(parts, "postal_town") ||
              component(parts, "sublocality") ||
              component(parts, "administrative_area_level_2") ||
              "",
            state: stateName || stateCode
              ? matchedState
                ? {
                    id: matchedState.id,
                    name: matchedState.name,
                    code: matchedState.code,
                  }
                : { name: stateName || stateCode, code: stateCode || undefined }
              : null,
            postcode: component(parts, "postal_code"),
            country: component(parts, "country"),
            latitude: place.geometry?.location?.lat() ?? "",
            longitude: place.geometry?.location?.lng() ?? "",
          });
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

  const regionValue = form.state?.name || form.state?.code || "";

  return (
    <div className={className ?? "flex flex-col gap-3"}>
      {hasMaps ? (
        <label className="flex w-full flex-col gap-1.5 text-sm">
          <span className="font-medium text-[var(--mt-text)]">
            Search address
          </span>
          <input
            ref={searchRef}
            id={searchId}
            type="text"
            placeholder="Start typing any address worldwide…"
            className={selectClass}
            autoComplete="off"
          />
          {mapsError ? (
            <span className="text-xs text-negative">{mapsError}</span>
          ) : !mapsReady ? (
            <span className="text-xs text-muted">Loading Google Places…</span>
          ) : (
            <span className="text-xs text-muted">
              Pick a suggestion to fill the fields below (worldwide).
            </span>
          )}
        </label>
      ) : (
        <p className="text-xs text-muted">
          Set{" "}
          <code className="text-[var(--mt-text)]">VITE_GOOGLE_MAPS_API_KEY</code>{" "}
          for address autocomplete. Enter address manually below.
        </p>
      )}

      <TextInput
        label="Address Line 1"
        value={form.address_1}
        onChange={(e) => patch({ address_1: e.target.value })}
      />
      <TextInput
        label="Address Line 2"
        value={form.address_2 || ""}
        onChange={(e) => patch({ address_2: e.target.value })}
      />
      <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
        <TextInput
          label="City"
          value={form.city}
          onChange={(e) => patch({ city: e.target.value })}
        />
        <label className="flex w-full flex-col gap-1.5 text-sm">
          <span className="font-medium text-[var(--mt-text)]">
            State / Province / Region
          </span>
          <input
            list={regionListId}
            className={selectClass}
            value={regionValue}
            placeholder="e.g. California, NSW, Ontario"
            onChange={(e) => {
              const name = e.target.value;
              const matched = (states || []).find(
                (s) => s.name.toLowerCase() === name.toLowerCase(),
              );
              patch({
                state: name
                  ? matched
                    ? {
                        id: matched.id,
                        name: matched.name,
                        code: (matched as { code?: string }).code,
                      }
                    : { name }
                  : null,
              });
            }}
          />
          <datalist id={regionListId}>
            {(states || []).map((s) => (
              <option key={s.id} value={s.name} />
            ))}
          </datalist>
        </label>
        <TextInput
          label="Postcode / ZIP"
          value={form.postcode}
          onChange={(e) => patch({ postcode: e.target.value })}
        />
        <TextInput
          label="Country"
          value={form.country || ""}
          onChange={(e) => patch({ country: e.target.value })}
        />
      </div>

      {requireCoordinates ? (
        <div className="grid gap-3 sm:grid-cols-2">
          <TextInput
            label="Latitude"
            type="number"
            step="any"
            value={form.latitude ?? ""}
            onChange={(e) => patch({ latitude: e.target.value })}
          />
          <TextInput
            label="Longitude"
            type="number"
            step="any"
            value={form.longitude ?? ""}
            onChange={(e) => patch({ longitude: e.target.value })}
          />
        </div>
      ) : null}
    </div>
  );
}
