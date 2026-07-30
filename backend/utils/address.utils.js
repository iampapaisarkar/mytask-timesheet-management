/**
 * Build DB row fields for organisation / employee / job address tables
 * from a Places-parsed address payload (global, any country).
 *
 * Writes canonical columns + legacy aliases for backward compatibility.
 * Coordinates are included only when `includeCoordinates` is true (jobs).
 */
export function buildAddressRow(
  address,
  { organisationId, extra = {}, includeCoordinates = true } = {},
) {
  if (!address) return null;

  const line1 =
    address.address_line_1 ||
    address.street_address ||
    address.address_1 ||
    address.formatted_address ||
    null;
  const line2 = address.address_line_2 || address.address_2 || null;
  const street = address.street || address.street_address || line1 || null;
  const admin =
    address.state_region_province ||
    address.administrative_area ||
    address.state?.name ||
    address.state?.code ||
    null;
  const postal =
    address.postal_code || address.postcode || null;

  const row = {
    organisation_id: organisationId,
    // Canonical
    address_line_1: line1,
    address_line_2: line2,
    street,
    city: address.city || null,
    state_region_province: admin,
    postal_code: postal != null ? String(postal) : null,
    // Legacy aliases (kept in sync)
    address_1: line1,
    address_2: line2,
    postcode: postal != null ? String(postal) : null,
    formatted_address: address.formatted_address || line1,
    administrative_area: admin,
    country: address.country || null,
    country_code: address.country_code
      ? String(address.country_code).toUpperCase().slice(0, 2)
      : null,
    place_id: address.place_id || null,
    ...extra,
  };

  if (includeCoordinates) {
    row.latitude =
      address.latitude === "" || address.latitude == null
        ? null
        : address.latitude;
    row.longitude =
      address.longitude === "" || address.longitude == null
        ? null
        : address.longitude;
  } else {
    row.latitude = null;
    row.longitude = null;
  }

  return row;
}

/**
 * Soft global validation: require a Places-selected / street line.
 * City, admin area, and postal code are optional (country-dependent).
 */
export function assertAddressSelected(
  address,
  { requireCoordinates = false } = {},
) {
  const street =
    address?.address_line_1 ||
    address?.street ||
    address?.street_address ||
    address?.address_1 ||
    address?.formatted_address;
  if (!street || !String(street).trim()) {
    const err = new Error(
      "Please select an address from Google Places suggestions.",
    );
    err.status = 400;
    throw err;
  }
  if (requireCoordinates) {
    if (address.latitude === "" || address.latitude == null) {
      const err = new Error("Address latitude is required.");
      err.status = 400;
      throw err;
    }
    if (address.longitude === "" || address.longitude == null) {
      const err = new Error("Address longitude is required.");
      err.status = 400;
      throw err;
    }
  }
}

/**
 * Flatten nested or top-level address fields for customer-style embeds.
 */
export function resolveCustomerAddressFields(body = {}) {
  const address =
    typeof body.address === "object" && body.address ? body.address : {};
  const line1 =
    body.address_line_1 ||
    address.address_line_1 ||
    address.street_address ||
    address.address_1 ||
    body.formatted_address ||
    address.formatted_address ||
    (typeof body.address === "string" ? body.address : null) ||
    null;
  const line2 =
    body.address_line_2 || address.address_line_2 || address.address_2 || null;
  const street = body.street || address.street || line1;
  const admin =
    body.state_region_province ||
    address.state_region_province ||
    body.administrative_area ||
    address.administrative_area ||
    null;
  const postal =
    body.postal_code ||
    address.postal_code ||
    address.postcode ||
    null;
  const formatted =
    body.formatted_address || address.formatted_address || line1;

  return {
    address: formatted,
    formatted_address: formatted,
    address_line_1: line1,
    address_line_2: line2,
    street,
    city: body.city || address.city || null,
    state_region_province: admin,
    administrative_area: admin,
    postal_code: postal != null ? String(postal) : null,
    country: body.country || address.country || null,
    country_code: body.country_code || address.country_code || null,
    place_id: body.place_id || address.place_id || null,
    // Customers do not persist coordinates
    latitude: null,
    longitude: null,
  };
}
