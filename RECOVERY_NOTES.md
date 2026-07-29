# Recovery Notes

## What was reliably recovered

- Full backend REST surface and middleware contracts
- Vue Router path tree, ACL meta, layouts
- Org drawer menu labels and ACL action keys
- Quasar theme primary `#6900ff` and semantic colours
- Auth flow: Firebase ID token → backend session
- Org header names
- Response `info` envelope
- Timesheet status labels
- Major form field labels for CRUD entities
- Firebase web config (dev) from service worker
- Presence of Socket.IO, FCM, Google Maps, ApexCharts, Xero

## Folder naming

The reference build directory is **`origianl-frontend-vue-js`** (typo). Docs and scripts should use this path. Optional later rename to `original-frontend-vue-js` with redirects in docs.

## What could not be fully recovered

| Gap | Mitigation |
|-----|------------|
| Exact Zod-level validation rules (regex, min/max) | Infer from backend validation + visible “Please enter …” messages; tighten when API errors reveal rules |
| Pixel-perfect spacing for every screen | Match Quasar defaults + purple primary; iterate visually against screenshots if provided |
| All Pinia store shapes | Recreate as Zustand stores guided by API payloads |
| Complete employee wizard step order edge cases | Follow backend model fields + multi-step chunk structure |
| Capacitor native plugin config | Rebuild with React Native CLI packages (notifications, AsyncStorage/Keychain, location) |
| Duplicate historical bundles in `assets/` | Ignore; use `index.html` entry only |
| GraphQL UI usage | None — GraphQL disabled server-side |
| Soft-deleted / unused routes | Only implement routes present in router config |

## Assumptions (documented)

1. History mode paths (not hash) — rebuild with browser history on web.
2. Token refresh = Firebase SDK refresh → retry request; backend session may need re-`/auth/login` if session expired.
3. Pagination query params follow patterns seen in system store: `sort_by`, `sort_direction`, `page`, `per_page`, `search`.
4. Mobile feature parity is goal; some settings-heavy tables may be simplified UI but same APIs.

## When blocked

Prefer closest practical implementation + note here rather than inventing product behaviour.
