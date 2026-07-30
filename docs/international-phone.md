# International phone & globalization

## Phone storage

All phone numbers are stored in **E.164** (`+14155552671`) plus metadata:

| Field | Example |
|---|---|
| `phone_number` | `+919876543210` |
| `phone_country_code` | `+91` |
| `phone_country_iso` | `IN` |

Tables: `users`, `organisations` (+ optional `default_country`), `employees` (primary + NOK), `customers` (`contact_phone_*`), `jobs` (`site_contact_phone_*`).

Employees are **never** restricted by the organisation admin’s country.

## Shared UI

- Web: `web/src/components/ui/GlobalPhoneInput.tsx` (`react-phone-number-input` + `libphonenumber-js`)
- Mobile: `mobile/src/components/GlobalPhoneInput.tsx` (country picker + `libphonenumber-js`)
- Utils: `@mytask/utils` (`phoneValueFromE164`, `formatPhoneDisplay`, `isValidInternationalPhone`, …)

Use `GlobalPhoneInput` for every phone field. Display with `formatPhoneDisplay` / `GlobalPhoneDisplay`.

## API

Create/update payloads must send the three phone fields. Backend validates via `backend/utils/phone.js` (`resolvePhoneFields`).

Employee list filters: `phone_country_iso`, `phone_country_code`, `region_id`.

## Future-ready locale

`detectLocalePreferences()` in `@mytask/utils` prepares locale / timezone / currency / default country without coupling forms to a single region.
