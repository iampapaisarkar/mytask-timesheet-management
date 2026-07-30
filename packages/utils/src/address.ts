/**
 * Canonical global address shape used by web, mobile, and API payloads.
 * Persistence layers map these to DB columns (see buildAddressRow).
 */
export type GlobalAddress = {
  /** Primary delivery line (number + street / premise) */
  address_line_1: string;
  /** Unit / suite / floor — optional */
  address_line_2: string;
  /** Street / road name */
  street: string;
  city: string;
  /** State / region / province / emirate */
  state_region_province: string;
  postal_code: string;
  country: string;
  /** ISO-3166 alpha-2 when known */
  country_code: string;
  /** Full Google-formatted string */
  formatted_address: string;
  place_id: string;
  /** Job (and optional) coordinates */
  latitude: string | number | null;
  longitude: string | number | null;
  /**
   * Legacy / API compatibility aliases — kept in sync by normalizeAddress.
   * Prefer the canonical fields above in new code.
   */
  address_1?: string;
  address_2?: string;
  street_address?: string;
  administrative_area?: string;
  postcode?: string;
  state?: { id?: number; name?: string; code?: string } | null;
};

export type GoogleAddressComponent = {
  long_name: string;
  short_name: string;
  types: string[];
};

export function emptyGlobalAddress(): GlobalAddress {
  return {
    address_line_1: "",
    address_line_2: "",
    street: "",
    city: "",
    state_region_province: "",
    postal_code: "",
    country: "",
    country_code: "",
    formatted_address: "",
    place_id: "",
    latitude: null,
    longitude: null,
    address_1: "",
    address_2: "",
    street_address: "",
    administrative_area: "",
    postcode: "",
    state: null,
  };
}

function component(
  components: GoogleAddressComponent[] | undefined,
  type: string,
  short = false,
): string {
  const match = components?.find((c) => c.types.includes(type));
  if (!match) return "";
  return short ? match.short_name : match.long_name;
}

/**
 * Parse Google Place address_components into the canonical GlobalAddress.
 * Missing components become empty strings — never assumed.
 */
export function parseGooglePlaceComponents(
  components: GoogleAddressComponent[] | undefined,
  extras?: {
    formatted_address?: string;
    place_id?: string;
    latitude?: number | string | null;
    longitude?: number | string | null;
  },
): GlobalAddress {
  const streetNumber = component(components, "street_number");
  const route = component(components, "route");
  const premise = component(components, "premise");
  const subpremise = component(components, "subpremise");
  const street = route || premise || "";
  const addressLine1 =
    [streetNumber, route].filter(Boolean).join(" ").trim() ||
    premise ||
    extras?.formatted_address ||
    "";
  const stateName =
    component(components, "administrative_area_level_1") ||
    component(components, "administrative_area_level_2");
  const stateCode = component(components, "administrative_area_level_1", true);
  const city =
    component(components, "locality") ||
    component(components, "postal_town") ||
    component(components, "sublocality") ||
    component(components, "administrative_area_level_2") ||
    "";
  const postal = component(components, "postal_code");
  const country = component(components, "country");
  const countryCode = component(components, "country", true);

  return normalizeAddress({
    address_line_1: addressLine1,
    address_line_2: subpremise,
    street: street || addressLine1,
    city,
    state_region_province: stateName || stateCode || "",
    postal_code: postal,
    country,
    country_code: countryCode,
    formatted_address: extras?.formatted_address || addressLine1,
    place_id: extras?.place_id || "",
    latitude: extras?.latitude ?? null,
    longitude: extras?.longitude ?? null,
    state:
      stateName || stateCode
        ? { name: stateName || stateCode, code: stateCode || undefined }
        : null,
  });
}

/**
 * Normalize partial / legacy payloads into a full GlobalAddress with aliases synced.
 */
