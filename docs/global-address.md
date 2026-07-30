# Global address (Google Places)

## Shared model

Canonical fields (web, mobile, API):

| Field | Description |
| --- | --- |
| `address_line_1` | Primary delivery line |
| `address_line_2` | Unit / suite (optional) |
| `street` | Street / road name |
| `city` | City / locality |
| `state_region_province` | State / region / province / emirate |
| `postal_code` | Postal / ZIP code |
| `country` / `country_code` | Country name + ISO-2 |
| `formatted_address` / `place_id` | Google Place metadata |
| `latitude` / `longitude` | **Jobs only** (persisted) |

Legacy aliases (`address_1`, `street_address`, `administrative_area`, `postcode`) remain accepted and synced for backward compatibility.

Shared helpers live in `@mytask/utils` (`parseGooglePlaceComponents`, `normalizeAddress`, `toAddressApiPayload`, `fromAddressRecord`).

## Web component

Use `GoogleAddressAutocomplete` / `AddressForm` (`web/src/components/GoogleAddress.tsx`) everywhere an address is collected.

UX:

1. Single Places search (all countries — no AU lock).
2. On selection, **all** structured fields populate and stay **editable**.
3. Optional `showMap` embeds `MapLocationPicker` (lazy-loaded):
   - Requests current location on first open (permission).
   - Falls back to a safe default if denied / unavailable.
   - Pin drag / map click reverse-geocodes **all** fields (debounced).
4. `requireCoordinates` shows editable lat/lng (jobs).

## Database

Migration `1785800000000-normalize-global-address-columns` adds canonical columns to:

- `organisation_address`, `employee_address`, `job_address`
- `customers`

Legacy columns are backfilled and kept in sync by `buildAddressRow`. Non-job writes clear stored coordinates.

## Config

`VITE_GOOGLE_MAPS_API_KEY` — enable **Maps JavaScript API** + **Places API** (+ Geocoding). Do not restrict the key to Australia.

## Mobile

No Places address forms yet. Shared address helpers are available via `@mytask/utils` for future screens; do not duplicate parsers on mobile.
