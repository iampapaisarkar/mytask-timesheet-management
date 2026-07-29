# Mobile API Usage

Initialize once in `App.tsx` via `createApiClient` from `@mysheet/api`.

Set `ENV.API_BASE_URL` and Firebase fields in `src/config/env.ts`.

Tokens are read from Zustand (`authStore`); org headers from `organisationStore`.
