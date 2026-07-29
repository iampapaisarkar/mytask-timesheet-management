import { useEffect, useMemo, useState } from "react";
import {
  useCreateManagementGroup,
  useEmployees,
  useUpdateManagementGroup,
} from "@mytask/hooks";
import { getErrorMessage } from "@mytask/utils";
import { Button } from "@/components/ui/Button";
import { TextInput } from "@/components/ui/TextInput";
import { useToastStore } from "@/store/toastStore";

type EmpOption = { id: number; label: string };

type MgRow = {
  id?: number | string;
  name?: string;
  group_managers?: Array<{ id?: number; full_name?: string; email?: string }>;
  group_staffs?: Array<{ id?: number; full_name?: string; email?: string }>;
};

function employeeOptions(
  rows: Array<{
    id?: number;
    details?: { id?: number; full_name?: string; email?: string };
  }>,
): EmpOption[] {
  return rows
    .map((row) => {
      const id = row.details?.id ?? row.id;
      if (id == null) return null;
      return {
        id: Number(id),
        label:
          row.details?.full_name ||
          row.details?.email ||
          `Employee #${id}`,
      };
    })
    .filter((x): x is EmpOption => x != null);
}

export function ManagementGroupFormDialog({
  open,
  onClose,
  group,
}: {
  open: boolean;
  onClose: () => void;
  group?: MgRow | null;
}) {
  const toast = useToastStore();
  const createMutation = useCreateManagementGroup();
  const updateMutation = useUpdateManagementGroup();
  const employeesQuery = useEmployees({ rows_per_page: 200 }, open);
  const isEdit = group?.id != null;

  const [name, setName] = useState("");
  const [managerIds, setManagerIds] = useState<number[]>([]);
  const [staffIds, setStaffIds] = useState<number[]>([]);

  const options = useMemo(
    () =>
      employeeOptions(
        (Array.isArray(employeesQuery.data) ? employeesQuery.data : []) as Array<{
          id?: number;
          details?: { id?: number; full_name?: string; email?: string };
        }>,
      ),
    [employeesQuery.data],
  );

  useEffect(() => {
    if (!open) return;
    setName(group?.name || "");
    setManagerIds(
      (group?.group_managers || [])
        .map((m) => m.id)
        .filter((id): id is number => id != null)
        .map(Number),
    );
    setStaffIds(
      (group?.group_staffs || [])
        .map((s) => s.id)
        .filter((id): id is number => id != null)
        .map(Number),
    );
  }, [open, group]);

  if (!open) return null;

  function toggle(list: number[], id: number, set: (v: number[]) => void) {
    set(list.includes(id) ? list.filter((x) => x !== id) : [...list, id]);
  }

  async function handleSubmit() {
    if (!name.trim()) {
      toast.warning("Name required");
      return;
    }
    const payload = {
      name: name.trim(),
      group_managers: managerIds.map((id) => ({ id })),
      group_staffs: staffIds.map((id) => ({ id })),
    };
    try {
      if (isEdit && group?.id != null) {
        await updateMutation.mutateAsync({ id: group.id, payload });
        toast.success("Management group updated");
      } else {
        await createMutation.mutateAsync(payload);
        toast.success("Management group created");
      }
      onClose();
    } catch (err) {
      toast.error(
        isEdit ? "Update failed" : "Create failed",
        getErrorMessage(err),
      );
    }
  }

  const pending = createMutation.isPending || updateMutation.isPending;

  return (
    <div className="fixed inset-0 z-[60] flex items-end justify-center bg-black/45 p-4 sm:items-center">
      <button
        type="button"
        className="absolute inset-0 cursor-pointer"
        aria-label="Close dialog"
        onClick={onClose}
      />
      <div className="relative z-10 max-h-[90vh] w-full max-w-lg overflow-y-auto rounded-2xl border border-border bg-[var(--mt-surface)] p-5 shadow-2xl">
        <h2 className="text-lg font-bold text-[var(--mt-text)]">
          {isEdit ? "Edit management group" : "Create management group"}
        </h2>
        <div className="mt-4 flex flex-col gap-4">
          <TextInput
            label="Name"
            value={name}
            onChange={(e) => setName(e.target.value)}
          />

          <fieldset className="flex flex-col gap-2">
            <legend className="text-sm font-medium">Managers</legend>
            <div className="max-h-40 space-y-2 overflow-y-auto rounded-xl border border-border p-3">
              {options.map((opt) => (
                <label key={opt.id} className="flex items-center gap-2 text-sm">
                  <input
                    type="checkbox"
                    className="size-4 accent-primary"
                    checked={managerIds.includes(opt.id)}
                    onChange={() =>
                      toggle(managerIds, opt.id, setManagerIds)
                    }
                  />
                  <span>{opt.label}</span>
                </label>
              ))}
            </div>
          </fieldset>

          <fieldset className="flex flex-col gap-2">
            <legend className="text-sm font-medium">Staff</legend>
            <div className="max-h-40 space-y-2 overflow-y-auto rounded-xl border border-border p-3">
              {options.map((opt) => (
                <label key={opt.id} className="flex items-center gap-2 text-sm">
                  <input
                    type="checkbox"
                    className="size-4 accent-primary"
                    checked={staffIds.includes(opt.id)}
                    onChange={() => toggle(staffIds, opt.id, setStaffIds)}
                  />
                  <span>{opt.label}</span>
                </label>
              ))}
            </div>
          </fieldset>
        </div>
        <div className="mt-5 flex justify-end gap-2">
          <Button variant="secondary" onClick={onClose}>
            Cancel
          </Button>
          <Button loading={pending} onClick={() => void handleSubmit()}>
            {isEdit ? "Save" : "Create"}
          </Button>
        </div>
      </div>
    </div>
  );
}
