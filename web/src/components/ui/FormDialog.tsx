import type { ReactNode } from "react";
import { Button } from "@/components/ui/Button";

export function FormDialog({
  open,
  title,
  onClose,
  onSubmit,
  loading,
  children,
  submitLabel = "Save",
}: {
  open: boolean;
  title: string;
  onClose: () => void;
  onSubmit: () => void;
  loading?: boolean;
  children: ReactNode;
  submitLabel?: string;
}) {
  if (!open) return null;
  return (
    <div className="fixed inset-0 z-[60] flex items-end justify-center bg-black/45 p-4 sm:items-center">
      <button
        type="button"
        className="absolute inset-0 cursor-pointer"
        aria-label="Close dialog"
        onClick={onClose}
      />
      <div className="relative z-10 max-h-[90vh] w-full max-w-md overflow-y-auto rounded-2xl border border-border bg-[var(--mt-surface)] p-5 shadow-2xl">
        <h2 className="text-lg font-bold text-[var(--mt-text)]">{title}</h2>
        <div className="mt-4 flex flex-col gap-3">{children}</div>
        <div className="mt-5 flex justify-end gap-2">
          <Button type="button" variant="secondary" onClick={onClose}>
            Cancel
          </Button>
          <Button
            type="button"
            loading={loading}
            onClick={() => void onSubmit()}
          >
            {submitLabel}
          </Button>
        </div>
      </div>
    </div>
  );
}
