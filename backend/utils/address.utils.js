/**
 * Build DB row fields for organisation / employee / job address tables
 * from a Places-parsed address payload (global, any country).
 */
export function buildAddressRow(address, { organisationId, extra = {} } = {}) {
  if (!address) return null;

  const street =
    address.street_address ||
    address.address_1 ||
    address.formatted_address ||
    null;
  const admin =
    address.administrative_area ||
    address.state?.name ||
    address.state?.code ||
    null;
  const postal = address.postal_code || address.postcode || null;

  return {
    organisation_id: organisationId,
    address_1: street,
    address_2: address.address_2 || null,
    city: address.city || null,
    postcode: postal != null ? String(postal) : null,
    formatted_address: address.formatted_address || street,
    administrative_area: admin,
    country: address.country || null,
    country_code: address.country_code
      ? String(address.country_code).toUpperCase().slice(0, 2)
      : null,
    place_id: address.place_id || null,
    latitude:
      address.latitude === "" || address.latitude == null
        ? null
        : address.latitude,
    longitude:
      address.longitude === "" || address.longitude == null
        ? null
        : address.longitude,
    ...extra,
  };
}

/**
 * Soft global validation: require a Places-selected / street line.
 * City, admin area, and postal code are optional (country-dependent).
 */
export function assertAddressSelected(address, { requireCoordinates = false } = {}) {
  const street =
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
