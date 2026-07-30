import {
  currencyFromCountryIso,
  type SupportedCurrencyCode,
} from "@mytask/constants";

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
  currency: SupportedCurrencyCode | string;
  /** Preferred country ISO for phone / address defaults (never restricts employees) */
  defaultCountryIso: string | null;
};

/** Extract region subtag from a BCP 47 locale (en-IN → IN, en-US → US). */
export function regionFromLocale(locale: string | null | undefined): string | null {
  if (!locale) return null;
  const parts = locale.replace("_", "-").split("-");
  for (let i = parts.length - 1; i >= 1; i -= 1) {
    const part = parts[i];
    if (/^[A-Za-z]{2}$/.test(part)) return part.toUpperCase();
    if (/^[A-Za-z]{3}$/.test(part) && part.toUpperCase() === "419") continue;
  }
  return null;
}

/**
 * Detect browser/device locale preferences for phone country + currency defaults.
 * Pass an explicit country ISO (e.g. org.default_country) to override the locale guess.
 */
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

  const fromLocale = regionFromLocale(locale);
  const country =
    (defaultCountryIso && defaultCountryIso.length === 2
      ? defaultCountryIso.toUpperCase()
      : null) || fromLocale;

  const currency = currencyFromCountryIso(country);

  return {
    locale,
    timezone,
    currency,
    defaultCountryIso: country,
  };
}
