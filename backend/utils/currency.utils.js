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

export const DEFAULT_CURRENCY = "AUD";

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

export default {
  DEFAULT_CURRENCY,
  normalizeCurrency,
  assertSupportedCurrency,
};
