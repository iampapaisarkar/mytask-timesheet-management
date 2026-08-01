import { useMemo, useState } from "react";
import { clsx } from "clsx";
import { getErrorMessage, listRows } from "@mytask/utils";
import { can, getOrganisationAcl } from "@mytask/services";
import {
  payrollCalendarSchema,
  type PayrollCalendarFormValues,
} from "@mytask/validation";
import { useOrganisationStore } from "@/store/organisationStore";
import { Button } from "@/components/ui/Button";
import { TextInput } from "@/components/ui/TextInput";
import { FormDialog } from "@/components/ui/FormDialog";
import { useToastStore } from "@/store/toastStore";
import { ResourceListPage } from "@/features/shared/ResourceListPage";
import { useAppForm, useValidatedSubmit } from "@/hooks/useAppForm";
import { Controller } from "react-hook-form";
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

const emptyPayrollCalendar: PayrollCalendarFormValues = {
  name: "",
  pay_cycle_id: "",
  start_date: "",
  first_payment_date: "",
};

const selectClass =
  "rounded-xl border border-border bg-[var(--mt-surface)] px-3 py-2.5 disabled:opacity-70";

export function PayrollCalendarsPage() {
  const [page, setPage] = useState(1);
  const query = usePayrollCalendars({ page_number: page });
  const payCyclesQuery = usePayCycles();
  const toast = useToastStore();
  const role = useOrganisationStore((s) => s.organisation?.role);
  const acl = getOrganisationAcl(role);
  const canCreate = can(acl, "payrollCalendar", "create");

  const createMutation = useCreatePayrollCalendar();

  const calendars = listRows<Row>(query.data);

  const [open, setOpen] = useState(false);
  const [mode, setMode] = useState<DialogMode>("create");
  const [viewEndDate, setViewEndDate] = useState("");

  const form = useAppForm<PayrollCalendarFormValues>({
    schema: payrollCalendarSchema,
    defaultValues: emptyPayrollCalendar,
  });
  const {
    register,
    control,
    reset,
    watch,
    formState: { errors },
  } = form;

  const payCycleId = watch("pay_cycle_id");

  const payCycles = (payCyclesQuery.data || []) as PayCycle[];
  const selectedPayCycle = useMemo(
    () => payCycles.find((c) => String(c.id) === payCycleId) || null,
    [payCycles, payCycleId],
  );

  const readOnly = mode === "view";

  function openCreate() {
    if (!canCreate) return;
    setMode("create");
    setViewEndDate("");
    reset(emptyPayrollCalendar);
    setOpen(true);
  }

  function openView(row: Row) {
    setMode("view");
    setViewEndDate(String(row.end_date || "").slice(0, 10));
    reset({
      name: String(row.name || ""),
      pay_cycle_id:
        row.pay_cycle?.id != null ? String(row.pay_cycle.id) : "",
      start_date: String(row.start_date || "").slice(0, 10),
      first_payment_date: String(row.first_payment_date || "").slice(0, 10),
    });
    setOpen(true);
  }

  const handleSave = useValidatedSubmit(form, async (values) => {
    if (readOnly) return;
    if (!selectedPayCycle) return;
    try {
      await createMutation.mutateAsync({
        name: values.name.trim(),
        pay_cycle: {
          id: selectedPayCycle.id,
          name: selectedPayCycle.name,
          code: selectedPayCycle.code,
        },
        start_date: values.start_date,
        first_payment_date: values.first_payment_date,
        default: calendars.length === 0,
      });
      toast.success("Payroll calendar created");
      setOpen(false);
    } catch (err) {
      toast.error("Create failed", getErrorMessage(err));
    }
  });

  return (
    <>
      <ResourceListPage
        title="Payroll calendars"
        query={query}
        page={page}
        onPageChange={setPage}
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
        onSubmit={handleSave}
        loading={createMutation.isPending}
        submitLabel="Create"
        readOnly={readOnly}
      >
        <TextInput
          label="Name"
          error={errors.name?.message}
          readOnly={readOnly}
          disabled={readOnly}
          {...register("name")}
        />
        <Controller
          name="pay_cycle_id"
          control={control}
          render={({ field }) => (
            <label className="flex flex-col gap-1 text-sm">
              <span className="font-medium text-muted">Pay cycle</span>
              <select
                className={clsx(
                  selectClass,
                  errors.pay_cycle_id && "border-negative",
                )}
                value={field.value}
                onChange={field.onChange}
                onBlur={field.onBlur}
                disabled={readOnly}
              >
                <option value="">Select pay cycle</option>
                {payCycles.map((c) => (
                  <option key={c.id} value={c.id}>
                    {c.name}
                  </option>
                ))}
                {readOnly &&
                field.value &&
                !payCycles.some((c) => String(c.id) === field.value) ? (
                  <option value={field.value}>
                    {calendars.find(
                      (c) => String(c.pay_cycle?.id) === field.value,
                    )?.pay_cycle?.name || "Pay cycle"}
                  </option>
                ) : null}
              </select>
              {errors.pay_cycle_id?.message ? (
                <span className="text-xs text-negative">
                  {errors.pay_cycle_id.message}
                </span>
              ) : null}
            </label>
          )}
        />
        <TextInput
          label="Start date"
          type="date"
          error={errors.start_date?.message}
          readOnly={readOnly}
          disabled={readOnly}
          {...register("start_date")}
        />
        {readOnly ? (
          <TextInput
            label="End date"
            type="date"
            value={viewEndDate}
            readOnly
            disabled
          />
        ) : null}
        <TextInput
          label="First payment date"
          type="date"
          error={errors.first_payment_date?.message}
          readOnly={readOnly}
          disabled={readOnly}
          {...register("first_payment_date")}
        />
      </FormDialog>
    </>
  );
}
