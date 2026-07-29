# Full-screen forms (mobile)

Create/edit flows should use [`FullScreenSheet`](../src/components/FullScreenSheet.tsx):

- 100% height `Modal` with safe-area padding
- Drag handle + swipe-down to close
- Optional `title` / `footer` slots

Example:

```tsx
<FullScreenSheet open={open} onClose={onClose} title="Create job" footer={...}>
  {/* form fields */}
</FullScreenSheet>
```

Day details use the stack `presentation: "fullScreenModal"` instead so navigation history is preserved.
