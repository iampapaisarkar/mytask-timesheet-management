import { useEffect, useMemo, useState } from "react";
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
  isSupportedCurrency,
  type SupportedCurrencyCode,
} from "@mytask/constants";
import { getErrorMessage, isValidInternationalPhone, phoneValueFromE164, fromAddressRecord, toAddressApiPayload, hasAddressContent, type PhoneValue, type GlobalAddress } from "@mytask/utils";
import { Button } from "@/components/ui/Button";
import { FullScreenModal } from "@/components/ui/FullScreenModal";
import { TextInput } from "@/components/ui/TextInput";
import { GlobalPhoneInput } from "@/components/ui/GlobalPhoneInput";
import {
  GoogleAddressAutocomplete,
  emptyAddress,
} from "@/components/GoogleAddress";
import { useToastStore } from "@/store/toastStore";

const selectClass =
  "mt-focus rounded-xl border border-border bg-[var(--mt-surface)] px-3.5 py-3 text-[var(--mt-text)] outline-none focus:border-primary";

const STEPS = ["Email", "Details", "Wage", "Payroll"] as const;

type PayType = "HOURLY" | "FIXED";
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

type EmployeeForm = {
  action: { create_user: boolean; message?: string } | null;
  details: {
    first_name: string;
    middle_name: string;
    last_name: string;
    email: string;
    preferred_name: string;
    dob: string;
    phone_number: string;
    phone_country_code: string | null;
    phone_country_iso: string | null;
    address: GlobalAddress;
    role: NamedId | null;
  };
  wage: {
    start_date: string;
    employment_type: NamedId | null;
    payroll_calendar: NamedId | null;
    pay_type: PayType;
    currency: SupportedCurrencyCode;
    hourly_rate_exc_super: string;
    fixed_rate_exc_super: string;
  };
  payroll: {
    payment_method: PaymentMethod;
    account_holder_name: string;
    bank_name: string;
    bank_account_number: string;
    ifsc_code: string;
    swift_code: string;
  };
};

const PAYMENT_METHOD_OPTIONS: { value: PaymentMethod; label: string }[] = [
  { value: "CASH", label: "Cash" },
  { value: "DIRECT_DEBIT", label: "Direct Debit" },
  { value: "BANK_TRANSFER", label: "Bank Transfer" },
];

function emptyForm(email = ""): EmployeeForm {
  return {
    action: null,
    details: {
      first_name: "",
      middle_name: "",
      last_name: "",
      email,
      preferred_name: "",
      dob: "",
      phone_number: "",
      phone_country_code: null,
      phone_country_iso: null,
      address: emptyAddress(),
      role: null,
    },
    wage: {
      start_date: "",
      employment_type: null,
      payroll_calendar: null,
      pay_type: "HOURLY",
      currency: DEFAULT_CURRENCY,
      hourly_rate_exc_super: "",
      fixed_rate_exc_super: "",
    },
    payroll: {
      payment_method: "CASH",
      account_holder_name: "",
      bank_name: "",
      bank_account_number: "",
      ifsc_code: "",
      swift_code: "",
    },
  };
}

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

function asPayType(raw: unknown): PayType {
  const value = String(raw || "").toUpperCase();
  return value === "FIXED" ? "FIXED" : "HOURLY";
}

function asPaymentMethod(raw: unknown): PaymentMethod {
  const value = String(raw || "").toUpperCase();
  if (value === "DIRECT_DEBIT" || value === "BANK_TRANSFER") return value;
  return "CASH";
}

function mapWageFromRaw(wage: Record<string, unknown>): EmployeeForm["wage"] {
  const payType = asPayType(wage.pay_type);
  const rawCurrency = String(wage.currency || DEFAULT_CURRENCY).toUpperCase();
  return {
    start_date: String(wage.start_date || ""),
    employment_type: asNamed(wage.employment_type),
    payroll_calendar: asNamed(wage.payroll_calendar),
    pay_type: payType,
    currency: isSupportedCurrency(rawCurrency)
      ? rawCurrency
      : DEFAULT_CURRENCY,
    hourly_rate_exc_super:
      payType === "HOURLY" ? String(wage.hourly_rate_exc_super ?? "") : "",
    fixed_rate_exc_super:
      payType === "FIXED" ? String(wage.fixed_rate_exc_super ?? "") : "",
  };
}

