import { useEffect, useMemo, useState } from "react";
import { Controller } from "react-hook-form";
import {
  useCreateEmployee,
  useEmployeeFormLookups,
  useInviteEmployee,
  useSearchEmployeeByEmail,
  useUpdateEmployee,
} from "@mytask/hooks";
import {
  DEFAULT_CURRENCY,
  SUPPORTED_CURRENCIES,
  currencyDisplayPrefix,
  currencyFromCountryIso,
  isSupportedCurrency,
  type SupportedCurrencyCode,
} from "@mytask/constants";
import {
  employeeDetailsStepSchema,
  employeeEmailStepSchema,
  employeePayrollStepSchema,
  employeeWageStepSchema,
  type EmployeeDetailsStepValues,
  type EmployeeEmailStepValues,
  type EmployeePayrollStepValues,
  type EmployeeWageStepValues,
} from "@mytask/validation";
import { getErrorMessage, phoneValueFromE164, fromAddressRecord, toAddressApiPayload, type PhoneValue } from "@mytask/utils";
import { Button } from "@/components/ui/Button";
import { FullScreenModal } from "@/components/ui/FullScreenModal";
import { TextInput } from "@/components/ui/TextInput";
import { GlobalPhoneInput } from "@/components/ui/GlobalPhoneInput";
import {
  GoogleAddressAutocomplete,
  emptyAddress,
  type AddressValue,
} from "@/components/GoogleAddress";
import { useToastStore } from "@/store/toastStore";
import { useOrganisationStore } from "@/store/organisationStore";
import { useLocaleDefaults } from "@/hooks/useLocaleDefaults";
import { useAppForm, useValidatedSubmit } from "@/hooks/useAppForm";

const selectClass =
  "mt-focus rounded-xl border border-border bg-[var(--mt-surface)] px-3.5 py-3 text-[var(--mt-text)] outline-none focus:border-primary";

const STEPS = ["Email", "Details", "Wage", "Payroll"] as const;

type PaymentMethod = "CASH" | "DIRECT_DEBIT" | "BANK_TRANSFER";

type NamedId = { id: number; name?: string; code?: string };

export type EmployeeListRow = {
  id?: number | string;
  details?: Record<string, unknown> & {
    id?: number | string;
    invitation?: { status?: { code?: string } };
  };
  wage?: Record<string, unknown> | null;
  payroll?: Record<string, unknown> | null;
  invitation?: { status?: { code?: string } };
};

const emptyEmail: EmployeeEmailStepValues = { email: "" };

function emptyDetails(email = ""): EmployeeDetailsStepValues {
  return {
    first_name: "",
    middle_name: "",
    last_name: "",
    email,
    preferred_name: "",
    dob: "",
    phone_number: "",
    phone_country_code: null,
    phone_country_iso: null,
    address_line_1: "",
    formatted_address: "",
    role_id: "",
  };
}

function emptyWage(
  currency: SupportedCurrencyCode = DEFAULT_CURRENCY,
): EmployeeWageStepValues {
  return {
    start_date: "",
    employment_type_id: "",
    payroll_calendar_id: "",
    pay_type: "HOURLY",
    currency,
    hourly_rate: "",
    fixed_rate: "",
  };
}

const emptyPayroll: EmployeePayrollStepValues = {
  payment_method: "CASH",
  account_holder_name: "",
  bank_name: "",
  bank_account_number: "",
  ifsc_code: "",
  swift_code: "",
};

function asNamed(raw: unknown): NamedId | null {
  if (!raw || typeof raw !== "object") return null;
  const obj = raw as Record<string, unknown>;
  if (obj.id == null) return null;
  return {
    id: Number(obj.id),
    name: typeof obj.name === "string" ? obj.name : undefined,
    code: typeof obj.code === "string" ? obj.code : undefined,
  };
}

