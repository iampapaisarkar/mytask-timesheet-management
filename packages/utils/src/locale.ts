/**
 * Future-ready localization preferences.
 * Apps can persist these without refactoring phone / address layers.
 */
export type LocalePreferences = {
  /** BCP 47 language tag, e.g. en-US, hi-IN */
  locale: string;
  /** IANA timezone, e.g. America/New_York */
  timezone: string;
  /** ISO 4217 currency, e.g. USD, INR, AED */
  currency: string;
  /** Preferred country ISO for defaults (never restricts employees) */
  defaultCountryIso: string | null;
};

export function detectLocalePreferences(
  defaultCountryIso: string | null = null,
): LocalePreferences {
  let locale = "en-US";
  let timezone = "UTC";
  try {
    locale = Intl.DateTimeFormat().resolvedOptions().locale || locale;
    timezone = Intl.DateTimeFormat().resolvedOptions().timeZone || timezone;
  } catch {
    /* ignore */
  }
  const currencyGuess =
    locale.toUpperCase().includes("-IN")
      ? "INR"
      : locale.toUpperCase().includes("-GB")
        ? "GBP"
        : locale.toUpperCase().includes("-AU")
          ? "AUD"
          : locale.toUpperCase().includes("-AE")
            ? "AED"
            : "USD";
  return {
    locale,
    timezone,
    currency: currencyGuess,
    defaultCountryIso,
  };
}
