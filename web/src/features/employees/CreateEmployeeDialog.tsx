import { useEffect, useMemo, useState } from "react";
import {
  useCreateEmployee,
  useEmployeeFormLookups,
  useInviteEmployee,
  useSearchEmployeeByEmail,
  useUpdateEmployee,
} from "@mytask/hooks";
import { getErrorMessage, isValidInternationalPhone, phoneValueFromE164, type PhoneValue } from "@mytask/utils";
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

const selectClass =
  "mt-focus rounded-xl border border-border bg-[var(--mt-surface)] px-3.5 py-3 text-[var(--mt-text)] outline-none focus:border-primary";

const STEPS = ["Email", "Details", "Wage", "Payroll"] as const;

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
    address: {
      address_1: string;
      address_2: string;
      city: string;
      state: { id?: number; name?: string; code?: string } | null;
      postcode: string;
      formatted_address?: string;
      street_address?: string;
      administrative_area?: string;
      postal_code?: string;
      country?: string;
      country_code?: string;
      place_id?: string;
      latitude?: string | number | null;
      longitude?: string | number | null;
    };
    role: NamedId | null;
    nok: string;
    nok_relationship: NamedId | null;
    nok_phone_number: string;
    nok_phone_country_code: string | null;
    nok_phone_country_iso: string | null;
  };
  wage: {
    start_date: string;
    employment_status: NamedId | null;
    payroll_calendar: NamedId | null;
    employment_type: NamedId | null;
    hourly_rate_exc_super: string;
    timesheet_submission_frequency: string;
    award_rate: NamedId | null;
  };
  payroll: {
    tax_file_number: string;
    superannuation_fund: string;
    superannuation_member_number: string;
    bank_bsb: string;
    bank_account_number: string;
    bank_account_name: string;
    bank_statement_text: string;
  };
};

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
      address: {
        address_1: "",
        address_2: "",
        city: "",
        state: null,
        postcode: "",
        formatted_address: "",
        street_address: "",
        administrative_area: "",
        postal_code: "",
        country: "",
        country_code: "",
        place_id: "",
        latitude: "",
        longitude: "",
      },
      role: null,
      nok: "",
      nok_relationship: null,
      nok_phone_number: "",
      nok_phone_country_code: null,
      nok_phone_country_iso: null,
    },
    wage: {
      start_date: "",
      employment_status: null,
      payroll_calendar: null,
      employment_type: null,
      hourly_rate_exc_super: "",
      timesheet_submission_frequency: "organisation-default",
      award_rate: null,
    },
    payroll: {
      tax_file_number: "",
      superannuation_fund: "",
      superannuation_member_number: "",
      bank_bsb: "",
      bank_account_number: "",
      bank_account_name: "",
      bank_statement_text: "",
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
      phone_country_code: (details.phone_country_code as string) || phoneValueFromE164(String(details.phone_number || "")).phone_country_code,
      phone_country_iso: (details.phone_country_iso as string) || phoneValueFromE164(String(details.phone_number || "")).phone_country_iso,
      address: {
        address_1: String(addressRaw.address_1 || ""),
        address_2: String(addressRaw.address_2 || ""),
        city: String(addressRaw.city || ""),
        state: asNamed(addressRaw.state),
        postcode: String(addressRaw.postcode || ""),
        formatted_address: String(addressRaw.formatted_address || ""),
        street_address: String(addressRaw.address_1 || ""),
        administrative_area: String(
          addressRaw.administrative_area ||
            (addressRaw.state as { name?: string } | undefined)?.name ||
            "",
        ),
        postal_code: String(addressRaw.postcode || ""),
        country: String(addressRaw.country || ""),
        country_code: String(addressRaw.country_code || ""),
        place_id: String(addressRaw.place_id || ""),
        latitude: (addressRaw.latitude as string | number | null) ?? "",
        longitude: (addressRaw.longitude as string | number | null) ?? "",
      },
      role: asNamed(details.role),
      nok: String(details.nok || ""),
      nok_relationship: asNamed(details.nok_relationship),
      nok_phone_number: String(details.nok_phone_number || ""),
      nok_phone_country_code: (details.nok_phone_country_code as string) || phoneValueFromE164(String(details.nok_phone_number || "")).phone_country_code,
      nok_phone_country_iso: (details.nok_phone_country_iso as string) || phoneValueFromE164(String(details.nok_phone_number || "")).phone_country_iso,
    },
    wage: {
      start_date: String(wage.start_date || ""),
      employment_status: asNamed(wage.employment_status),
      payroll_calendar: asNamed(wage.payroll_calendar),
      employment_type: asNamed(wage.employment_type),
      hourly_rate_exc_super: String(wage.hourly_rate_exc_super || ""),
      timesheet_submission_frequency: String(
        wage.timesheet_submission_frequency || "organisation-default",
      ),
      award_rate: asNamed(wage.award_rate),
    },
    payroll: {
      tax_file_number: String(payroll.tax_file_number || ""),
      superannuation_fund: String(payroll.superannuation_fund || ""),
      superannuation_member_number: String(
        payroll.superannuation_member_number || "",
      ),
      bank_bsb: String(payroll.bank_bsb || ""),
      bank_account_number: String(payroll.bank_account_number || ""),
      bank_account_name: String(payroll.bank_account_name || ""),
      bank_statement_text: String(payroll.bank_statement_text || ""),
    },
  };
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

  const roles = (lookups?.roles || []) as NamedId[];
  const nokRelations = (lookups?.nok_relations || []) as NamedId[];
  const employmentStatuses = (lookups?.employment_status || []) as NamedId[];
  const employmentTypes = (lookups?.employment_types || []) as NamedId[];
  const frequencies = (lookups?.timesheet_submission_frequencies ||
    []) as NamedId[];
  const calendars = (lookups?.payroll_calendars || []) as NamedId[];
  const awardRates = (lookups?.award_rates || []) as NamedId[];

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

  function patchAddress(
    partial: Partial<EmployeeForm["details"]["address"]>,
  ) {
    setForm((prev) => ({
      ...prev,
      details: {
        ...prev.details,
        address: { ...prev.details.address, ...partial },
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
          address: {
            address_1: String(addressRaw.address_1 || ""),
            address_2: String(addressRaw.address_2 || ""),
            city: String(addressRaw.city || ""),
            state: asNamed(addressRaw.state),
            postcode: String(addressRaw.postcode || ""),
            formatted_address: String(addressRaw.formatted_address || ""),
            street_address: String(addressRaw.address_1 || ""),
            administrative_area: String(
              addressRaw.administrative_area ||
                (addressRaw.state as { name?: string } | undefined)?.name ||
                "",
            ),
            postal_code: String(addressRaw.postcode || ""),
            country: String(addressRaw.country || ""),
            country_code: String(addressRaw.country_code || ""),
            place_id: String(addressRaw.place_id || ""),
            latitude: (addressRaw.latitude as string | number | null) ?? "",
            longitude: (addressRaw.longitude as string | number | null) ?? "",
          },
          role: asNamed(details.role),
          nok: String(details.nok || ""),
          nok_relationship: asNamed(details.nok_relationship),
          nok_phone_number: String(details.nok_phone_number || ""),
          nok_phone_country_code:
            (details.nok_phone_country_code as string) ||
            phoneValueFromE164(String(details.nok_phone_number || ""))
              .phone_country_code,
          nok_phone_country_iso:
            (details.nok_phone_country_iso as string) ||
            phoneValueFromE164(String(details.nok_phone_number || ""))
              .phone_country_iso,
        },
        wage: {
          start_date: String(wage.start_date || ""),
          employment_status: asNamed(wage.employment_status),
          payroll_calendar: asNamed(wage.payroll_calendar),
          employment_type: asNamed(wage.employment_type),
          hourly_rate_exc_super: String(wage.hourly_rate_exc_super || ""),
          timesheet_submission_frequency: String(
            wage.timesheet_submission_frequency || "organisation-default",
          ),
          award_rate: asNamed(wage.award_rate),
        },
        payroll: {
          tax_file_number: String(payroll.tax_file_number || ""),
          superannuation_fund: String(payroll.superannuation_fund || ""),
          superannuation_member_number: String(
            payroll.superannuation_member_number || "",
          ),
          bank_bsb: String(payroll.bank_bsb || ""),
          bank_account_number: String(payroll.bank_account_number || ""),
          bank_account_name: String(payroll.bank_account_name || ""),
          bank_statement_text: String(payroll.bank_statement_text || ""),
        },
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
    if (!(d.address.address_1 || d.address.formatted_address || "").trim()) {
      return "Please select an address from Google Places";
    }
    if (!d.phone_number.trim()) return "Phone number is required";
    if (!isValidInternationalPhone(d.phone_number)) {
      return "Enter a valid international phone number";
    }
    if (
      d.nok_phone_number.trim() &&
      !isValidInternationalPhone(d.nok_phone_number)
    ) {
      return "Enter a valid next-of-kin phone number";
    }
    if (!d.role?.id) return "Role is required";
    return null;
  }

  function validateWage(): string | null {
    const w = form.wage;
    if (!w.start_date) return "Start date is required";
    if (!w.employment_status?.id) return "Employment status is required";
    if (!w.payroll_calendar?.id) return "Payroll calendar is required";
    if (!w.employment_type?.id) return "Employment type is required";
    if (!w.hourly_rate_exc_super.trim())
      return "Hourly rate (exc super) is required";
    if (!w.timesheet_submission_frequency)
      return "Timesheet submission frequency is required";
    return null;
  }

  function validatePayroll(): string | null {
    const p = form.payroll;
    if (!p.tax_file_number.trim()) return "Tax file number is required";
    if (!p.superannuation_fund.trim()) return "Superannuation fund is required";
    if (!p.superannuation_member_number.trim())
      return "Superannuation member number is required";
    if (!p.bank_bsb.trim()) return "Bank BSB is required";
    if (!p.bank_account_number.trim()) return "Bank account number is required";
    if (!p.bank_account_name.trim()) return "Bank account name is required";
    if (!p.bank_statement_text.trim()) return "Bank statement text is required";
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
        address: {
          address_1: d.address.address_1.trim() || d.address.street_address || null,
          street_address: d.address.street_address || d.address.address_1.trim(),
          formatted_address: d.address.formatted_address || null,
          address_2: d.address.address_2.trim() || null,
          city: d.address.city.trim() || null,
          state: d.address.state,
          administrative_area: d.address.administrative_area || null,
          postcode: d.address.postal_code || d.address.postcode.trim() || null,
          postal_code: d.address.postal_code || d.address.postcode.trim() || null,
          country: d.address.country || null,
          country_code: d.address.country_code || null,
          place_id: d.address.place_id || null,
          latitude: d.address.latitude ?? null,
          longitude: d.address.longitude ?? null,
        },
        role: d.role,
        nok: d.nok.trim() || null,
        nok_relationship: d.nok_relationship,
        nok_phone_number: d.nok_phone_number.trim() || null,
        nok_phone_country_code: d.nok_phone_number.trim()
          ? d.nok_phone_country_code
          : null,
        nok_phone_country_iso: d.nok_phone_number.trim()
          ? d.nok_phone_country_iso
          : null,
      },
      wage: {
        start_date: form.wage.start_date,
        employment_status: form.wage.employment_status,
        payroll_calendar: form.wage.payroll_calendar,
        employment_type: form.wage.employment_type,
        hourly_rate_exc_super: form.wage.hourly_rate_exc_super,
        timesheet_submission_frequency:
          form.wage.timesheet_submission_frequency,
        award_rate: form.wage.award_rate,
      },
      payroll: { ...form.payroll },
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
                value={
                  {
                    ...emptyAddress(),
                    ...form.details.address,
                    street_address:
                      form.details.address.street_address ||
                      form.details.address.address_1,
                    formatted_address:
                      form.details.address.formatted_address || "",
                    postal_code:
                      form.details.address.postal_code ||
                      form.details.address.postcode,
                    administrative_area:
                      form.details.address.administrative_area ||
                      form.details.address.state?.name ||
                      "",
                  } as AddressValue
                }
                onChange={(next) =>
                  patchAddress({
                    address_1: next.street_address || next.address_1,
                    address_2: next.address_2 || "",
                    city: next.city || "",
                    state: next.state,
                    postcode: next.postal_code || next.postcode || "",
                    formatted_address: next.formatted_address,
                    street_address: next.street_address,
                    administrative_area: next.administrative_area,
                    postal_code: next.postal_code,
                    country: next.country,
                    country_code: next.country_code,
                    place_id: next.place_id,
                    latitude: next.latitude,
                    longitude: next.longitude,
                  })
                }
                requireCoordinates={false}
              />
              <div className="grid gap-3 sm:grid-cols-2">
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
              <div className="grid gap-3 sm:grid-cols-3">
                <TextInput
                  label="Next of kin"
                  value={form.details.nok}
                  onChange={(e) => patchDetails({ nok: e.target.value })}
                />
                <label className="flex w-full flex-col gap-1.5 text-sm">
                  <span className="font-medium">NOK relationship</span>
                  <select
                    className={selectClass}
                    value={form.details.nok_relationship?.id ?? ""}
                    onChange={(e) => {
                      const id = Number(e.target.value);
                      const matched =
                        nokRelations.find((r) => r.id === id) || null;
                      patchDetails({ nok_relationship: matched });
                    }}
                  >
                    <option value="">Optional</option>
                    {nokRelations.map((r) => (
                      <option key={r.id} value={r.id}>
                        {r.name}
                      </option>
                    ))}
                  </select>
                </label>
                <GlobalPhoneInput
                  label="NOK phone"
                  value={{
                    phone_number: form.details.nok_phone_number || null,
                    phone_country_code: form.details.nok_phone_country_code,
                    phone_country_iso: form.details.nok_phone_country_iso,
                  }}
                  onChange={(phone: PhoneValue) =>
                    patchDetails({
                      nok_phone_number: phone.phone_number || "",
                      nok_phone_country_code: phone.phone_country_code,
                      nok_phone_country_iso: phone.phone_country_iso,
                    })
                  }
                />
              </div>
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
                <span className="font-medium">Employment status</span>
                <select
                  className={selectClass}
                  value={form.wage.employment_status?.id ?? ""}
                  onChange={(e) => {
                    const id = Number(e.target.value);
                    patchWage({
                      employment_status:
                        employmentStatuses.find((x) => x.id === id) || null,
                    });
                  }}
                >
                  <option value="">Select</option>
                  {employmentStatuses.map((x) => (
                    <option key={x.id} value={x.id}>
                      {x.name}
                    </option>
                  ))}
                </select>
              </label>
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
              <TextInput
                label="Hourly rate (exc super)"
                type="number"
                step="0.01"
                value={form.wage.hourly_rate_exc_super}
                onChange={(e) =>
                  patchWage({ hourly_rate_exc_super: e.target.value })
                }
              />
              <label className="flex w-full flex-col gap-1.5 text-sm">
                <span className="font-medium">
                  Timesheet submission frequency
                </span>
                <select
                  className={selectClass}
                  value={form.wage.timesheet_submission_frequency}
                  onChange={(e) =>
                    patchWage({
                      timesheet_submission_frequency: e.target.value,
                    })
                  }
                >
                  <option value="organisation-default">
                    Organisation default
                  </option>
                  {frequencies.map((f) => (
                    <option key={f.id} value={f.code || String(f.id)}>
                      {f.name}
                    </option>
                  ))}
                </select>
              </label>
              <label className="flex w-full flex-col gap-1.5 text-sm">
                <span className="font-medium">Award rate (optional)</span>
                <select
                  className={selectClass}
                  value={form.wage.award_rate?.id ?? ""}
                  onChange={(e) => {
                    const id = Number(e.target.value);
                    patchWage({
                      award_rate: awardRates.find((x) => x.id === id) || null,
                    });
                  }}
                >
                  <option value="">None</option>
                  {awardRates.map((x) => (
                    <option key={x.id} value={x.id}>
                      {x.name}
                    </option>
                  ))}
                </select>
              </label>
            </div>
          ) : null}

          {step === 3 ? (
            <div className="flex flex-col gap-3">
              <TextInput
                label="Tax file number"
                value={form.payroll.tax_file_number}
                onChange={(e) =>
                  patchPayroll({ tax_file_number: e.target.value })
                }
              />
              <TextInput
                label="Superannuation fund"
                value={form.payroll.superannuation_fund}
                onChange={(e) =>
                  patchPayroll({ superannuation_fund: e.target.value })
                }
              />
              <TextInput
                label="Superannuation member number"
                value={form.payroll.superannuation_member_number}
                onChange={(e) =>
                  patchPayroll({
                    superannuation_member_number: e.target.value,
                  })
                }
              />
              <TextInput
                label="Bank BSB"
                value={form.payroll.bank_bsb}
                onChange={(e) => patchPayroll({ bank_bsb: e.target.value })}
              />
              <TextInput
                label="Bank account number"
                value={form.payroll.bank_account_number}
                onChange={(e) =>
                  patchPayroll({ bank_account_number: e.target.value })
                }
              />
              <TextInput
                label="Bank account name"
                value={form.payroll.bank_account_name}
                onChange={(e) =>
                  patchPayroll({ bank_account_name: e.target.value })
                }
              />
              <TextInput
                label="Bank statement text"
                value={form.payroll.bank_statement_text}
                onChange={(e) =>
                  patchPayroll({ bank_statement_text: e.target.value })
                }
              />
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
