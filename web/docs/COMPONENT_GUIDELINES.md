# Web Components

Primitives in `components/ui`. Feature screens own composition. Prefer Tailwind tokens mapped to Quasar colours.

## Phone numbers

Never use a plain `TextInput` for phone fields. Always use `GlobalPhoneInput` from `components/ui/GlobalPhoneInput.tsx`, which emits E.164 + country metadata. Display numbers with `formatPhoneDisplay` / `GlobalPhoneDisplay`.
