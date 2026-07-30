import { useMemo } from "react";
import type { Country } from "react-phone-number-input";
import { detectLocalePreferences } from "@mytask/utils";
import type { SupportedCurrencyCode } from "@mytask/constants";

/**
 * Browser locale → phone country ISO + currency defaults.
 * Pass org.default_country to prefer organisation country over browser.
 */
export function useLocaleDefaults(orgCountryIso?: string | null) {
  return useMemo(() => {
    const prefs = detectLocalePreferences(orgCountryIso || null);
    const country = (prefs.defaultCountryIso || "US") as Country;
    return {
      locale: prefs.locale,
      timezone: prefs.timezone,
      currency: prefs.currency as SupportedCurrencyCode,
      defaultCountry: country,
      defaultCountryIso: prefs.defaultCountryIso,
    };
  }, [orgCountryIso]);
}
