import { useCallback, useEffect, useMemo, useState } from "react";
import {
  ActivityIndicator,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
} from "react-native";
import type { BottomSheetModal } from "@gorhom/bottom-sheet";
import {
  useCreateEmployee,
  useEmployeeFormLookups,
  useSearchEmployeeByEmail,
  useUpdateEmployee,
} from "@mytask/hooks";
import {
  DEFAULT_CURRENCY,
  SUPPORTED_CURRENCIES,
  type SupportedCurrencyCode,
} from "@mytask/constants";
import { spacing } from "@mytask/theme";
import type { NamedLookup } from "@mytask/types";
import {
  getErrorMessage,
  hasAddressContent,
  normalizeAddress,
  phoneValueFromE164,
  type GlobalAddress,
} from "@mytask/utils";
import { PlacesAddressInput } from "./PlacesAddressInput";
import { MobileSelect } from "./MobileSelect";
import { AppBottomSheet, BottomSheetTextInput, SegmentedControl } from "../ui";
import { useThemeStore } from "../store/themeStore";
import { useToastStore } from "../store/toastStore";
import { triggerHaptic } from "../utils/haptics";

type Step = "email" | "details" | "wage" | "payroll";

type EmployeeSeed = {
  id?: number | string;
  details?: {
    first_name?: string;
    middle_name?: string;
    last_name?: string;
    email?: string;
    preferred_name?: string;
    dob?: string;
    phone_number?: string;
    phone_country_iso?: string;
    address?: Partial<GlobalAddress> | string | null;
    role?: { id?: number | string; name?: string; code?: string } | null;
  };
  wage?: {
    start_date?: string;
    employment_type?: {
      id?: number | string;
      name?: string;
      code?: string;
    } | null;
    payroll_calendar?: {
      id?: number | string;
      name?: string;
      code?: string;
    } | null;
    pay_type?: string;
    currency?: string;
    hourly_rate_exc_super?: string | number | null;
    fixed_rate_exc_super?: string | number | null;
  };
  payroll?: {
    payment_method?: string;
    account_holder_name?: string;
    bank_name?: string;
    bank_account_number?: string;
    ifsc_code?: string;
    swift_code?: string;
  };
};

type FormState = {
  email: string;
  firstName: string;
  middleName: string;
  lastName: string;
  preferredName: string;
  dob: string;
  phone: string;
  address: GlobalAddress | null;
  roleId: string;
  startDate: string;
  employmentTypeId: string;
  payrollCalendarId: string;
  payType: "HOURLY" | "FIXED";
  currency: SupportedCurrencyCode;
  hourlyRate: string;
  fixedRate: string;
  paymentMethod: "CASH" | "DIRECT_DEBIT" | "BANK_TRANSFER";
  accountHolder: string;
  bankName: string;
  bankAccount: string;
  ifsc: string;
  swift: string;
  createUser: boolean;
  actionMessage: string | null;
  lockIdentity: boolean;
};

function emptyForm(): FormState {
  return {
    email: "",
    firstName: "",
    middleName: "",
    lastName: "",
    preferredName: "",
    dob: "",
    phone: "",
    address: null,
    roleId: "",
    startDate: "",
    employmentTypeId: "",
    payrollCalendarId: "",
    payType: "HOURLY",
    currency: DEFAULT_CURRENCY,
    hourlyRate: "",
    fixedRate: "",
    paymentMethod: "CASH",
    accountHolder: "",
    bankName: "",
    bankAccount: "",
    ifsc: "",
    swift: "",
    createUser: true,
    actionMessage: null,
    lockIdentity: false,
  };
}

function addressFromUnknown(
  raw: Partial<GlobalAddress> | string | null | undefined,
): GlobalAddress | null {
  if (!raw) return null;
  if (typeof raw === "string") {
    const line = raw.trim();
    if (!line) return null;
    return normalizeAddress({
      address_line_1: line,
      formatted_address: line,
    });
  }
  return normalizeAddress(raw);
}