function mapPayrollFromRaw(
  payroll: Record<string, unknown>,
): EmployeeForm["payroll"] {
  const paymentMethod = asPaymentMethod(payroll.payment_method);
  const isBank = paymentMethod === "BANK_TRANSFER";
  return {
    payment_method: paymentMethod,
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

function mapDetailsAddress(addressRaw: Record<string, unknown>) {
  return fromAddressRecord(addressRaw);
}

function formFromEmployeeRow(row: EmployeeListRow): EmployeeForm {
  const details = (row.details || {}) as Record<string, unknown>;
  const addressRaw =
    details.address && typeof details.address === "object"
      ? (details.address as Record<string, unknown>)
      : {};
  const wage = (row.wage || {}) as Record<string, unknown>;
  const payroll = (row.payroll || {}) as Record<string, unknown>;

  return {
    action: { create_user: false },
    details: {
      first_name: String(details.first_name || ""),
      middle_name: String(details.middle_name || ""),
      last_name: String(details.last_name || ""),
      email: String(details.email || ""),
      preferred_name: String(details.preferred_name || ""),
      dob: String(details.dob || ""),
      phone_number: String(details.phone_number || ""),
      phone_country_code:
        (details.phone_country_code as string) ||
        phoneValueFromE164(String(details.phone_number || "")).phone_country_code,
      phone_country_iso:
        (details.phone_country_iso as string) ||
        phoneValueFromE164(String(details.phone_number || "")).phone_country_iso,
      address: mapDetailsAddress(addressRaw),
      role: asNamed(details.role),
    },
    wage: mapWageFromRaw(wage),
    payroll: mapPayrollFromRaw(payroll),
  };
}

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
  const searchMutation = useSearchEmployeeByEmail();
  const createMutation = useCreateEmployee();
  const updateMutation = useUpdateEmployee();
  const isEdit = employee != null && (employee.details?.id != null || employee.id != null);
  const employeeId = employee?.details?.id ?? employee?.id;
  const [step, setStep] = useState(isEdit ? 1 : 0);
  const [email, setEmail] = useState("");
  const [form, setForm] = useState<EmployeeForm>(() => emptyForm());

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
      setEmail("");
      setForm(emptyForm());
      return;
    }
    if (employee) {
      const next = formFromEmployeeRow(employee);
      setForm(next);
      setEmail(next.details.email);
      setStep(1);
    } else {
      setStep(0);
      setEmail("");
      setForm(emptyForm());
    }
  }, [open, employee]);

  const stepLabel = useMemo(() => STEPS[step] || "", [step]);

  if (!open) return null;

  function patchDetails(partial: Partial<EmployeeForm["details"]>) {
    setForm((prev) => ({
      ...prev,
      details: { ...prev.details, ...partial },
    }));
  }

  function patchAddress(next: EmployeeForm["details"]["address"]) {
    setForm((prev) => ({
      ...prev,
      details: {
        ...prev.details,
        address: next,
      },
    }));
  }

  function patchWage(partial: Partial<EmployeeForm["wage"]>) {
    setForm((prev) => ({ ...prev, wage: { ...prev.wage, ...partial } }));
  }

  function patchPayroll(partial: Partial<EmployeeForm["payroll"]>) {
    setForm((prev) => ({
      ...prev,
      payroll: { ...prev.payroll, ...partial },
    }));
  }

  function setPayType(payType: PayType) {
    setForm((prev) => ({
      ...prev,
      wage: {
        ...prev.wage,
        pay_type: payType,
        hourly_rate_exc_super:
          payType === "HOURLY" ? prev.wage.hourly_rate_exc_super : "",
        fixed_rate_exc_super:
          payType === "FIXED" ? prev.wage.fixed_rate_exc_super : "",
      },
    }));
  }

  function setPaymentMethod(method: PaymentMethod) {
    setForm((prev) => ({
      ...prev,
      payroll: {
        payment_method: method,
        account_holder_name:
          method === "BANK_TRANSFER" ? prev.payroll.account_holder_name : "",
        bank_name: method === "BANK_TRANSFER" ? prev.payroll.bank_name : "",
        bank_account_number:
          method === "BANK_TRANSFER" ? prev.payroll.bank_account_number : "",
        ifsc_code: method === "BANK_TRANSFER" ? prev.payroll.ifsc_code : "",
        swift_code: method === "BANK_TRANSFER" ? prev.payroll.swift_code : "",
      },
    }));
  }

  async function handleSearch() {
    if (!email.trim() || !email.includes("@")) {
      toast.warning("Enter a valid email");
      return;
    }
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
      const action = (data.action || {
        create_user: true,
      }) as EmployeeForm["action"];

      setForm({
        action,
        details: {
          first_name: String(details.first_name || ""),
          middle_name: String(details.middle_name || ""),
          last_name: String(details.last_name || ""),
          email: String(details.email || email.trim()),
          preferred_name: String(details.preferred_name || ""),
          dob: String(details.dob || ""),
          phone_number: String(details.phone_number || ""),
          phone_country_code:
            (details.phone_country_code as string) ||
            phoneValueFromE164(String(details.phone_number || ""))
              .phone_country_code,
          phone_country_iso:
            (details.phone_country_iso as string) ||
            phoneValueFromE164(String(details.phone_number || ""))
              .phone_country_iso,
          address: mapDetailsAddress(addressRaw as Record<string, unknown>),
          role: asNamed(details.role),
        },
        wage: mapWageFromRaw(wage),
        payroll: mapPayrollFromRaw(payroll),
      });
      setStep(1);
      if (action?.message) {
        toast.info("Email lookup", action.message);
      }
    } catch (err) {
      toast.error("Search failed", getErrorMessage(err));
    }
  }

  function validateDetails(): string | null {
    const d = form.details;
    if (form.action?.create_user) {
      if (!d.first_name.trim()) return "First name is required";
      if (!d.last_name.trim()) return "Last name is required";
    }
    if (!d.email.trim()) return "Email is required";
    if (!d.dob) return "Date of birth is required";
    if (!hasAddressContent(d.address)) {
      return "Please select or enter an address";
    }
    if (!d.phone_number.trim()) return "Phone number is required";
    if (!isValidInternationalPhone(d.phone_number)) {
      return "Enter a valid international phone number";
    }
    if (!d.role?.id) return "Role is required";
    if (String(d.role.code || "").toLowerCase() === "owner") {
      return "Organisation Owner cannot be assigned";
    }
    return null;
  }

  function validateWage(): string | null {
    const w = form.wage;
    if (!w.start_date) return "Start date is required";
    if (!w.employment_type?.id) return "Employment type is required";
    if (String(w.employment_type.code || "").toUpperCase() === "CONTRACT") {
      return "Contract employment type is not allowed";
    }
    if (!w.payroll_calendar?.id) return "Payroll calendar is required";
    if (!isSupportedCurrency(w.currency)) {
      return "Currency must be a supported currency code";
    }
    if (w.pay_type === "HOURLY") {
      if (!w.hourly_rate_exc_super.trim()) {
        return "Hourly rate is required";
      }
      if (Number(w.hourly_rate_exc_super) <= 0) {
        return "Hourly rate must be greater than 0";
      }
    } else {
      if (!w.fixed_rate_exc_super.trim()) {
        return "Fixed rate is required";
      }
      if (Number(w.fixed_rate_exc_super) <= 0) {
        return "Fixed rate must be greater than 0";
      }
    }
    return null;
  }

  function validatePayroll(): string | null {
    const p = form.payroll;
    if (!p.payment_method) return "Payment method is required";
    if (p.payment_method === "BANK_TRANSFER") {
      if (!p.account_holder_name.trim())
        return "Account holder name is required";
      if (!p.bank_name.trim()) return "Bank name is required";
      if (!p.bank_account_number.trim())
        return "Bank account number is required";
      if (!p.ifsc_code.trim()) return "IFSC code is required";
      if (!p.swift_code.trim()) return "SWIFT code is required";
    }
    return null;
  }

  function goNext() {
    if (step === 1) {
      const err = validateDetails();
      if (err) {
        toast.warning(err);
        return;
      }
    }
    if (step === 2) {
      const err = validateWage();
      if (err) {
        toast.warning(err);
        return;
      }
    }
    setStep((s) => Math.min(s + 1, STEPS.length - 1));
  }

  async function handleCreate() {
    const detailErr = validateDetails();
    if (detailErr) {
      toast.warning(detailErr);
      setStep(1);
      return;
    }
    const wageErr = validateWage();
    if (wageErr) {
      toast.warning(wageErr);
      setStep(2);
      return;
    }
    const payrollErr = validatePayroll();
    if (payrollErr) {
      toast.warning(payrollErr);
      return;
    }

    const d = form.details;
    const w = form.wage;
    const p = form.payroll;
    const isBank = p.payment_method === "BANK_TRANSFER";

    const payload = {
      action: {
        create_user: Boolean(form.action?.create_user),
      },
      details: {
        first_name: d.first_name.trim() || null,
        middle_name: d.middle_name.trim() || null,
        last_name: d.last_name.trim() || null,
        email: d.email.trim(),
        preferred_name: d.preferred_name.trim() || null,
        dob: d.dob,
        phone_number: d.phone_number.trim(),
        phone_country_code: d.phone_country_code,
        phone_country_iso: d.phone_country_iso,
        address: toAddressApiPayload(d.address, { includeCoordinates: false }),
        role: d.role,
      },
      wage: {
        start_date: w.start_date,
        employment_type: w.employment_type
          ? { id: w.employment_type.id, code: w.employment_type.code }
          : null,
        payroll_calendar: w.payroll_calendar
          ? { id: w.payroll_calendar.id }
          : null,
        pay_type: w.pay_type,
        currency: w.currency,
        hourly_rate_exc_super:
          w.pay_type === "HOURLY" ? w.hourly_rate_exc_super || null : null,
        fixed_rate_exc_super:
          w.pay_type === "FIXED" ? w.fixed_rate_exc_super || null : null,
      },
      payroll: {
        payment_method: p.payment_method,
        ...(isBank
          ? {
              account_holder_name: p.account_holder_name.trim(),
              bank_name: p.bank_name.trim(),
              bank_account_number: p.bank_account_number.trim(),
              ifsc_code: p.ifsc_code.trim(),
              swift_code: p.swift_code.trim(),
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
              <Button
                loading={searchMutation.isPending}
                onClick={() => void handleSearch()}
              >
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
                onClick={() => void handleCreate()}
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
                value={email}
                onChange={(e) => setEmail(e.target.value)}
              />
            </div>
          ) : null}

          {step === 1 ? (
            <div className="flex flex-col gap-3">
              {form.action?.message ? (
                <p className="rounded-xl bg-primary-muted/60 px-3 py-2 text-sm text-[var(--mt-text)]">
                  {form.action.message}
                </p>
              ) : null}
              <div className="grid gap-3 sm:grid-cols-3">
                <TextInput
                  label="First name"
                  value={form.details.first_name}
                  onChange={(e) => patchDetails({ first_name: e.target.value })}
                  disabled={form.action?.create_user === false}
                />
                <TextInput
                  label="Middle name"
                  value={form.details.middle_name}
                  onChange={(e) =>
                    patchDetails({ middle_name: e.target.value })
                  }
                  disabled={form.action?.create_user === false}
                />
                <TextInput
                  label="Last name"
                  value={form.details.last_name}
                  onChange={(e) => patchDetails({ last_name: e.target.value })}
                  disabled={form.action?.create_user === false}
                />
              </div>
              <TextInput
                label="Email"
                type="email"
                value={form.details.email}
                onChange={(e) => patchDetails({ email: e.target.value })}
                disabled
              />
              <TextInput
                label="Preferred name"
                value={form.details.preferred_name}
                onChange={(e) =>
                  patchDetails({ preferred_name: e.target.value })
                }
              />
              <div className="grid gap-3 sm:grid-cols-2">
                <TextInput
                  label="Date of birth"
                  type="date"
                  value={form.details.dob}
                  onChange={(e) => patchDetails({ dob: e.target.value })}
                  disabled={form.action?.create_user === false && !!form.details.dob}
                />
                <GlobalPhoneInput
                  label="Phone number"
                  required
                  value={{
                    phone_number: form.details.phone_number || null,
                    phone_country_code: form.details.phone_country_code,
                    phone_country_iso: form.details.phone_country_iso,
                  }}
                  onChange={(phone: PhoneValue) =>
                    patchDetails({
                      phone_number: phone.phone_number || "",
                      phone_country_code: phone.phone_country_code,
                      phone_country_iso: phone.phone_country_iso,
                    })
                  }
                />
              </div>
              <GoogleAddressAutocomplete
                label="Address"
                value={form.details.address}
                onChange={(next) => patchAddress(next)}
                requireCoordinates={false}
              />
              <label className="flex w-full flex-col gap-1.5 text-sm">
                <span className="font-medium">Role</span>
                <select
                  className={selectClass}
                  value={form.details.role?.id ?? ""}
                  onChange={(e) => {
                    const id = Number(e.target.value);
                    const matched = roles.find((r) => r.id === id) || null;
                    patchDetails({ role: matched });
                  }}
                >
                  <option value="">Select role</option>
                  {roles.map((r) => (
                    <option key={r.id} value={r.id}>
                      {r.name}
                    </option>
                  ))}
                </select>
              </label>
            </div>
          ) : null}

          {step === 2 ? (
            <div className="flex flex-col gap-3">
              <TextInput
                label="Start date"
                type="date"
                value={form.wage.start_date}
                onChange={(e) => patchWage({ start_date: e.target.value })}
              />
              <label className="flex w-full flex-col gap-1.5 text-sm">
                <span className="font-medium">Employment type</span>
                <select
                  className={selectClass}
                  value={form.wage.employment_type?.id ?? ""}
                  onChange={(e) => {
                    const id = Number(e.target.value);
                    patchWage({
                      employment_type:
                        employmentTypes.find((x) => x.id === id) || null,
                    });
                  }}
                >
                  <option value="">Select</option>
                  {employmentTypes.map((x) => (
                    <option key={x.id} value={x.id}>
                      {x.name}
                    </option>
                  ))}
                </select>
              </label>
              <label className="flex w-full flex-col gap-1.5 text-sm">
                <span className="font-medium">Payroll calendar</span>
                <select
                  className={selectClass}
                  value={form.wage.payroll_calendar?.id ?? ""}
                  onChange={(e) => {
                    const id = Number(e.target.value);
                    patchWage({
                      payroll_calendar:
                        calendars.find((x) => x.id === id) || null,
                    });
                  }}
                >
                  <option value="">Select</option>
                  {calendars.map((x) => (
                    <option key={x.id} value={x.id}>
                      {x.name}
                    </option>
                  ))}
                </select>
              </label>
              <fieldset className="flex flex-col gap-2">
                <legend className="text-sm font-medium">Pay type</legend>
                <div className="flex flex-wrap gap-2">
                  <RadioOption
                    name="pay_type"
                    value="HOURLY"
                    checked={form.wage.pay_type === "HOURLY"}
                    label="Hourly"
                    onChange={setPayType}
                  />
                  <RadioOption
                    name="pay_type"
                    value="FIXED"
                    checked={form.wage.pay_type === "FIXED"}
                    label="Fixed"
                    onChange={setPayType}
                  />
                </div>
              </fieldset>
              <label className="flex w-full flex-col gap-1.5 text-sm">
                <span className="font-medium">Currency</span>
                <select
                  className={selectClass}
                  value={form.wage.currency}
                  onChange={(e) => {
                    const code = e.target.value.toUpperCase();
                    if (isSupportedCurrency(code)) {
                      patchWage({ currency: code });
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
              {form.wage.pay_type === "HOURLY" ? (
                <TextInput
                  label="Hourly rate"
                  type="number"
                  step="0.01"
                  min="0"
                  value={form.wage.hourly_rate_exc_super}
                  onChange={(e) =>
                    patchWage({ hourly_rate_exc_super: e.target.value })
                  }
                />
              ) : (
                <TextInput
                  label="Fixed rate"
                  type="number"
                  step="0.01"
                  min="0"
                  value={form.wage.fixed_rate_exc_super}
                  onChange={(e) =>
                    patchWage({ fixed_rate_exc_super: e.target.value })
                  }
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
                      checked={form.payroll.payment_method === opt.value}
                      label={opt.label}
                      onChange={setPaymentMethod}
                    />
                  ))}
                </div>
              </fieldset>
              {form.payroll.payment_method === "BANK_TRANSFER" ? (
                <div className="flex flex-col gap-3">
                  <TextInput
                    label="Account holder name"
                    value={form.payroll.account_holder_name}
                    onChange={(e) =>
                      patchPayroll({ account_holder_name: e.target.value })
                    }
                  />
                  <TextInput
                    label="Bank name"
                    value={form.payroll.bank_name}
                    onChange={(e) =>
                      patchPayroll({ bank_name: e.target.value })
                    }
                  />
                  <TextInput
                    label="Bank account number"
                    value={form.payroll.bank_account_number}
                    onChange={(e) =>
                      patchPayroll({ bank_account_number: e.target.value })
                    }
                  />
                  <div className="grid gap-3 sm:grid-cols-2">
                    <TextInput
                      label="IFSC code"
                      value={form.payroll.ifsc_code}
                      onChange={(e) =>
                        patchPayroll({ ifsc_code: e.target.value })
                      }
                    />
                    <TextInput
                      label="SWIFT code"
                      value={form.payroll.swift_code}
                      onChange={(e) =>
                        patchPayroll({ swift_code: e.target.value })
                      }
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
