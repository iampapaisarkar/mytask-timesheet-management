import parsePhoneNumberFromString from "libphonenumber-js/min";
import { isValidPhoneNumber } from "libphonenumber-js/min";

function phoneError(message, status = 400) {
  const err = new Error(message);
  err.status = status;
  err.statusCode = status;
  return err;
}

/**
 * Normalize and validate international phone payloads.
 * Always stores E.164 in phone_number.
 */
export function resolvePhoneFields({
  phone_number,
  phone_country_code,
  phone_country_iso,
  required = false,
  label = "Phone number",
} = {}) {
  const raw = typeof phone_number === "string" ? phone_number.trim() : "";

  if (!raw) {
    if (required) {
      throw phoneError(`${label} is required!`);
    }
    return {
      phone_number: null,
      phone_country_code: null,
      phone_country_iso: null,
    };
  }

  const hintIso =
    typeof phone_country_iso === "string" && phone_country_iso.length === 2
      ? phone_country_iso.toUpperCase()
      : undefined;

  let parsed = null;
  try {
    parsed = parsePhoneNumberFromString(raw, hintIso);
  } catch {
    parsed = null;
  }

  const e164 = parsed?.number || (raw.startsWith("+") ? raw : null);

  if (!e164 || !isValidPhoneNumber(e164)) {
    throw phoneError(
      `${label} must be a valid international number in E.164 format (e.g. +14155552671).`,
    );
  }

  const iso = parsed?.country || hintIso || null;
  const dial =
    parsed?.countryCallingCode != null
      ? `+${parsed.countryCallingCode}`
      : typeof phone_country_code === "string" && phone_country_code
        ? phone_country_code.startsWith("+")
          ? phone_country_code
          : `+${phone_country_code}`
        : null;

  return {
    phone_number: e164,
    phone_country_code: dial,
    phone_country_iso: iso,
  };
}
