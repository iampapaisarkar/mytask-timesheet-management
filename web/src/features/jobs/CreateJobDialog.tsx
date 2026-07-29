import { useState } from "react";
import { useCreateJob } from "@mytask/hooks";
import { getErrorMessage } from "@mytask/utils";
import { Button } from "@/components/ui/Button";
import { TextInput } from "@/components/ui/TextInput";
import { useToastStore } from "@/store/toastStore";

export function CreateJobDialog({
  open,
  onClose,
}: {
  open: boolean;
  onClose: () => void;
}) {
  const toast = useToastStore();
  const createMutation = useCreateJob();
  const [name, setName] = useState("");
  const [siteContactName, setSiteContactName] = useState("");

  if (!open) return null;

  async function handleCreate() {
    if (!name.trim()) {
      toast.warning("Name required");
      return;
    }
    try {
      await createMutation.mutateAsync({
        name: name.trim(),
        site_contact_name: siteContactName || null,
      });
      toast.success("Job created");
      setName("");
      setSiteContactName("");
      onClose();
    } catch (err) {
      toast.error("Create failed", getErrorMessage(err));
    }
  }

  return (
    <div className="fixed inset-0 z-[60] flex items-end justify-center bg-black/45 p-4 sm:items-center">
      <button
        type="button"
        className="absolute inset-0 cursor-pointer"
        aria-label="Close dialog"
        onClick={onClose}
      />
      <div className="relative z-10 w-full max-w-md rounded-2xl border border-border bg-[var(--mt-surface)] p-5 shadow-2xl">
        <h2 className="text-lg font-bold">Create job</h2>
        <div className="mt-4 flex flex-col gap-3">
          <TextInput
            label="Name"
            value={name}
            onChange={(e) => setName(e.target.value)}
          />
          <TextInput
            label="Site contact name"
            value={siteContactName}
            onChange={(e) => setSiteContactName(e.target.value)}
          />
        </div>
        <div className="mt-5 flex justify-end gap-2">
          <Button variant="secondary" onClick={onClose}>
            Cancel
          </Button>
          <Button
            loading={createMutation.isPending}
            onClick={() => void handleCreate()}
          >
            Create
          </Button>
        </div>
      </div>
    </div>
  );
}
