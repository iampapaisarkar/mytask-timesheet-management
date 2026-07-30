# Currency & locale defaults

## Why the dashboard showed AUD

`formatMoney()` previously fell back to a hard-coded default currency when the
dashboard did not pass one. Aggregated payroll KPIs now return
`display_currency` from the API and convert amounts into that currency.

## Organisation reporting currency

Each organisation has `default_currency` (ISO 4217).

Resolution order:

1. `organisations.default_currency`
2. From `default_country` / `phone_country_iso` (US→USD, IN→INR, AU→AUD, …)
3. Fallback `USD`

**Admin / manager dashboards** convert multi-employee payouts into the org
reporting currency.

**Staff dashboards** use the employee’s own wage currency.

Employee wage currencies stay independent — only aggregated views convert.

## Google currency API?

**Google does not provide an official public Currency Conversion API.**

- `GOOGLEFINANCE` works only inside Google Sheets and is not for server apps.
- Unofficial Google Finance scrapers are brittle and not production-safe.

### What myTask uses

| Endpoint | Purpose |
|----------|---------|
| `GET /api/system/exchange-rates` | USD-based mid-market rates (cached ~1h) |
| `GET /api/system/convert-currency?amount=&from=&to=` | Convert one amount |

Providers (no API key):

1. **Frankfurter** (ECB) — https://www.frankfurter.app/
2. Fallback: **open.er-api.com**

Rates are for **reporting display only**, not bank settlement.

## Phone + currency defaults

`detectLocalePreferences()` / `useLocaleDefaults()` read the browser/device
locale region (e.g. `en-IN` → `IN` → `INR`, `+91`).

`GlobalPhoneInput` defaults to that country when no `defaultCountry` is passed.

Org create/update sets `default_currency` from the phone/address country.
Settings → Organisation details lets owners change reporting currency.
