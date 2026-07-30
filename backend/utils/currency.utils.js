const SUPPORTED = new Set([
  "USD",
  "AUD",
  "INR",
  "GBP",
  "EUR",
  "NZD",
  "CAD",
  "SGD",
]);

/** Last-resort when country cannot be resolved. Prefer country / org default. */
export const DEFAULT_CURRENCY = "USD";

const COUNTRY_TO_CURRENCY = {
  US: "USD",
  IN: "INR",
  AU: "AUD",
  GB: "GBP",
  NZ: "NZD",
  CA: "CAD",
  SG: "SGD",
  IE: "EUR",
  DE: "EUR",
  FR: "EUR",
  NL: "EUR",
  ES: "EUR",
  IT: "EUR",
  PT: "EUR",
  BE: "EUR",
  AT: "EUR",
  FI: "EUR",
  LU: "EUR",
  GR: "EUR",
};

export function currencyFromCountryIso(countryIso, fallback = DEFAULT_CURRENCY) {
  if (!countryIso || typeof countryIso !== "string") return fallback;
  const key = countryIso.trim().toUpperCase();
  return COUNTRY_TO_CURRENCY[key] || fallback;
}

export function normalizeCurrency(code, fallback = DEFAULT_CURRENCY) {
  if (!code || typeof code !== "string") return fallback;
  const upper = code.trim().toUpperCase();
  return SUPPORTED.has(upper) ? upper : fallback;
}

export function assertSupportedCurrency(code) {
  const normalized = normalizeCurrency(code, null);
  if (!normalized) {
    const err = new Error(
      "Currency must be one of: USD, AUD, INR, GBP, EUR, NZD, CAD, SGD",
    );
    err.statusCode = 400;
    throw err;
  }
  return normalized;
}

/** Org reporting currency for dashboards (employees keep their own wage currency). */
export function resolveOrganisationDisplayCurrency(organisation) {
  return normalizeCurrency(
    organisation?.default_currency ||
      currencyFromCountryIso(
        organisation?.default_country || organisation?.phone_country_iso,
      ),
  );
}

export default {
  DEFAULT_CURRENCY,
  currencyFromCountryIso,
  normalizeCurrency,
  assertSupportedCurrency,
  resolveOrganisationDisplayCurrency,
};
