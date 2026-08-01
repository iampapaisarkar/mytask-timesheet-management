# Mobile Styling

StyleSheet + design tokens from `@mytask/theme` and `src/ui`.

## Tokens

| Token | Source | Notes |
|-------|--------|-------|
| Colors | `useThemeStore().colors` | Semantic palette incl. soft/text status tones |
| Spacing / radii / typography | `@mytask/theme` | Also exposed via `ui` |
| Elevation / motion / opacity / touch targets | `src/ui/tokens` | Platform shadows + spring presets |
| Status visuals | `statusVisual()` / `StatusBadge` | Never render raw status strings alone |

## Principles

- Soft elevated white cards on `#F8F9FB` (light) / deep teal-black (dark)
- Primary accent `#04B6B1`
- Prefer shared components from `src/ui` over one-off StyleSheets
- Min touch target 44pt
- Tasteful Reanimated springs — nothing excessive