function formFromEmployee(row: EmployeeSeed): FormState {
  const d = row.details;
  const w = row.wage;
  const p = row.payroll;
  const phone = phoneValueFromE164(d?.phone_number, d?.phone_country_iso);
  const payType =
    String(w?.pay_type || "HOURLY").toUpperCase() === "FIXED"
      ? "FIXED"
      : "HOURLY";
  const method = String(p?.payment_method || "CASH").toUpperCase();
  return {
    ...emptyForm(),
    email: d?.email || "",
    firstName: d?.first_name || "",
    middleName: d?.middle_name || "",
    lastName: d?.last_name || "",
    preferredName: d?.preferred_name || "",
    dob: (d?.dob as string) || "",
    phone: phone.phone_number || d?.phone_number || "",
    address: addressFromUnknown(d?.address),
    roleId: d?.role?.id != null ? String(d.role.id) : "",
    startDate: (w?.start_date as string) || "",
    employmentTypeId:
      w?.employment_type?.id != null ? String(w.employment_type.id) : "",
    payrollCalendarId:
      w?.payroll_calendar?.id != null ? String(w.payroll_calendar.id) : "",
    payType,
    currency: (w?.currency as SupportedCurrencyCode) || DEFAULT_CURRENCY,
    hourlyRate:
      w?.hourly_rate_exc_super != null ? String(w.hourly_rate_exc_super) : "",
    fixedRate:
      w?.fixed_rate_exc_super != null ? String(w.fixed_rate_exc_super) : "",
    paymentMethod:
      method === "BANK_TRANSFER" || method === "DIRECT_DEBIT"
        ? method
        : "CASH",
    accountHolder: p?.account_holder_name || "",
    bankName: p?.bank_name || "",
    bankAccount: p?.bank_account_number || "",
    ifsc: p?.ifsc_code || "",
    swift: p?.swift_code || "",
    createUser: false,
    lockIdentity: true,
  };
}

type Props = {
  sheetRef: React.RefObject<BottomSheetModal | null>;
  employee: EmployeeSeed | null;
  open: boolean;
  onClose: () => void;
};

