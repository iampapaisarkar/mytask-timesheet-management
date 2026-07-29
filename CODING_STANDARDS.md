# Coding Standards

## TypeScript

- `strict: true` in all packages/apps
- Prefer `type` for unions; `interface` for object shapes extended by consumers
- Export types from `packages/types`
- Zod schemas are the runtime source of truth for forms; infer types with `z.infer`

## Naming

- Components: `PascalCase`
- Hooks: `useCamelCase`
- Files: match primary export
- API modules: `resource.api.ts`
- Zustand stores: `useAuthStore.ts`

## React

- Function components only
- Prefer controlled forms via RHF
- Colocate feature UI under `features/<name>/`
- Shared primitives under `components/ui/`

## Async / data

- All server reads/writes via React Query hooks wrapping `packages/api`
- Central Axios error normalisation → typed `ApiError`
- Retry: idempotent GETs only

## Styling

- **Web:** Tailwind + CSS variables mapped to theme tokens
- **Mobile:** StyleSheet / theme tokens from `packages/theme`
- Primary brand colour from original Quasar: `#6900ff`

## Git

- Commit only when asked
- Do not commit `.env` secrets or enlarge diffs with unrelated formatting
