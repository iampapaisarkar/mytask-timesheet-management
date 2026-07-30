import { useMemo, useState } from "react";
import { getErrorMessage } from "@mytask/utils";
import { can, getOrganisationAcl } from "@mytask/services";
import { useOrganisationStore } from "@/store/organisationStore";
import { Button } from "@/components/ui/Button";
import { TextInput } from "@/components/ui/TextInput";
import { FormDialog } from "@/components/ui/FormDialog";
import { useToastStore } from "@/store/toastStore";
import { ResourceListPage } from "@/features/shared/ResourceListPage";
import {
  useCreatePayrollCalendar,
  usePayCycles,
  usePayrollCalendars,
} from "./settingsHooks";

type PayCycle = { id: number; name: string; code: string };

type Row = Record<string, unknown> & {
  id?: string | number;
  name?: string;
  start_date?: string;
  end_date?: string;
  first_payment_date?: string;
  pay_cycle?: PayCycle | null;
};

type DialogMode = "create" | "view";

export function PayrollCalendarsPage() {
  const query = usePayrollCalendars();
  const payCyclesQuery = usePayCycles();
  const toast = useToastStore();
  const role = useOrganisationStore((s) => s.organisation?.role);
  const acl = getOrganisationAcl(role);
  const canCreate = can(acl, "payrollCalendar", "create");

  const createMutation = useCreatePayrollCalendar();

  const calendars = (Array.isArray(query.data) ? query.data : []) as Row[];

  const [open, setOpen] = useState(false);
  const [mode, setMode] = useState<DialogMode>("create");
  const [name, setName] = useState("");
  const [payCycleId, setPayCycleId] = useState("");
  const [startDate, setStartDate] = useState("");
  const [endDate, setEndDate] = useState("");
  const [firstPaymentDate, setFirstPaymentDate] = useState("");

  const payCycles = (payCyclesQuery.data || []) as PayCycle[];
  const selectedPayCycle = useMemo(
    () => payCycles.find((c) => String(c.id) === payCycleId) || null,
    [payCycles, payCycleId],
  );

  const readOnly = mode === "view";

  function openCreate() {
    if (!canCreate) return;
    setMode("create");
    setName("");
    setPayCycleId("");
    setStartDate("");
    setEndDate("");
    setFirstPaymentDate("");
    setOpen(true);
  }

  function openView(row: Row) {
    setMode("view");
    setName(String(row.name || ""));
    setPayCycleId(row.pay_cycle?.id != null ? String(row.pay_cycle.id) : "");
    setStartDate(String(row.start_date || "").slice(0, 10));
    setEndDate(String(row.end_date || "").slice(0, 10));
    setFirstPaymentDate(String(row.first_payment_date || "").slice(0, 10));
    setOpen(true);
  }

  async function handleSave() {
    if (readOnly) return;
    if (!name.trim() || !selectedPayCycle || !startDate || !firstPaymentDate) {
      toast.warning("All fields are required");
      return;
    }
    try {
      await createMutation.mutateAsync({
        name: name.trim(),
        pay_cycle: {
          id: selectedPayCycle.id,
          name: selectedPayCycle.name,
          code: selectedPayCycle.code,
        },
        start_date: startDate,
        first_payment_date: firstPaymentDate,
        default: calendars.length === 0,
      });
      toast.success("Payroll calendar created");
      setOpen(false);
    } catch (err) {
      toast.error("Create failed", getErrorMessage(err));
    }
  }

  return (
    <>
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
        onCreate={canCreate ? openCreate : undefined}
        onRowClick={(row) => openView(row as Row)}
        rowActions={(row) => (
          <Button
            variant="soft"
            className="px-2.5 py-1.5 text-xs"
            onClick={() => openView(row as Row)}
          >
            View
          </Button>
        )}
      />
      <FormDialog
        open={open}
        title={
          readOnly ? "Payroll calendar details" : "Create payroll calendar"
        }
        onClose={() => setOpen(false)}
        onSubmit={() => void handleSave()}
        loading={createMutation.isPending}
        submitLabel="Create"
        readOnly={readOnly}
      >
        <TextInput
          label="Name"
          value={name}
          onChange={(e) => setName(e.target.value)}
          readOnly={readOnly}
          disabled={readOnly}
        />
        <label className="flex flex-col gap-1 text-sm">
          <span className="font-medium text-muted">Pay cycle</span>
          <select
            className="rounded-xl border border-border bg-[var(--mt-surface)] px-3 py-2.5 disabled:opacity-70"
            value={payCycleId}
            onChange={(e) => setPayCycleId(e.target.value)}
            disabled={readOnly}
          >
            <option value="">Select pay cycle</option>
            {payCycles.map((c) => (
              <option key={c.id} value={c.id}>
                {c.name}
              </option>
            ))}
            {readOnly &&
            payCycleId &&
            !payCycles.some((c) => String(c.id) === payCycleId) ? (
              <option value={payCycleId}>
                {calendars.find((c) => String(c.pay_cycle?.id) === payCycleId)
                  ?.pay_cycle?.name || "Pay cycle"}
              </option>
            ) : null}
          </select>
        </label>
        <TextInput
          label="Start date"
          type="date"
          value={startDate}
          onChange={(e) => setStartDate(e.target.value)}
          readOnly={readOnly}
          disabled={readOnly}
        />
        {readOnly ? (
          <TextInput
            label="End date"
            type="date"
            value={endDate}
            readOnly
            disabled
          />
        ) : null}
        <TextInput
          label="First payment date"
          type="date"
          value={firstPaymentDate}
          onChange={(e) => setFirstPaymentDate(e.target.value)}
          readOnly={readOnly}
          disabled={readOnly}
        />
      </FormDialog>
    </>
  );
}
