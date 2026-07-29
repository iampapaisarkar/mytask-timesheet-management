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
}: {
  open: boolean;
  title: string;
  onClose: () => void;
  onSubmit: () => void;
  loading?: boolean;
  children: ReactNode;
  submitLabel?: string;
}) {
  return (
    <FullScreenModal
      open={open}
      onClose={onClose}
      title={title}
      variant="form"
      footer={
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
      }
    >
      <div className="flex flex-col gap-3">{children}</div>
    </FullScreenModal>
  );
}
