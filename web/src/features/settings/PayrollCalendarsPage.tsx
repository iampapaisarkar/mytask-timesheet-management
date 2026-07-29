import { useState } from "react";
import { getErrorMessage } from "@mytask/utils";
import { can, getOrganisationAcl } from "@mytask/services";
import { useOrganisationStore } from "@/store/organisationStore";
import { TextInput } from "@/components/ui/TextInput";
import { Button } from "@/components/ui/Button";
import { FormDialog } from "@/components/ui/FormDialog";
import { useToastStore } from "@/store/toastStore";
import { ResourceListPage } from "@/features/shared/ResourceListPage";
import {
  useCreatePayrollCalendar,
  usePayCycles,
  usePayrollCalendars,
  usePullPayrollFromXero,
} from "./settingsHooks";

export function PayrollCalendarsPage() {
  const query = usePayrollCalendars();
  const payCyclesQuery = usePayCycles();
  const toast = useToastStore();
  const role = useOrganisationStore((s) => s.organisation?.role);
  const acl = getOrganisationAcl(role);
  const canCreate = can(acl, "payrollCalendar", "create");
  const canXero = can(acl, "xero", "edit");

  const createMutation = useCreatePayrollCalendar();
  const pullMutation = usePullPayrollFromXero();

  const [open, setOpen] = useState(false);
  const [name, setName] = useState("");
  const [payCycleId, setPayCycleId] = useState("");
  const [startDate, setStartDate] = useState("");
  const [firstPaymentDate, setFirstPaymentDate] = useState("");
  const [pushToXero, setPushToXero] = useState(false);

  const payCycles = (payCyclesQuery.data || []) as Array<{
    id: number;
    name: string;
  }>;

  async function handleSave() {
    if (!name.trim() || !payCycleId || !startDate || !firstPaymentDate) {
      toast.warning("All fields are required");
      return;
    }
    try {
      await createMutation.mutateAsync({
        name: name.trim(),
        pay_cycle: { id: Number(payCycleId) },
        start_date: startDate,
        first_payment_date: firstPaymentDate,
        push_to_xero: pushToXero,
      });
      toast.success("Payroll calendar created");
      setOpen(false);
    } catch (err) {
      toast.error("Create failed", getErrorMessage(err));
    }
  }

  async function handlePull() {
    try {
      await pullMutation.mutateAsync();
      toast.success("Pulled payroll calendars from Xero");
    } catch (err) {
      toast.error("Pull failed", getErrorMessage(err));
    }
  }

  return (
    <>
      {canXero ? (
        <div className="mb-3 flex justify-end">
          <Button
            type="button"
            variant="secondary"
            loading={pullMutation.isPending}
            onClick={() => void handlePull()}
          >
            Pull from Xero
          </Button>
        </div>
      ) : null}
      <ResourceListPage
        title="Payroll calendars"
        query={query}
        columns={[
          { key: "id", label: "ID" },
          { key: "name", label: "Name" },
          { key: "pay_cycle", label: "Pay cycle", accessor: "pay_cycle.name" },
          { key: "start_date", label: "Start date" },
        ]}
        createLabel={canCreate ? "Create calendar" : undefined}
        onCreate={
          canCreate
            ? () => {
                setName("");
                setPayCycleId("");
                setStartDate("");
                setFirstPaymentDate("");
                setPushToXero(false);
                setOpen(true);
              }
            : undefined
        }
      />
      <FormDialog
        open={open}
        title="Create payroll calendar"
        onClose={() => setOpen(false)}
        onSubmit={() => void handleSave()}
        loading={createMutation.isPending}
        submitLabel="Create"
      >
        <TextInput
          label="Name"
          value={name}
          onChange={(e) => setName(e.target.value)}
        />
        <label className="flex flex-col gap-1 text-sm">
          <span className="font-medium text-muted">Pay cycle</span>
          <select
            className="rounded-xl border border-border bg-[var(--mt-surface)] px-3 py-2.5"
            value={payCycleId}
            onChange={(e) => setPayCycleId(e.target.value)}
          >
            <option value="">Select pay cycle</option>
            {payCycles.map((c) => (
              <option key={c.id} value={c.id}>
                {c.name}
              </option>
            ))}
          </select>
        </label>
        <TextInput
          label="Start date"
          type="date"
          value={startDate}
          onChange={(e) => setStartDate(e.target.value)}
        />
        <TextInput
          label="First payment date"
          type="date"
          value={firstPaymentDate}
          onChange={(e) => setFirstPaymentDate(e.target.value)}
        />
        <label className="flex items-center gap-2 text-sm">
          <input
            type="checkbox"
            checked={pushToXero}
            onChange={(e) => setPushToXero(e.target.checked)}
          />
          Push to Xero
        </label>
      </FormDialog>
    </>
  );
}
