import {
  parsePhoneNumberFromString,
  getCountries,
  getCountryCallingCode,
  isValidPhoneNumber,
  type CountryCode,
  type E164Number,
} from "libphonenumber-js";

/** Canonical phone payload stored / sent over the API. */
export type PhoneValue = {
  /** E.164, e.g. +14155552671 */
  phone_number: string | null;
  /** Dial code with +, e.g. +1 */
  phone_country_code: string | null;
  /** ISO 3166-1 alpha-2, e.g. US */
  phone_country_iso: string | null;
};

export const emptyPhoneValue = (): PhoneValue => ({
  phone_number: null,
  phone_country_code: null,
  phone_country_iso: null,
});

/** E.164: + followed by 8–15 digits. */
const E164_REGEX = /^\+[1-9]\d{7,14}$/;

export function isE164(value: string | null | undefined): boolean {
  if (!value) return false;
  return E164_REGEX.test(value.trim());
}

export function getDialCode(iso: string | null | undefined): string | null {
  if (!iso) return null;
  try {
    return `+${getCountryCallingCode(iso.toUpperCase() as CountryCode)}`;
  } catch {
    return null;
  }
}

/**
 * Build a PhoneValue from an E.164 string and optional ISO hint.
 * Prefer the country detected from the number when valid.
 */
export function phoneValueFromE164(
  e164: string | null | undefined,
  isoHint?: string | null,
): PhoneValue {
  const raw = (e164 || "").trim();
  if (!raw) return emptyPhoneValue();

  const parsed = parsePhoneNumberFromString(raw);
  if (parsed && parsed.isValid()) {
    const iso = parsed.country || (isoHint?.toUpperCase() as CountryCode) || null;
    return {
      phone_number: parsed.format("E.164"),
      phone_country_code: `+${parsed.countryCallingCode}`,
      phone_country_iso: iso || null,
    };
  }

  // Fallback: keep raw if already E.164-shaped + hint
  if (isE164(raw)) {
    const iso = isoHint?.toUpperCase() || null;
    return {
      phone_number: raw,
      phone_country_code: getDialCode(iso) || extractDialCodePrefix(raw),
      phone_country_iso: iso,
    };
  }

  return emptyPhoneValue();
}

function extractDialCodePrefix(e164: string): string | null {
  const digits = e164.replace(/^\+/, "");
  // Best-effort: try common lengths 1–3
  for (const len of [1, 2, 3]) {
    const candidate = digits.slice(0, len);
    const iso = getCountries().find(
      (c) => getCountryCallingCode(c) === candidate,
    );
    if (iso) return `+${candidate}`;
  }
  return e164.match(/^\+\d{1,3}/)?.[0] || null;
}

/** Normalize any input into PhoneValue fields for API/DB. */
export function normalizePhoneInput(input: {
  phone_number?: string | null;
  phone_country_code?: string | null;
  phone_country_iso?: string | null;
  /** Alias prefixes used on nested contacts */
}): PhoneValue {
  return phoneValueFromE164(
    input.phone_number,
    input.phone_country_iso,
  );
}

export function isValidInternationalPhone(
  value: string | null | undefined,
  defaultCountry?: string | null,
): boolean {
  const raw = (value || "").trim();
  if (!raw) return false;
  try {
    if (defaultCountry) {
      return isValidPhoneNumber(
        raw,
        defaultCountry.toUpperCase() as CountryCode,
      );
    }
    return isValidPhoneNumber(raw);
  } catch {
    return false;
  }
}

/** Human-readable international format without flag emoji. */
export function formatPhoneInternational(
  value: string | null | undefined,
): string {
  if (!value) return "";
  const parsed = parsePhoneNumberFromString(value.trim());
  if (parsed) return parsed.formatInternational();
  return value;
}

/** Flag emoji from ISO 3166-1 alpha-2 (e.g. US → 🇺🇸). */
export function countryFlagEmoji(iso: string | null | undefined): string {
  if (!iso || iso.length !== 2) return "";
  const code = iso.toUpperCase();
  return String.fromCodePoint(
    ...[...code].map((c) => 127397 + c.charCodeAt(0)),
  );
}

/**
 * Display phone with flag + international spacing.
 * Example: 🇮🇳 +91 98765 43210
 */
export function formatPhoneDisplay(
  phoneNumber: string | null | undefined,
  countryIso?: string | null,
): string {
  if (!phoneNumber) return "";
  const parsed = parsePhoneNumberFromString(phoneNumber.trim());
  const iso =
    parsed?.country ||
    (countryIso ? (countryIso.toUpperCase() as CountryCode) : undefined);
  const flag = countryFlagEmoji(iso || null);
  const formatted = parsed
    ? parsed.formatInternational()
    : phoneNumber.trim();
  return flag ? `${flag} ${formatted}` : formatted;
}

export function listCountryIsos(): CountryCode[] {
  return getCountries();
}

export type { CountryCode, E164Number };
