# Styling guide (Web)

Tailwind v4 with `@theme` tokens. Primary **`#04B6B1`**.

## Theme

- Light/dark via `html.dark` CSS variables (`--mt-*`)
- Persist preference in `localStorage` (`mytask.theme`)
- Toggle: header / auth header (`ThemeToggle`)

## Tokens

| Token | Usage |
|-------|--------|
| `primary` | Buttons, links, active nav, focus |
| `page` / `surface` | Background / elevated surfaces |
| `muted` / `border` | Secondary text / dividers |

## Components

Prefer shared UI under `web/src/components/ui/` (`Button`, `TextInput`, `Card`, skeletons, toasts).

## Motion

Subtle transitions: `.mt-fade-in`, card hover lift, sidebar width animation, button `active:scale`.
