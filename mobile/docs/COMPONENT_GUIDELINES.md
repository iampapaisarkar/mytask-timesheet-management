# Mobile Components

Shared UI lives in `src/ui` (design system) and `src/components` (feature widgets).

## Design system (`src/ui`)

| Component | Use for |
|-----------|---------|
| `Button` | Primary / secondary / outline / ghost / danger / soft actions |
| `Card` | Elevated surfaces; optional press + accent border |
| `StatusBadge` | Approved / pending / rejected / active / paid chips |
| `FilterChips` | Horizontal status / category filters |
| `EmptyState` / `ErrorState` | List & screen empty / error UX |
| `Avatar` | Initials avatar for people |
| `TextField` | Labeled inputs with helper / error |
| `SectionHeader` / `ScreenHeader` | Hierarchy titles |
| `ListTile` | Settings / More menu rows |
| `StatCard` | Dashboard KPI tiles |
| `IconButton` / `QuickAction` | Icon-only / dashboard shortcuts |
| `Dialog` | Confirm / delete dialogs |
| `ProgressBar` | Linear progress |
| `SegmentedControl` | Tab segments (Sheets / Timeline / Map) |
| `AppBottomSheet` | Forms & pickers |
| `Screen` | Safe-area shell |

Import from `../ui` (or `src/ui`). Prefer these over ad-hoc `TouchableOpacity` buttons and bordered Views.

## Phone numbers

Use `GlobalPhoneInput` from `src/components/GlobalPhoneInput.tsx` for every phone field. Display with `formatPhoneDisplay` from `@mytask/utils`.

## Theme

```ts
const c = useThemeStore((s) => s.colors);
```

Do not hard-code status hex values — use `StatusBadge` or `statusVisual(c, status)`.
