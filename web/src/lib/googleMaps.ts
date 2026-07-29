export type GooglePlaceComponents = Array<{
  long_name: string;
  short_name: string;
  types: string[];
}>;

export type GoogleAutocomplete = {
  addListener: (event: string, handler: () => void) => void;
  getPlace: () => {
    formatted_address?: string;
    address_components?: GooglePlaceComponents;
    geometry?: {
      location?: { lat: () => number; lng: () => number };
    };
  };
};

export type GooglePlacesNs = {
  Autocomplete: new (
    input: HTMLInputElement,
    opts?: {
      fields?: string[];
      types?: string[];
    },
  ) => GoogleAutocomplete;
};

declare global {
  interface Window {
    google?: {
      maps?: {
        places?: GooglePlacesNs;
        event?: { clearInstanceListeners?: (instance: unknown) => void };
      };
    };
    __mtGoogleMapsPromise?: Promise<void>;
    gm_authFailure?: () => void;
  }
}

/**
 * Loads the Maps JS API once, always with the Places library.
 * Shared by address autocomplete and tracking maps so a map-first load
 * cannot leave Places unavailable.
 */
export function loadGoogleMaps(apiKey: string): Promise<void> {
  if (window.google?.maps?.places?.Autocomplete) {
    return Promise.resolve();
  }

  if (window.__mtGoogleMapsPromise) {
    return window.__mtGoogleMapsPromise.then(() => {
      if (!window.google?.maps?.places?.Autocomplete) {
        throw new Error(
          "Google Places library failed to load. Enable Places API (and Maps JavaScript API) for this key in Google Cloud Console.",
        );
      }
    });
  }

  window.__mtGoogleMapsPromise = new Promise((resolve, reject) => {
    const existing = document.querySelector<HTMLScriptElement>(
      "script[data-mt-google-maps]",
    );
    if (existing) {
      existing.addEventListener("load", () => {
        if (window.google?.maps?.places?.Autocomplete) resolve();
        else
          reject(
            new Error(
              "Google Places library unavailable after script load. Enable Places API for this key.",
            ),
          );
      });
      existing.addEventListener("error", () =>
        reject(new Error("Failed to load Google Maps script")),
      );
      return;
    }

    const prevAuthFailure = window.gm_authFailure;
    window.gm_authFailure = () => {
      prevAuthFailure?.();
      reject(
        new Error(
          "Google Maps API key rejected (billing, referrer restriction, or APIs not enabled).",
        ),
      );
    };

    const script = document.createElement("script");
    script.src = `https://maps.googleapis.com/maps/api/js?key=${encodeURIComponent(
      apiKey,
    )}&libraries=places&v=weekly`;
    script.async = true;
    script.defer = true;
    script.dataset.mtGoogleMaps = "1";
    script.onload = () => {
      if (window.google?.maps?.places?.Autocomplete) resolve();
      else
        reject(
          new Error(
            "Google Places library unavailable. Enable Places API for this key.",
          ),
        );
    };
    script.onerror = () =>
      reject(new Error("Failed to load Google Maps script"));
    document.head.appendChild(script);
  });

  return window.__mtGoogleMapsPromise;
}

export function hasGooglePlaces(): boolean {
  return Boolean(window.google?.maps?.places?.Autocomplete);
}