export function EmployeeFormSheet({
  sheetRef,
  employee,
  open,
  onClose,
}: Props) {
  const isEdit = Boolean(employee?.id);
  const c = useThemeStore((s) => s.colors);
  const toast = useToastStore();
  const [step, setStep] = useState<Step>(isEdit ? "details" : "email");
  const [form, setForm] = useState<FormState>(emptyForm());

  const lookupsQuery = useEmployeeFormLookups(open);
  const searchMutation = useSearchEmployeeByEmail();
  const createMutation = useCreateEmployee();
  const updateMutation = useUpdateEmployee();

  useEffect(() => {
    if (!open) return;
    if (employee) {
      setForm(formFromEmployee(employee));
      setStep("details");
    } else {
      setForm(emptyForm());
      setStep("email");
    }
  }, [open, employee]);

  const roles = useMemo(() => {
    const raw = (lookupsQuery.data?.organisation_roles ||
      lookupsQuery.data?.roles ||
      []) as NamedLookup[];
    return raw.filter((r) => String(r.code || "").toLowerCase() !== "owner");
  }, [lookupsQuery.data]);

  const employmentTypes = useMemo(() => {
    const raw = (lookupsQuery.data?.employment_types || []) as NamedLookup[];
    return raw.filter((t) => String(t.code || "").toUpperCase() !== "CONTRACT");
  }, [lookupsQuery.data]);

  const calendars = (lookupsQuery.data?.payroll_calendars ||
    []) as NamedLookup[];

  const patch = useCallback((partial: Partial<FormState>) => {
    setForm((prev) => ({ ...prev, ...partial }));
  }, []);

  const inputStyle = [
    styles.input,
    { borderColor: c.border, backgroundColor: c.bg, color: c.text },
  ];

  async function handleSearch() {
    if (!form.email.trim() || !form.email.includes("@")) {
      toast.warning("Enter a valid email");
      return;
    }
    try {
      const data = await searchMutation.mutateAsync(form.email.trim());
      const details = (data.details || {}) as Record<string, unknown>;
      const wage = (data.wage || {}) as Record<string, unknown>;
      const payroll = (data.payroll || {}) as Record<string, unknown>;
      const action = (data.action || {}) as {
        create_user?: boolean;
        message?: string;
      };
      const createUser = action.create_user !== false;
      const phone = phoneValueFromE164(
        details.phone_number as string | undefined,
        details.phone_country_iso as string | undefined,
      );
      patch({
        email: String(details.email || form.email.trim()),
        firstName: String(details.first_name || ""),
        middleName: String(details.middle_name || ""),
        lastName: String(details.last_name || ""),
        preferredName: String(details.preferred_name || ""),
        dob: String(details.dob || ""),
        phone: phone.phone_number || String(details.phone_number || ""),
        address: addressFromUnknown(
          details.address as Partial<GlobalAddress> | string | null,
        ),
        startDate: String(wage.start_date || ""),
        payType:
          String(wage.pay_type || "HOURLY").toUpperCase() === "FIXED"
            ? "FIXED"
            : "HOURLY",
        currency:
          (wage.currency as SupportedCurrencyCode) || DEFAULT_CURRENCY,
        hourlyRate:
          wage.hourly_rate_exc_super != null
            ? String(wage.hourly_rate_exc_super)
            : "",
        fixedRate:
          wage.fixed_rate_exc_super != null
            ? String(wage.fixed_rate_exc_super)
            : "",
        paymentMethod: (() => {
          const m = String(payroll.payment_method || "CASH").toUpperCase();
          return m === "BANK_TRANSFER" || m === "DIRECT_DEBIT" ? m : "CASH";
        })(),
        accountHolder: String(payroll.account_holder_name || ""),
        bankName: String(payroll.bank_name || ""),
        bankAccount: String(payroll.bank_account_number || ""),
        ifsc: String(payroll.ifsc_code || ""),
        swift: String(payroll.swift_code || ""),
        createUser,
        actionMessage: action.message || null,
        lockIdentity: !createUser,
      });
      setStep("details");
      if (action.message) toast.info("Email lookup", action.message);
    } catch (err) {
      toast.error("Search failed", getErrorMessage(err));
    }
  }

  function validateDetails(): boolean {
    if (form.createUser && !form.firstName.trim()) {
      toast.warning("First name is required");
      return false;
    }
    if (form.createUser && !form.lastName.trim()) {
      toast.warning("Last name is required");
      return false;
    }
    if (!form.email.trim()) {
      toast.warning("Email is required");
      return false;
    }
    if (!form.dob.trim()) {
      toast.warning("Date of birth is required");
      return false;
    }
    if (!hasAddressContent(form.address)) {
      toast.warning("Please select or enter an address");
      return false;
    }
    if (!form.phone.trim()) {
      toast.warning("Phone number is required");
      return false;
    }
    const phone = phoneValueFromE164(form.phone.trim());
    if (!phone.phone_number) {
      toast.warning("Enter a valid international phone number");
      return false;
    }
    if (!form.roleId) {
      toast.warning("Role is required");
      return false;
    }
    const role = roles.find((r) => String(r.id) === form.roleId);
    if (String(role?.code || "").toLowerCase() === "owner") {
      toast.warning("Organisation Owner cannot be assigned");
      return false;
    }
    return true;
  }

  function validateWage(): boolean {
    if (!form.startDate.trim()) {
      toast.warning("Start date is required");
      return false;
    }
    if (!form.employmentTypeId) {
      toast.warning("Employment type is required");
      return false;
    }
    const emp = employmentTypes.find(
      (t) => String(t.id) === form.employmentTypeId,
    );
    if (String(emp?.code || "").toUpperCase() === "CONTRACT") {
      toast.warning("Contract employment type is not allowed");
      return false;
    }
    if (!form.payrollCalendarId) {
      toast.warning("Payroll calendar is required");
      return false;
    }
    if (form.payType === "HOURLY") {
      if (!form.hourlyRate.trim()) {
        toast.warning("Hourly rate is required");
        return false;
      }
      if (Number(form.hourlyRate) <= 0) {
        toast.warning("Hourly rate must be greater than 0");
        return false;
      }
    } else {
      if (!form.fixedRate.trim()) {
        toast.warning("Fixed rate is required");
        return false;
      }
      if (Number(form.fixedRate) <= 0) {
        toast.warning("Fixed rate must be greater than 0");
        return false;
      }
    }
    return true;
  }

  function validatePayroll(): boolean {
    if (!form.paymentMethod) {
      toast.warning("Payment method is required");
      return false;
    }
    if (form.paymentMethod === "BANK_TRANSFER") {
      if (!form.accountHolder.trim()) {
        toast.warning("Account holder name is required");
        return false;
      }
      if (!form.bankName.trim()) {
        toast.warning("Bank name is required");
        return false;
      }
      if (!form.bankAccount.trim()) {
        toast.warning("Bank account number is required");
        return false;
      }
      if (!form.ifsc.trim()) {
        toast.warning("IFSC code is required");
        return false;
      }
      if (!form.swift.trim()) {
        toast.warning("SWIFT code is required");
        return false;
      }
    }
    return true;
  }

  async function handleSave() {
    if (!validateDetails() || !validateWage() || !validatePayroll()) return;
    const phone = phoneValueFromE164(form.phone.trim());
    const role = roles.find((r) => String(r.id) === form.roleId)!;
    const emp = employmentTypes.find(
      (t) => String(t.id) === form.employmentTypeId,
    )!;
    const cal = calendars.find((x) => String(x.id) === form.payrollCalendarId)!;
    const address = normalizeAddress(form.address);

    const payload: Record<string, unknown> = {
      action: { create_user: Boolean(form.createUser) },
      details: {
        first_name: form.firstName.trim(),
        middle_name: form.middleName.trim() || null,
        last_name: form.lastName.trim(),
        email: form.email.trim(),
        preferred_name: form.preferredName.trim() || null,
        dob: form.dob.trim(),
        phone_number: phone.phone_number,
        phone_country_code: phone.phone_country_code,
        phone_country_iso: phone.phone_country_iso,
        address,
        role: {
          id: Number(role.id),
          code: role.code,
          name: role.name,
        },
      },
      wage: {
        start_date: form.startDate.trim(),
        employment_type: { id: Number(emp.id), code: emp.code },
        payroll_calendar: { id: Number(cal.id) },
        pay_type: form.payType,
        currency: form.currency,
        hourly_rate_exc_super:
          form.payType === "HOURLY" ? form.hourlyRate.trim() : null,
        fixed_rate_exc_super:
          form.payType === "FIXED" ? form.fixedRate.trim() : null,
      },
      payroll: {
        payment_method: form.paymentMethod,
        ...(form.paymentMethod === "BANK_TRANSFER"
          ? {
              account_holder_name: form.accountHolder.trim(),
              bank_name: form.bankName.trim(),
              bank_account_number: form.bankAccount.trim(),
              ifsc_code: form.ifsc.trim(),
              swift_code: form.swift.trim(),
            }
          : {}),
      },
    };

    try {
      if (isEdit && employee?.id != null) {
        await updateMutation.mutateAsync({ id: employee.id, payload });
        toast.success("Employee updated");
      } else {
        await createMutation.mutateAsync(payload);
        toast.success("Employee created & invitation sent");
      }
      void triggerHaptic("success");
      sheetRef.current?.dismiss();
      onClose();
    } catch (err) {
      toast.error(
        isEdit ? "Update failed" : "Create failed",
        getErrorMessage(err),
      );
    }
  }

  function goNext() {
    if (step === "email") {
      void handleSearch();
      return;
    }
    if (step === "details") {
      if (!validateDetails()) return;
      setStep("wage");
      return;
    }
    if (step === "wage") {
      if (!validateWage()) return;
      setStep("payroll");
      return;
    }
    void handleSave();
  }

  function goBack() {
    if (step === "payroll") setStep("wage");
    else if (step === "wage") setStep("details");
    else if (step === "details" && !isEdit) setStep("email");
  }

  const pending =
    createMutation.isPending ||
    updateMutation.isPending ||
    searchMutation.isPending;

  const footer = (
    <View style={styles.footerRow}>
      {step !== "email" && !(isEdit && step === "details") ? (
        <TouchableOpacity
          style={[styles.secondaryBtn, { borderColor: c.border }]}
          onPress={goBack}
          disabled={pending}
        >
          <Text style={{ color: c.text, fontWeight: "700" }}>Back</Text>
        </TouchableOpacity>
      ) : (
        <View style={{ flex: 1 }} />
      )}
      <TouchableOpacity
        style={[
          styles.primaryBtn,
          { backgroundColor: c.primary, opacity: pending ? 0.6 : 1 },
        ]}
        onPress={goNext}
        disabled={pending}
      >
        {pending ? (
          <ActivityIndicator color="#fff" />
        ) : (
          <Text style={styles.primaryBtnText}>
            {step === "email"
              ? "Continue"
              : step === "payroll"
                ? isEdit
                  ? "Save changes"
                  : "Create & invite"
                : "Next"}
          </Text>
        )}
      </TouchableOpacity>
    </View>
  );

  return (
    <AppBottomSheet
      ref={sheetRef}
      title={isEdit ? "Edit employee" : "Create employee"}
      snapPoints={["92%"]}
      footer={footer}
      onDismiss={onClose}
    >
      {!isEdit || step !== "email" ? (
        <SegmentedControl
          value={step === "email" ? "details" : step}
          options={[
            { value: "details", label: "Details" },
            { value: "wage", label: "Wage" },
            { value: "payroll", label: "Payroll" },
          ]}
          onChange={(next) => {
            if (step === "email") return;
            if (next === "wage" && !validateDetails()) return;
            if (next === "payroll" && (!validateDetails() || !validateWage()))
              return;
            setStep(next);
          }}
        />
      ) : null}

      {lookupsQuery.isLoading ? (
        <ActivityIndicator color={c.primary} style={{ marginTop: 24 }} />
      ) : null}

      {step === "email" ? (
        <View style={{ marginTop: spacing.md }}>
          <Text style={[styles.hint, { color: c.muted }]}>
            Search by email to check for an existing user before inviting.
          </Text>
          <Text style={[styles.label, { color: c.muted }]}>Email</Text>
          <BottomSheetTextInput
            style={inputStyle}
            value={form.email}
            onChangeText={(email) => patch({ email })}
            autoCapitalize="none"
            keyboardType="email-address"
            placeholder="name@company.com"
            placeholderTextColor={c.muted}
          />
        </View>
      ) : null}

      {step === "details" ? (
        <View style={{ marginTop: spacing.md }}>
          {form.actionMessage ? (
            <Text style={[styles.banner, { color: c.primary }]}>
              {form.actionMessage}
            </Text>
          ) : null}
          <Text style={[styles.label, { color: c.muted }]}>First name</Text>
          <BottomSheetTextInput
            style={inputStyle}
            value={form.firstName}
            editable={!form.lockIdentity}
            onChangeText={(firstName) => patch({ firstName })}
            placeholderTextColor={c.muted}
          />
          <Text style={[styles.label, { color: c.muted }]}>Middle name</Text>
          <BottomSheetTextInput
            style={inputStyle}
            value={form.middleName}
            editable={!form.lockIdentity}
            onChangeText={(middleName) => patch({ middleName })}
            placeholderTextColor={c.muted}
          />
          <Text style={[styles.label, { color: c.muted }]}>Last name</Text>
          <BottomSheetTextInput
            style={inputStyle}
            value={form.lastName}
            editable={!form.lockIdentity}
            onChangeText={(lastName) => patch({ lastName })}
            placeholderTextColor={c.muted}
          />
          <Text style={[styles.label, { color: c.muted }]}>Email</Text>
          <BottomSheetTextInput
            style={[inputStyle, { opacity: 0.7 }]}
            value={form.email}
            editable={false}
            placeholderTextColor={c.muted}
          />
          <Text style={[styles.label, { color: c.muted }]}>Preferred name</Text>
          <BottomSheetTextInput
            style={inputStyle}
            value={form.preferredName}
            onChangeText={(preferredName) => patch({ preferredName })}
            placeholderTextColor={c.muted}
          />
          <Text style={[styles.label, { color: c.muted }]}>
            Date of birth (YYYY-MM-DD)
          </Text>
          <BottomSheetTextInput
            style={inputStyle}
            value={form.dob}
            editable={!form.lockIdentity || !form.dob}
            onChangeText={(dob) => patch({ dob })}
            placeholderTextColor={c.muted}
          />
          <Text style={[styles.label, { color: c.muted }]}>
            Phone (E.164)
          </Text>
          <BottomSheetTextInput
            style={inputStyle}
            value={form.phone}
            onChangeText={(phone) => patch({ phone })}
            keyboardType="phone-pad"
            placeholder="+61412345678"
            placeholderTextColor={c.muted}
          />
          <PlacesAddressInput
            label="Address"
            value={form.address}
            onChange={(address) => patch({ address })}
          />
          <MobileSelect
            label="Role"
            value={form.roleId}
            options={roles.map((r) => ({
              value: String(r.id),
              label: r.name || r.code || `#${r.id}`,
            }))}
            onChange={(roleId) => patch({ roleId })}
            placeholder="Select role"
          />
        </View>
      ) : null}

      {step === "wage" ? (
        <View style={{ marginTop: spacing.md }}>
          <Text style={[styles.label, { color: c.muted }]}>
            Start date (YYYY-MM-DD)
          </Text>
          <BottomSheetTextInput
            style={inputStyle}
            value={form.startDate}
            onChangeText={(startDate) => patch({ startDate })}
            placeholderTextColor={c.muted}
          />
          <MobileSelect
            label="Employment type"
            value={form.employmentTypeId}
            options={employmentTypes.map((t) => ({
              value: String(t.id),
              label: t.name || t.code || `#${t.id}`,
            }))}
            onChange={(employmentTypeId) => patch({ employmentTypeId })}
          />
          <MobileSelect
            label="Payroll calendar"
            value={form.payrollCalendarId}
            options={calendars.map((cal) => ({
              value: String(cal.id),
              label: cal.name || `#${cal.id}`,
            }))}
            onChange={(payrollCalendarId) => patch({ payrollCalendarId })}
          />
          <Text style={[styles.label, { color: c.muted }]}>Pay type</Text>
          <SegmentedControl
            value={form.payType}
            options={[
              { value: "HOURLY", label: "Hourly" },
              { value: "FIXED", label: "Fixed" },
            ]}
            onChange={(payType) => patch({ payType })}
          />
          <View style={{ height: spacing.md }} />
          <MobileSelect
            label="Currency"
            value={form.currency}
            searchable={false}
            options={SUPPORTED_CURRENCIES.map((cur) => ({
              value: cur.code,
              label: cur.label,
            }))}
            onChange={(currency) => patch({ currency })}
          />
          {form.payType === "HOURLY" ? (
            <>
              <Text style={[styles.label, { color: c.muted }]}>
                Hourly rate (exc super)
              </Text>
              <BottomSheetTextInput
                style={inputStyle}
                value={form.hourlyRate}
                onChangeText={(hourlyRate) => patch({ hourlyRate })}
                keyboardType="decimal-pad"
                placeholderTextColor={c.muted}
              />
            </>
          ) : (
            <>
              <Text style={[styles.label, { color: c.muted }]}>
                Fixed rate (exc super)
              </Text>
              <BottomSheetTextInput
                style={inputStyle}
                value={form.fixedRate}
                onChangeText={(fixedRate) => patch({ fixedRate })}
                keyboardType="decimal-pad"
                placeholderTextColor={c.muted}
              />
            </>
          )}
        </View>
      ) : null}

      {step === "payroll" ? (
        <View style={{ marginTop: spacing.md }}>
          <Text style={[styles.label, { color: c.muted }]}>Payment method</Text>
          <MobileSelect
            label="Method"
            value={form.paymentMethod}
            searchable={false}
            options={[
              { value: "CASH", label: "Cash" },
              { value: "DIRECT_DEBIT", label: "Direct Debit" },
              { value: "BANK_TRANSFER", label: "Bank Transfer" },
            ]}
            onChange={(paymentMethod) => patch({ paymentMethod })}
          />
          {form.paymentMethod === "BANK_TRANSFER" ? (
            <>
              <Text style={[styles.label, { color: c.muted }]}>
                Account holder name
              </Text>
              <BottomSheetTextInput
                style={inputStyle}
                value={form.accountHolder}
                onChangeText={(accountHolder) => patch({ accountHolder })}
                placeholderTextColor={c.muted}
              />
              <Text style={[styles.label, { color: c.muted }]}>Bank name</Text>
              <BottomSheetTextInput
                style={inputStyle}
                value={form.bankName}
                onChangeText={(bankName) => patch({ bankName })}
                placeholderTextColor={c.muted}
              />
              <Text style={[styles.label, { color: c.muted }]}>
                Bank account number
              </Text>
              <BottomSheetTextInput
                style={inputStyle}
                value={form.bankAccount}
                onChangeText={(bankAccount) => patch({ bankAccount })}
                placeholderTextColor={c.muted}
              />
              <Text style={[styles.label, { color: c.muted }]}>IFSC code</Text>
              <BottomSheetTextInput
                style={inputStyle}
                value={form.ifsc}
                onChangeText={(ifsc) => patch({ ifsc })}
                autoCapitalize="characters"
                placeholderTextColor={c.muted}
              />
              <Text style={[styles.label, { color: c.muted }]}>SWIFT code</Text>
              <BottomSheetTextInput
                style={inputStyle}
                value={form.swift}
                onChangeText={(swift) => patch({ swift })}
                autoCapitalize="characters"
                placeholderTextColor={c.muted}
              />
            </>
          ) : null}
        </View>
      ) : null}
    </AppBottomSheet>
  );
}

const styles = StyleSheet.create({
  label: { marginBottom: 6, fontWeight: "600", fontSize: 13 },
  hint: { marginBottom: spacing.md, fontSize: 13, lineHeight: 18 },
  banner: {
    marginBottom: spacing.md,
    fontSize: 13,
    lineHeight: 18,
    fontWeight: "600",
  },
  input: {
    borderWidth: 1,
    borderRadius: 12,
    paddingHorizontal: 14,
    paddingVertical: 12,
    fontSize: 16,
    marginBottom: spacing.md,
  },
  footerRow: { flexDirection: "row", gap: 10, alignItems: "center" },
  secondaryBtn: {
    flex: 1,
    borderWidth: 1,
    borderRadius: 12,
    paddingVertical: 14,
    alignItems: "center",
  },
  primaryBtn: {
    flex: 1.4,
    borderRadius: 12,
    paddingVertical: 14,
    alignItems: "center",
  },
  primaryBtnText: { color: "#fff", fontWeight: "700" },
});
