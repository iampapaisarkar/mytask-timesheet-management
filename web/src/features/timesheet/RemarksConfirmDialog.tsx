import { useEffect, useState } from "react";
import { FormDialog } from "@/components/ui/FormDialog";
import { TextInput } from "@/components/ui/TextInput";

export type TimesheetStatusAction =
  | "submit"
  | "approve"
  | "reject"
  | "revert";

const ACTION_LABELS: Record<
  TimesheetStatusAction,
  { title: string; confirm: string }
> = {
  submit: { title: "Submit for approval", confirm: "Submit" },
  approve: { title: "Approve timesheet", confirm: "Approve" },
  reject: { title: "Reject timesheet", confirm: "Reject" },
  revert: { title: "Revert to draft", confirm: "Revert" },
};

export function RemarksConfirmDialog({
  open,
  action,
  loading,
  onClose,
  onConfirm,
}: {
  open: boolean;
  action: TimesheetStatusAction | null;
  loading?: boolean;
  onClose: () => void;
  onConfirm: (remarks: string) => void | Promise<void>;
}) {
  const [remarks, setRemarks] = useState("");
  const [error, setError] = useState<string | undefined>();

  useEffect(() => {
    if (open) {
      setRemarks("");
      setError(undefined);
    }
  }, [open, action]);

  if (!action) return null;

  const labels = ACTION_LABELS[action];

  function handleClose() {
    setRemarks("");
    setError(undefined);
    onClose();
  }

  async function handleSubmit() {
    const trimmed = remarks.trim();
    if (!trimmed) {
      setError("Remarks are required.");
      return;
    }
    setError(undefined);
    await onConfirm(trimmed);
  }

  return (
    <FormDialog
      open={open}
      title={labels.title}
      onClose={handleClose}
      onSubmit={() => void handleSubmit()}
      loading={loading}
      submitLabel={labels.confirm}
    >
      <p className="text-sm text-muted">
        Remarks are required before this status change can proceed.
      </p>
      <TextInput
        label="Remarks"
        value={remarks}
        error={error}
        autoFocus
        onChange={(e) => {
          setRemarks(e.target.value);
          if (error) setError(undefined);
        }}
        onKeyDown={(e) => {
          if (e.key === "Enter") {
            e.preventDefault();
            void handleSubmit();
          }
        }}
      />
    </FormDialog>
  );
}