export function normalizeAddress(
  input?: Partial<GlobalAddress> | Record<string, unknown> | null,
): GlobalAddress {
  const raw = (input || {}) as Record<string, unknown>;
  const line1 = String(
    raw.address_line_1 ??
      raw.street_address ??
      raw.address_1 ??
      raw.formatted_address ??
      "",
  );
  const line2 = String(raw.address_line_2 ?? raw.address_2 ?? "");
  const street = String(raw.street ?? raw.street_address ?? line1);
  const city = String(raw.city ?? "");
  const region = String(
    raw.state_region_province ??
      raw.administrative_area ??
      (typeof raw.state === "object" && raw.state
        ? (raw.state as { name?: string }).name ||
          (raw.state as { code?: string }).code ||
          ""
        : "") ??
      "",
  );
  const postal = String(raw.postal_code ?? raw.postcode ?? "");
  const country = String(raw.country ?? "");
  const countryCode = String(raw.country_code ?? "")
    .toUpperCase()
    .slice(0, 2);
  const formatted = String(raw.formatted_address ?? line1);
  const stateObj =
    raw.state && typeof raw.state === "object"
      ? (raw.state as GlobalAddress["state"])
      : region
        ? { name: region }
        : null;

  const lat =
    raw.latitude === "" || raw.latitude == null ? null : (raw.latitude as string | number);
  const lng =
    raw.longitude === "" || raw.longitude == null
      ? null
      : (raw.longitude as string | number);

  return {
    address_line_1: line1,
    address_line_2: line2,
    street,
    city,
    state_region_province: region,
    postal_code: postal,
    country,
    country_code: countryCode,
    formatted_address: formatted,
    place_id: String(raw.place_id ?? ""),
    latitude: lat,
    longitude: lng,
    address_1: line1,
    address_2: line2,
    street_address: street || line1,
    administrative_area: region,
    postcode: postal,
    state: stateObj,
  };
}

export function hasAddressContent(
  value?: Partial<GlobalAddress> | null,
): boolean {
  if (!value) return false;
  return Boolean(
    value.formatted_address?.trim() ||
      value.address_line_1?.trim() ||
      value.street?.trim() ||
      value.street_address?.trim() ||
      value.address_1?.trim() ||
      value.place_id?.trim(),
  );
}

/**
 * API / form payload: canonical fields + legacy aliases for backend BC.
 */
export function toAddressApiPayload(
  address: GlobalAddress,
  options?: { includeCoordinates?: boolean },
): Record<string, unknown> {
  const a = normalizeAddress(address);
  const payload: Record<string, unknown> = {
    address_line_1: a.address_line_1 || null,
    address_line_2: a.address_line_2 || null,
    street: a.street || null,
    city: a.city || null,
    state_region_province: a.state_region_province || null,
    postal_code: a.postal_code || null,
    country: a.country || null,
    country_code: a.country_code || null,
    formatted_address: a.formatted_address || null,
    place_id: a.place_id || null,
    // Legacy aliases
    address_1: a.address_line_1 || null,
    address_2: a.address_line_2 || null,
    street_address: a.street || a.address_line_1 || null,
    administrative_area: a.state_region_province || null,
    postcode: a.postal_code || null,
    state: a.state,
  };
  if (options?.includeCoordinates !== false) {
    payload.latitude = a.latitude;
    payload.longitude = a.longitude;
  }
  return payload;
}

/** Map a DB / API record into GlobalAddress. */
export function fromAddressRecord(
  record?: Record<string, unknown> | null,
): GlobalAddress {
  if (!record) return emptyGlobalAddress();
  return normalizeAddress({
    address_line_1:
      (record.address_line_1 as string) ||
      (record.address_1 as string) ||
      (record.street_address as string) ||
      "",
    address_line_2:
      (record.address_line_2 as string) || (record.address_2 as string) || "",
    street:
      (record.street as string) ||
      (record.street_address as string) ||
      (record.address_1 as string) ||
      "",
    city: (record.city as string) || "",
    state_region_province:
      (record.state_region_province as string) ||
      (record.administrative_area as string) ||
      "",
    postal_code:
      (record.postal_code as string) || (record.postcode as string) || "",
    country: (record.country as string) || "",
    country_code: (record.country_code as string) || "",
    formatted_address:
      (record.formatted_address as string) ||
      (record.address as string) ||
      "",
    place_id: (record.place_id as string) || "",
    latitude: (record.latitude as string | number | null) ?? null,
    longitude: (record.longitude as string | number | null) ?? null,
    state: record.state as GlobalAddress["state"],
  });
}
