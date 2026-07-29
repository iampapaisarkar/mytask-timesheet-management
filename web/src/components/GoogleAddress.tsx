import { useEffect, useId, useRef, useState } from "react";
import { useSystemStates } from "@mytask/hooks";
import { TextInput } from "@/components/ui/TextInput";

export type AddressValue = {
  address_1: string;
  address_2?: string;
  city: string;
  state: { id: number; name?: string; code?: string } | null;
  postcode: string;
  latitude: string | number | null;
  longitude: string | number | null;
};

const emptyAddress = (): AddressValue => ({
  address_1: "",
  address_2: "",
  city: "",
  state: null,
  postcode: "",
  latitude: "",
  longitude: "",
});

const selectClass =
  "mt-focus rounded-xl border border-border bg-[var(--mt-surface)] px-3.5 py-3 text-[var(--mt-text)] outline-none focus:border-primary";

declare global {
  interface Window {
    google?: {
      maps?: {
        places?: {
          Autocomplete: new (
            input: HTMLInputElement,
            opts?: {
              fields?: string[];
              componentRestrictions?: { country: string | string[] };
            },
          ) => {
            addListener: (event: string, handler: () => void) => void;
            getPlace: () => {
              formatted_address?: string;
              address_components?: Array<{
                long_name: string;
                short_name: string;
                types: string[];
              }>;
              geometry?: {
                location?: { lat: () => number; lng: () => number };
              };
            };
          };
        };
        event?: { clearInstanceListeners?: (instance: unknown) => void };
      };
    };
    __mtGoogleMapsPromise?: Promise<void>;
  }
}

function loadGoogleMaps(apiKey: string): Promise<void> {
  if (window.google?.maps?.places) return Promise.resolve();
  if (window.__mtGoogleMapsPromise) return window.__mtGoogleMapsPromise;

  window.__mtGoogleMapsPromise = new Promise((resolve, reject) => {
    const existing = document.querySelector<HTMLScriptElement>(
      "script[data-mt-google-maps]",
    );
    if (existing) {
      existing.addEventListener("load", () => resolve());
      existing.addEventListener("error", () =>
        reject(new Error("Failed to load Google Maps")),
      );
      return;
    }
    const script = document.createElement("script");
    script.src = `https://maps.googleapis.com/maps/api/js?key=${encodeURIComponent(apiKey)}&libraries=places`;
    script.async = true;
    script.dataset.mtGoogleMaps = "1";
    script.onload = () => resolve();
    script.onerror = () => reject(new Error("Failed to load Google Maps"));
    document.head.appendChild(script);
  });

  return window.__mtGoogleMapsPromise;
}

function component(
  components: Array<{
    long_name: string;
    short_name: string;
    types: string[];
  }>,
  type: string,
  short = false,
): string {
  const match = components.find((c) => c.types.includes(type));
  if (!match) return "";
  return short ? match.short_name : match.long_name;
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
    let autocomplete: {
      addListener: (event: string, handler: () => void) => void;
      getPlace: () => unknown;
    } | null = null;

    void loadGoogleMaps(apiKey)
      .then(() => {
        if (cancelled || !searchRef.current || !window.google?.maps?.places) {
          return;
        }
        setMapsReady(true);
        autocomplete = new window.google.maps.places.Autocomplete(
          searchRef.current,
          {
            fields: ["formatted_address", "address_components", "geometry"],
            componentRestrictions: { country: "au" },
          },
        );
        autocomplete.addListener("place_changed", () => {
          const place = autocomplete?.getPlace() as {
            formatted_address?: string;
            address_components?: Array<{
              long_name: string;
              short_name: string;
              types: string[];
            }>;
            geometry?: {
              location?: { lat: () => number; lng: () => number };
            };
          };
          const parts = place.address_components || [];
          const stateCode = component(
            parts,
            "administrative_area_level_1",
            true,
          );
          const stateList = statesRef.current || [];
          const matchedState =
            stateList.find(
              (s) =>
                (s as { code?: string }).code === stateCode ||
                s.name === component(parts, "administrative_area_level_1"),
            ) || null;
          onChangeRef.current({
            address_1: place.formatted_address || component(parts, "route") || "",
            address_2: "",
            city:
              component(parts, "locality") ||
              component(parts, "postal_town") ||
              "",
            state: matchedState
              ? {
                  id: matchedState.id,
                  name: matchedState.name,
                  code: (matchedState as { code?: string }).code,
                }
              : null,
            postcode: component(parts, "postal_code"),
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
            placeholder="Start typing (e.g. 100 George St…)"
            className={selectClass}
            autoComplete="off"
          />
          {mapsError ? (
            <span className="text-xs text-negative">{mapsError}</span>
          ) : !mapsReady ? (
            <span className="text-xs text-muted">Loading Google Places…</span>
          ) : null}
        </label>
      ) : (
        <p className="text-xs text-muted">
          Set <code className="text-[var(--mt-text)]">VITE_GOOGLE_MAPS_API_KEY</code>{" "}
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
      <div className="grid gap-3 sm:grid-cols-3">
        <TextInput
          label="City / Suburb"
          value={form.city}
          onChange={(e) => patch({ city: e.target.value })}
        />
        <label className="flex w-full flex-col gap-1.5 text-sm">
          <span className="font-medium text-[var(--mt-text)]">State</span>
          <select
            className={selectClass}
            value={form.state?.id ?? ""}
            onChange={(e) => {
              const id = Number(e.target.value);
              const matched = (states || []).find((s) => s.id === id) || null;
              patch({
                state: matched
                  ? {
                      id: matched.id,
                      name: matched.name,
                      code: (matched as { code?: string }).code,
                    }
                  : null,
              });
            }}
          >
            <option value="">Select state</option>
            {(states || []).map((s) => (
              <option key={s.id} value={s.id}>
                {s.name}
              </option>
            ))}
          </select>
        </label>
        <TextInput
          label="Postcode"
          value={form.postcode}
          onChange={(e) => patch({ postcode: e.target.value })}
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
