# Global address (Google Places)

## Component

Use `GoogleAddressAutocomplete` (`web/src/components/GoogleAddress.tsx`) everywhere an address is collected.

UX:

1. User sees a single Address search field.
2. Google Places suggestions appear (all countries — no AU lock).
3. On selection, structured fields populate automatically.
4. Details (street, city, region, postal, country, coords) show only after selection.

Payload fields:

- `formatted_address`, `street_address` / `address_1`, `city`
- `administrative_area` / `state`
- `postal_code` / `postcode`
- `country`, `country_code` (ISO-2)
- `place_id`, `latitude`, `longitude`

City / region / postal code are **optional** when Google does not return them for that country.

## Database

`organisation_address`, `employee_address`, `job_address`, and `customers` store global Place metadata (`formatted_address`, `administrative_area`, `country`, `country_code`, `place_id`, …).

## Config

`VITE_GOOGLE_MAPS_API_KEY` — enable **Maps JavaScript API** + **Places API**. Do not restrict the key to Australia.
