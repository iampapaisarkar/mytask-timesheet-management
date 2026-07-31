# Frontend Analysis (Vue/Quasar Build Recovery)

## Build location

`origianl-frontend-vue-js/` (misspelled “original”).

## Tech clues

- Quasar (`#q-app`, Quasar CSS vars, Q* components)
- Vue 3 + Vite production bundles
- Pinia (chunk `pinia-router-*.js`)
- Vue Router (hash or history — SPA with paths like `/login`, `/org/:orgCode`)
- Axios
- ApexCharts
- Google Maps
- Firebase Auth + Messaging (service workers)
- Ionicons / Font Awesome assets
- Capacitor deep links / Android assetlinks / Apple AASA present (mobile wrapper existed)

## App identity

- Title: **myTask**
- Description: “Time tracking and working log app”
- Primary colour: `--q-primary: #6900ff`
- Secondary: `#26a69a`, Accent: `#9c27b0`, Dark: `#1d272d`

## Entry assets (current `index.html`)

- JS: `/assets/index-CCUdSRjz.js` (~1.3MB)
- CSS: `/assets/index-BresuYRg.css` (~300KB)

Note: `assets/` contains many historical duplicate builds (~73MB). Treat `index.html` references as canonical.

## Layouts recovered

| Layout | Purpose |
|--------|---------|
| `AuthLayout` | Login, Signup, Forgot password, Auth actions, Org invitation |
| `MainLayout` | Authenticated non-org shell (home, profile) |
| `OrgLayout` | Org drawer: Home, My Timesheets, Timesheets (mgmt), Reports, Employees, Customers, Management Group, Jobs, Settings |

## Screens recovered

See `ROUTE_ANALYSIS.md` and `COMPONENT_ANALYSIS.md`.

## Auth UX

- Login: Email + Password; “I forgot my password”; link to Signup
- Title: “Log in to myTask”
- Firebase client auth → backend `/auth/login`

## Data patterns recovered

- List pages use `DataTable` + search + pagination (`sort_by`, `sort_direction`, `page`, `per_page`, `search`)
- Create/Edit via `MsDialog` modals
- Shared selects: `MsSelect`
- Address: `GoogleAddress`
- Timesheet statuses: Draft, Submitted, Approved, Rejected

## API base in build

Hardcoded/dev URL observed historically: `https://mytaskapi.iampapaisarkar.com.au/api` (configure via `VITE_API_BASE_URL` / mobile env).

## Limitations

Minified code obscures exact validation regexes, every form field rule, and some conditional UI. Gaps logged in `RECOVERY_NOTES.md`.