function detailsFromRow(
  details: Record<string, unknown>,
  address: AddressValue,
): EmployeeDetailsStepValues {
  const phone = phoneValueFromE164(String(details.phone_number || ""));
  const role = asNamed(details.role);
  return {
    first_name: String(details.first_name || ""),
    middle_name: String(details.middle_name || ""),
    last_name: String(details.last_name || ""),
    email: String(details.email || ""),
    preferred_name: String(details.preferred_name || ""),
    dob: String(details.dob || ""),
    phone_number: phone.phone_number || String(details.phone_number || ""),
    phone_country_code:
      (details.phone_country_code as string | null) || phone.phone_country_code,
    phone_country_iso:
      (details.phone_country_iso as string | null) || phone.phone_country_iso,
    address_line_1: address.address_line_1 || "",
    formatted_address: address.formatted_address || "",
    role_id: role?.id != null ? String(role.id) : "",
  };
}

function wageFromRaw(
  wage: Record<string, unknown>,
  defaultCurrency: SupportedCurrencyCode,
): EmployeeWageStepValues {
  const payType =
    String(wage.pay_type || "").toUpperCase() === "FIXED" ? "FIXED" : "HOURLY";
  const rawCurrency = String(wage.currency || defaultCurrency).toUpperCase();
  const employmentType = asNamed(wage.employment_type);
  const payrollCalendar = asNamed(wage.payroll_calendar);
  return {
    start_date: String(wage.start_date || ""),
    employment_type_id:
      employmentType?.id != null ? String(employmentType.id) : "",
    payroll_calendar_id:
      payrollCalendar?.id != null ? String(payrollCalendar.id) : "",
    pay_type: payType,
    currency: isSupportedCurrency(rawCurrency) ? rawCurrency : defaultCurrency,
    hourly_rate:
      payType === "HOURLY" ? String(wage.hourly_rate_exc_super ?? "") : "",
    fixed_rate:
      payType === "FIXED" ? String(wage.fixed_rate_exc_super ?? "") : "",
  };
}

function payrollFromRaw(
  payroll: Record<string, unknown>,
): EmployeePayrollStepValues {
  const paymentMethod = String(payroll.payment_method || "CASH").toUpperCase();
  const method: PaymentMethod =
    paymentMethod === "DIRECT_DEBIT" || paymentMethod === "BANK_TRANSFER"
      ? paymentMethod
      : "CASH";
  const isBank = method === "BANK_TRANSFER";
  return {
    payment_method: method,
    account_holder_name: isBank
      ? String(payroll.account_holder_name || "")
      : "",
    bank_name: isBank ? String(payroll.bank_name || "") : "",
    bank_account_number: isBank
      ? String(payroll.bank_account_number || "")
      : "",
    ifsc_code: isBank ? String(payroll.ifsc_code || "") : "",
    swift_code: isBank ? String(payroll.swift_code || "") : "",
  };
}

function resetEmployeeForms(
  row: EmployeeListRow,
  defaultCurrency: SupportedCurrencyCode,
  resetters: {
    resetEmail: (values: EmployeeEmailStepValues) => void;
    resetDetails: (values: EmployeeDetailsStepValues) => void;
    resetWage: (values: EmployeeWageStepValues) => void;
    resetPayroll: (values: EmployeePayrollStepValues) => void;
  },
  setAddress: (value: AddressValue) => void,
) {
  const details = (row.details || {}) as Record<string, unknown>;
  const addressRaw =
    details.address && typeof details.address === "object"
      ? (details.address as Record<string, unknown>)
      : {};
  const address = fromAddressRecord(addressRaw);
  const wage = (row.wage || {}) as Record<string, unknown>;
  const payroll = (row.payroll || {}) as Record<string, unknown>;
  const email = String(details.email || "");

  resetters.resetEmail({ email });
  resetters.resetDetails(detailsFromRow(details, address));
  resetters.resetWage(wageFromRaw(wage, defaultCurrency));
  resetters.resetPayroll(payrollFromRaw(payroll));
  setAddress(address);
}

const PAYMENT_METHOD_OPTIONS: { value: PaymentMethod; label: string }[] = [
  { value: "CASH", label: "Cash" },
  { value: "DIRECT_DEBIT", label: "Direct Debit" },
  { value: "BANK_TRANSFER", label: "Bank Transfer" },
];

