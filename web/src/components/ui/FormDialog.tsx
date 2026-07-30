import type { ReactNode } from "react";
import { Button } from "@/components/ui/Button";
import { FullScreenModal } from "@/components/ui/FullScreenModal";

export function FormDialog({
  open,
  title,
  onClose,
  onSubmit,
  loading,
  children,
  submitLabel = "Save",
  readOnly = false,
}: {
  open: boolean;
  title: string;
  onClose: () => void;
  onSubmit: () => void;
  loading?: boolean;
  children: ReactNode;
  submitLabel?: string;
  /** When true, only a Close action is shown (no submit). */
  readOnly?: boolean;
}) {
  return (
    <FullScreenModal
      open={open}
      onClose={onClose}
      title={title}
      variant="form"
      footer={
        readOnly ? (
          <Button type="button" variant="secondary" onClick={onClose}>
            Close
          </Button>
        ) : (
          <>
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
          </>
        )
      }
    >
      <div className="flex flex-col gap-3">{children}</div>
    </FullScreenModal>
  );
}
