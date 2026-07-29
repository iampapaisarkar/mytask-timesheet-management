# Project Rules

1. **Backend APIs are contracts.** Do not change behaviour without documenting justification in `CHANGELOG.md`.
2. **Do not invent features** that cannot be inferred from the Vue build or backend.
3. **Share business logic** in `packages/`; never duplicate API/ACL/validation between web and mobile.
4. **No Redux.** Use Zustand + TanStack Query.
5. **No React Native Web.** Web is React+Vite; mobile is **React Native CLI** (never Expo).
6. **Strict TypeScript.** Avoid `any` unless unavoidable; document why.
7. **Feature-first UI folders** inside `web/src` and `mobile/src`.
8. **No API calls inside presentational components.**
9. **Always handle loading, empty, and error states.**
10. **Match original UX** (layout, colours, flows); improve only structure/quality.
11. **Update `MIGRATION_PROGRESS.md`** when a milestone completes.
12. **Secrets** stay in env files; never commit real credentials (service account keys already in backend — treat carefully).
13. Reference build folder is `origianl-frontend-vue-js/` (misspelled); do not rename casually (breaks paths/docs).
14. Prefer small modular files and composition.
15. Cursor rules live in `.cursor/rules/` (root) and each app’s `.cursor/rules/`; keep them accurate when architecture changes.