function RadioOption<T extends string>({
  name,
  value,
  checked,
  label,
  onChange,
}: {
  name: string;
  value: T;
  checked: boolean;
  label: string;
  onChange: (value: T) => void;
}) {
  return (
    <label className="inline-flex cursor-pointer items-center gap-2 rounded-xl border border-border bg-[var(--mt-surface)] px-3.5 py-2.5 text-sm text-[var(--mt-text)] has-[:checked]:border-primary has-[:checked]:bg-primary-muted">
      <input
        type="radio"
        name={name}
        value={value}
        checked={checked}
        onChange={() => onChange(value)}
        className="accent-[var(--mt-primary,#04B6B1)]"
      />
      <span className="font-medium">{label}</span>
    </label>
  );
}

export function CreateEmployeeDialog({
  open,
  onClose,
  employee = null,
}: {
  open: boolean;
  onClose: () => void;
  employee?: EmployeeListRow | null;
}) {
  const toast = useToastStore();
  const organisation = useOrganisationStore((s) => s.organisation);
  const localeDefaults = useLocaleDefaults(
    (organisation as { default_country?: string | null } | null)
      ?.default_country ||
      (organisation as { phone_country_iso?: string | null } | null)
        ?.phone_country_iso ||
      null,
  );
  const defaultWageCurrency = useMemo(() => {
    const orgCurrency = (organisation as { default_currency?: string | null } | null)
      ?.default_currency;
    if (isSupportedCurrency(orgCurrency)) return orgCurrency;
    return currencyFromCountryIso(
      localeDefaults.defaultCountryIso,
      localeDefaults.currency as SupportedCurrencyCode,
    );
  }, [organisation, localeDefaults]);

  const searchMutation = useSearchEmployeeByEmail();
  const createMutation = useCreateEmployee();
  const updateMutation = useUpdateEmployee();
  const isEdit = employee != null && (employee.details?.id != null || employee.id != null);
  const employeeId = employee?.details?.id ?? employee?.id;
  const [step, setStep] = useState(isEdit ? 1 : 0);
  const [action, setAction] = useState<{
    create_user: boolean;
    message?: string;
  } | null>(null);
  const [address, setAddress] = useState<AddressValue>(emptyAddress);

  const emailForm = useAppForm<EmployeeEmailStepValues>({
    schema: employeeEmailStepSchema,
    defaultValues: emptyEmail,
  });
  const detailsForm = useAppForm<EmployeeDetailsStepValues>({
    schema: employeeDetailsStepSchema,
    defaultValues: emptyDetails(),
  });
  const wageForm = useAppForm<EmployeeWageStepValues>({
    schema: employeeWageStepSchema,
    defaultValues: emptyWage(defaultWageCurrency),
  });
  const payrollForm = useAppForm<EmployeePayrollStepValues>({
    schema: employeePayrollStepSchema,
    defaultValues: emptyPayroll,
  });

  const {
    register: registerEmail,
    reset: resetEmail,
    formState: { errors: emailErrors },
  } = emailForm;
  const {
    reset: resetDetails,
    control: detailsControl,
    register: registerDetails,
    watch: watchDetails,
    setValue: setDetailsValue,
    getValues: getDetailsValues,
    setError: setDetailsError,
    trigger: triggerDetails,
    formState: { errors: detailsErrors },
  } = detailsForm;
  const {
    reset: resetWage,
    register: registerWage,
    watch: watchWage,
    setValue: setWageValue,
    getValues: getWageValues,
    setError: setWageError,
    trigger: triggerWage,
    formState: { errors: wageErrors },
  } = wageForm;
  const {
    reset: resetPayroll,
    register: registerPayroll,
    watch: watchPayroll,
    setValue: setPayrollValue,
    getValues: getPayrollValues,
    trigger: triggerPayroll,
    formState: { errors: payrollErrors },
  } = payrollForm;

  const payType = watchWage("pay_type");
  const wageCurrency = watchWage("currency") as SupportedCurrencyCode;
  const paymentMethod = watchPayroll("payment_method");

  const enabled = open && (isEdit || step >= 1);
  const formLookupsQuery = useEmployeeFormLookups(enabled);
  const lookups = formLookupsQuery.data;

  const roles = useMemo(() => {
    const raw = (lookups?.organisation_roles || lookups?.roles || []) as NamedId[];
    return raw.filter((r) => String(r.code || "").toLowerCase() !== "owner");
  }, [lookups]);

  const employmentTypes = useMemo(() => {
    const raw = (lookups?.employment_types || []) as NamedId[];
    return raw.filter(
      (t) => String(t.code || "").toUpperCase() !== "CONTRACT",
    );
  }, [lookups]);

  const calendars = (lookups?.payroll_calendars || []) as NamedId[];

  useEffect(() => {
    if (!open) {
      setStep(0);
      setAction(null);
      setAddress(emptyAddress());
      resetEmail(emptyEmail);
      resetDetails(emptyDetails());
      resetWage(emptyWage(defaultWageCurrency));
      resetPayroll(emptyPayroll);
      return;
    }
    if (employee) {
      resetEmployeeForms(
        employee,
        defaultWageCurrency,
        {
          resetEmail,
          resetDetails,
          resetWage,
          resetPayroll,
        },
        setAddress,
      );
      setAction({ create_user: false });
      setStep(1);
    } else {
      setStep(0);
      setAction(null);
      setAddress(emptyAddress());
      resetEmail(emptyEmail);
      resetDetails(emptyDetails());
      resetWage(emptyWage(defaultWageCurrency));
      resetPayroll(emptyPayroll);
    }
  }, [
    open,
    employee,
    defaultWageCurrency,
    resetEmail,
    resetDetails,
    resetWage,
    resetPayroll,
  ]);

  const stepLabel = useMemo(() => STEPS[step] || "", [step]);

  if (!open) return null;

  function syncAddressToDetails(next: AddressValue) {
    setAddress(next);
    setDetailsValue("address_line_1", next.address_line_1 || "", {
      shouldValidate: true,
    });
    setDetailsValue("formatted_address", next.formatted_address || "", {
      shouldValidate: true,
    });
  }

  function findRole(roleId: string) {
    return roles.find((r) => String(r.id) === roleId) || null;
  }

  function findEmploymentType(typeId: string) {
    return employmentTypes.find((t) => String(t.id) === typeId) || null;
  }

  function findCalendar(calendarId: string) {
    return calendars.find((c) => String(c.id) === calendarId) || null;
  }

  function validateDetailsExtras() {
    const roleId = getDetailsValues("role_id");
    const matched = findRole(roleId);
    if (matched && String(matched.code || "").toLowerCase() === "owner") {
      setDetailsError("role_id", {
        message: "Organisation Owner cannot be assigned",
      });
      return false;
    }
    return true;
  }

  function validateWageExtras() {
    const typeId = getWageValues("employment_type_id");
    const matched = findEmploymentType(typeId);
    if (matched && String(matched.code || "").toUpperCase() === "CONTRACT") {
      setWageError("employment_type_id", {
        message: "Contract employment type is not allowed",
      });
      return false;
    }
    return true;
  }

  async function runSearch(email: string) {
    try {
      const data = await searchMutation.mutateAsync(email.trim());
      const details = (data.details || {}) as Record<string, unknown>;
      const addressRaw =
        details.address && typeof details.address === "object"
          ? (details.address as Record<string, unknown>)
          : {
              address_1: details.address,
              address_2: details.address_2,
              city: details.city,
              state: details.state,
              postcode: details.postcode,
            };
      const wage = (data.wage || {}) as Record<string, unknown>;
      const payroll = (data.payroll || {}) as Record<string, unknown>;
      const nextAction = (data.action || {
        create_user: true,
      }) as { create_user: boolean; message?: string };

      const nextAddress = fromAddressRecord(
        addressRaw as Record<string, unknown>,
      );
      resetDetails(
        detailsFromRow(
          { ...details, email: String(details.email || email.trim()) },
          nextAddress,
        ),
      );
      resetWage(wageFromRaw(wage, defaultWageCurrency));
      resetPayroll(payrollFromRaw(payroll));
      setAddress(nextAddress);
      setAction(nextAction);
      setStep(1);
      if (nextAction.message) {
        toast.info("Email lookup", nextAction.message);
      }
    } catch (err) {
      toast.error("Search failed", getErrorMessage(err));
    }
  }

  const handleSearch = useValidatedSubmit(emailForm, async (values) => {
    await runSearch(values.email);
  });

  const advanceFromDetails = useValidatedSubmit(detailsForm, () => {
    if (!validateDetailsExtras()) return;
    setStep(2);
  });

  const advanceFromWage = useValidatedSubmit(wageForm, () => {
    if (!validateWageExtras()) return;
    setStep(3);
  });

  function goNext() {
    if (step === 1) advanceFromDetails();
    else if (step === 2) advanceFromWage();
  }

  async function submitEmployee() {
    const detailsValid = await triggerDetails();
    const wageValid = await triggerWage();
    const payrollValid = await triggerPayroll();
    const extrasOk = validateDetailsExtras() && validateWageExtras();

    if (!detailsValid) {
      setStep(1);
      return;
    }
    if (!wageValid) {
      setStep(2);
      return;
    }
    if (!payrollValid || !extrasOk) {
      return;
    }

    const d = getDetailsValues();
    const w = getWageValues();
    const p = getPayrollValues();
    const role = findRole(d.role_id);
    const employmentType = findEmploymentType(w.employment_type_id);
    const payrollCalendar = findCalendar(w.payroll_calendar_id);
    const isBank = p.payment_method === "BANK_TRANSFER";

    const payload = {
      action: {
        create_user: Boolean(action?.create_user),
      },
      details: {
        first_name: d.first_name.trim() || null,
        middle_name: d.middle_name?.trim() || null,
        last_name: d.last_name.trim() || null,
        email: d.email.trim(),
        preferred_name: d.preferred_name?.trim() || null,
        dob: d.dob,
        phone_number: d.phone_number.trim(),
        phone_country_code: d.phone_country_code,
        phone_country_iso: d.phone_country_iso,
        address: toAddressApiPayload(address, { includeCoordinates: false }),
        role,
      },
      wage: {
        start_date: w.start_date,
        employment_type: employmentType
          ? { id: employmentType.id, code: employmentType.code }
          : null,
        payroll_calendar: payrollCalendar ? { id: payrollCalendar.id } : null,
        pay_type: w.pay_type,
        currency: w.currency,
        hourly_rate_exc_super:
          w.pay_type === "HOURLY" ? w.hourly_rate || null : null,
        fixed_rate_exc_super:
          w.pay_type === "FIXED" ? w.fixed_rate || null : null,
      },
      payroll: {
        payment_method: p.payment_method,
        ...(isBank
          ? {
              account_holder_name: p.account_holder_name?.trim(),
              bank_name: p.bank_name?.trim(),
              bank_account_number: p.bank_account_number?.trim(),
              ifsc_code: p.ifsc_code?.trim(),
              swift_code: p.swift_code?.trim(),
            }
          : {}),
      },
    };

    try {
      if (isEdit && employeeId != null) {
        await updateMutation.mutateAsync({ id: employeeId, payload });
        toast.success("Employee updated");
      } else {
        await createMutation.mutateAsync(payload);
        toast.success("Employee created & invitation sent");
      }
      onClose();
    } catch (err) {
      toast.error(
        isEdit ? "Update failed" : "Create failed",
        getErrorMessage(err),
      );
    }
  }

  const handleCreate = useValidatedSubmit(payrollForm, submitEmployee);

  return (
    <FullScreenModal
      open
      onClose={onClose}
      variant="workspace"
      header={
        <div className="flex w-full items-start justify-between gap-3 border-b border-border px-5 py-4 sm:px-8">
          <div>
            <h2 className="text-lg font-bold text-[var(--mt-text)]">
              {isEdit ? "Edit employee" : "Create employee"}
            </h2>
            <p className="mt-1 text-sm text-muted">
              Step {step + 1} of {STEPS.length}: {stepLabel}
            </p>
            <div className="mt-3 flex flex-wrap gap-1.5">
              {STEPS.map((label, idx) => (
                <span
                  key={label}
                  className={`rounded-full px-2.5 py-0.5 text-xs font-medium ${
                    idx === step
                      ? "bg-primary text-white"
                      : idx < step
                        ? "bg-primary-muted text-primary"
                        : "bg-[var(--mt-bg)] text-muted"
                  }`}
                >
                  {label}
                </span>
              ))}
            </div>
          </div>
          <button
            type="button"
            onClick={onClose}
            aria-label="Close"
            className="mt-focus inline-flex h-10 w-10 shrink-0 items-center justify-center rounded-xl text-[var(--mt-muted)] transition hover:bg-primary-muted hover:text-[var(--mt-text)]"
          >
            <svg
              width="18"
              height="18"
              viewBox="0 0 24 24"
              fill="none"
              stroke="currentColor"
              strokeWidth="2.2"
              strokeLinecap="round"
              aria-hidden
            >
              <path d="M18 6 6 18M6 6l12 12" />
            </svg>
          </button>
        </div>
      }
      footer={
        <div className="flex w-full justify-between gap-2 border-t border-border px-5 py-4 sm:px-8">
          <Button variant="secondary" onClick={onClose}>
            Cancel
          </Button>
          <div className="flex gap-2">
            {step > (isEdit ? 1 : 0) ? (
              <Button
                variant="secondary"
                onClick={() =>
                  setStep((s) => Math.max(isEdit ? 1 : 0, s - 1))
                }
              >
                Back
              </Button>
            ) : null}
            {step === 0 && !isEdit ? (
              <Button loading={searchMutation.isPending} onClick={handleSearch}>
                Continue
              </Button>
            ) : null}
            {step > 0 && step < STEPS.length - 1 ? (
              <Button onClick={goNext}>Next</Button>
            ) : null}
            {step === STEPS.length - 1 ? (
              <Button
                loading={
                  createMutation.isPending || updateMutation.isPending
                }
                onClick={handleCreate}
              >
                {isEdit ? "Save changes" : "Create & invite"}
              </Button>
            ) : null}
          </div>
        </div>
      }
    >
      <div className="h-full overflow-y-auto px-5 py-4 sm:px-8">
        <div className="mx-auto w-full max-w-3xl">
          {step === 0 ? (
            <div className="flex flex-col gap-3">
              <p className="text-sm text-muted">
                Search by email to check for an existing user before inviting.
              </p>
              <TextInput
                label="Email"
                type="email"
                error={emailErrors.email?.message}
                {...registerEmail("email")}
              />
            </div>
          ) : null}

          {step === 1 ? (
            <div className="flex flex-col gap-3">
              {action?.message ? (
                <p className="rounded-xl bg-primary-muted/60 px-3 py-2 text-sm text-[var(--mt-text)]">
                  {action.message}
                </p>
              ) : null}
              <div className="grid gap-3 sm:grid-cols-3">
                <TextInput
                  label="First name"
                  error={detailsErrors.first_name?.message}
                  disabled={action?.create_user === false}
                  {...registerDetails("first_name")}
                />
                <TextInput
                  label="Middle name"
                  error={detailsErrors.middle_name?.message}
                  disabled={action?.create_user === false}
                  {...registerDetails("middle_name")}
                />
                <TextInput
                  label="Last name"
                  error={detailsErrors.last_name?.message}
                  disabled={action?.create_user === false}
                  {...registerDetails("last_name")}
                />
              </div>
              <TextInput
                label="Email"
                type="email"
                error={detailsErrors.email?.message}
                disabled
                {...registerDetails("email")}
              />
              <TextInput
                label="Preferred name"
                error={detailsErrors.preferred_name?.message}
                {...registerDetails("preferred_name")}
              />
              <div className="grid gap-3 sm:grid-cols-2">
                <TextInput
                  label="Date of birth"
                  type="date"
                  error={detailsErrors.dob?.message}
                  disabled={action?.create_user === false && !!watchDetails("dob")}
                  {...registerDetails("dob")}
                />
                <Controller
                  control={detailsControl}
                  name="phone_number"
                  render={({ fieldState }) => (
                    <GlobalPhoneInput
                      label="Phone number"
                      required
                      defaultCountry={localeDefaults.defaultCountry}
                      value={{
                        phone_number: watchDetails("phone_number") || null,
                        phone_country_code:
                          watchDetails("phone_country_code") ?? null,
                        phone_country_iso:
                          watchDetails("phone_country_iso") ?? null,
                      }}
                      onChange={(phone: PhoneValue) => {
                        setDetailsValue(
                          "phone_number",
                          phone.phone_number || "",
                          { shouldValidate: true },
                        );
                        setDetailsValue(
                          "phone_country_code",
                          phone.phone_country_code ?? null,
                          { shouldValidate: true },
                        );
                        setDetailsValue(
                          "phone_country_iso",
                          phone.phone_country_iso ?? null,
                          { shouldValidate: true },
                        );
                      }}
                      error={fieldState.error?.message}
                    />
                  )}
                />
              </div>
              <GoogleAddressAutocomplete
                label="Address"
                value={address}
                onChange={syncAddressToDetails}
                requireCoordinates={false}
                error={detailsErrors.formatted_address?.message}
              />
              <label className="flex w-full flex-col gap-1.5 text-sm">
                <span className="font-medium">Role</span>
                <select
                  className={`${selectClass} ${
                    detailsErrors.role_id ? "border-negative" : ""
                  }`}
                  value={watchDetails("role_id")}
                  onChange={(e) =>
                    setDetailsValue("role_id", e.target.value, {
                      shouldValidate: true,
                    })
                  }
                >
                  <option value="">Select role</option>
                  {roles.map((r) => (
                    <option key={r.id} value={r.id}>
                      {r.name}
                    </option>
                  ))}
                </select>
                {detailsErrors.role_id ? (
                  <span className="text-xs text-negative">
                    {detailsErrors.role_id.message}
                  </span>
                ) : null}
              </label>
            </div>
          ) : null}

          {step === 2 ? (
            <div className="flex flex-col gap-3">
              <TextInput
                label="Start date"
                type="date"
                error={wageErrors.start_date?.message}
                {...registerWage("start_date")}
              />
              <label className="flex w-full flex-col gap-1.5 text-sm">
                <span className="font-medium">Employment type</span>
                <select
                  className={`${selectClass} ${
                    wageErrors.employment_type_id ? "border-negative" : ""
                  }`}
                  value={watchWage("employment_type_id")}
                  onChange={(e) =>
                    setWageValue("employment_type_id", e.target.value, {
                      shouldValidate: true,
                    })
                  }
                >
                  <option value="">Select</option>
                  {employmentTypes.map((x) => (
                    <option key={x.id} value={x.id}>
                      {x.name}
                    </option>
                  ))}
                </select>
                {wageErrors.employment_type_id ? (
                  <span className="text-xs text-negative">
                    {wageErrors.employment_type_id.message}
                  </span>
                ) : null}
              </label>
              <label className="flex w-full flex-col gap-1.5 text-sm">
                <span className="font-medium">Payroll calendar</span>
                <select
                  className={`${selectClass} ${
                    wageErrors.payroll_calendar_id ? "border-negative" : ""
                  }`}
                  value={watchWage("payroll_calendar_id")}
                  onChange={(e) =>
                    setWageValue("payroll_calendar_id", e.target.value, {
                      shouldValidate: true,
                    })
                  }
                >
                  <option value="">Select</option>
                  {calendars.map((x) => (
                    <option key={x.id} value={x.id}>
                      {x.name}
                    </option>
                  ))}
                </select>
                {wageErrors.payroll_calendar_id ? (
                  <span className="text-xs text-negative">
                    {wageErrors.payroll_calendar_id.message}
                  </span>
                ) : null}
              </label>
              <fieldset className="flex flex-col gap-2">
                <legend className="text-sm font-medium">Pay type</legend>
                <div className="flex flex-wrap gap-2">
                  <RadioOption
                    name="pay_type"
                    value="HOURLY"
                    checked={payType === "HOURLY"}
                    label="Hourly"
                    onChange={(value) => {
                      setWageValue("pay_type", value, {
                        shouldValidate: true,
                      });
                      setWageValue("fixed_rate", "", {
                        shouldValidate: true,
                      });
                    }}
                  />
                  <RadioOption
                    name="pay_type"
                    value="FIXED"
                    checked={payType === "FIXED"}
                    label="Fixed"
                    onChange={(value) => {
                      setWageValue("pay_type", value, {
                        shouldValidate: true,
                      });
                      setWageValue("hourly_rate", "", {
                        shouldValidate: true,
                      });
                    }}
                  />
                </div>
              </fieldset>
              <label className="flex w-full flex-col gap-1.5 text-sm">
                <span className="font-medium">Currency</span>
                <select
                  className={selectClass}
                  value={wageCurrency}
                  onChange={(e) => {
                    const code = e.target.value.toUpperCase();
                    if (isSupportedCurrency(code)) {
                      setWageValue("currency", code, {
                        shouldValidate: true,
                      });
                    }
                  }}
                >
                  {SUPPORTED_CURRENCIES.map((c) => (
                    <option key={c.code} value={c.code}>
                      {c.label}
                    </option>
                  ))}
                </select>
              </label>
              {payType === "HOURLY" ? (
                <TextInput
                  label={`Hourly rate (${currencyDisplayPrefix(wageCurrency)})`}
                  type="number"
                  step="0.01"
                  min="0"
                  error={wageErrors.hourly_rate?.message}
                  {...registerWage("hourly_rate")}
                />
              ) : (
                <TextInput
                  label={`Fixed rate (${currencyDisplayPrefix(wageCurrency)})`}
                  type="number"
                  step="0.01"
                  min="0"
                  error={wageErrors.fixed_rate?.message}
                  {...registerWage("fixed_rate")}
                />
              )}
            </div>
          ) : null}

          {step === 3 ? (
            <div className="flex flex-col gap-3">
              <fieldset className="flex flex-col gap-2">
                <legend className="text-sm font-medium">Payment method</legend>
                <div className="flex flex-wrap gap-2">
                  {PAYMENT_METHOD_OPTIONS.map((opt) => (
                    <RadioOption
                      key={opt.value}
                      name="payment_method"
                      value={opt.value}
                      checked={paymentMethod === opt.value}
                      label={opt.label}
                      onChange={(value) => {
                        setPayrollValue("payment_method", value, {
                          shouldValidate: true,
                        });
                        if (value !== "BANK_TRANSFER") {
                          setPayrollValue("account_holder_name", "");
                          setPayrollValue("bank_name", "");
                          setPayrollValue("bank_account_number", "");
                          setPayrollValue("ifsc_code", "");
                          setPayrollValue("swift_code", "");
                        }
                      }}
                    />
                  ))}
                </div>
              </fieldset>
              {paymentMethod === "BANK_TRANSFER" ? (
                <div className="flex flex-col gap-3">
                  <TextInput
                    label="Account holder name"
                    error={payrollErrors.account_holder_name?.message}
                    {...registerPayroll("account_holder_name")}
                  />
                  <TextInput
                    label="Bank name"
                    error={payrollErrors.bank_name?.message}
                    {...registerPayroll("bank_name")}
                  />
                  <TextInput
                    label="Bank account number"
                    error={payrollErrors.bank_account_number?.message}
                    {...registerPayroll("bank_account_number")}
                  />
                  <div className="grid gap-3 sm:grid-cols-2">
                    <TextInput
                      label="IFSC code"
                      error={payrollErrors.ifsc_code?.message}
                      {...registerPayroll("ifsc_code")}
                    />
                    <TextInput
                      label="SWIFT code"
                      error={payrollErrors.swift_code?.message}
                      {...registerPayroll("swift_code")}
                    />
                  </div>
                </div>
              ) : null}
            </div>
          ) : null}
        </div>
      </div>
    </FullScreenModal>
  );
}

export function InviteEmployeeButton({
  employeeId,
}: {
  employeeId: string | number;
}) {
  const toast = useToastStore();
  const inviteMutation = useInviteEmployee();

  return (
    <Button
      variant="soft"
      className="px-2.5 py-1.5 text-xs"
      loading={inviteMutation.isPending}
      onClick={() => {
        void inviteMutation
          .mutateAsync(employeeId)
          .then(() => toast.success("Invitation sent"))
          .catch((err) =>
            toast.error("Invite failed", getErrorMessage(err)),
          );
      }}
    >
      Invite
    </Button>
  );
}
