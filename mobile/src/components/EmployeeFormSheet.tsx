import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import {
  ActivityIndicator,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
} from "react-native";
import type { BottomSheetModal } from "@gorhom/bottom-sheet";
import {
  Controller,
  useForm,
  type Resolver,
  type UseFormReturn,
} from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
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
  e164PhoneSchema,
  employeeEmailStepSchema,
  employeePayrollStepSchema,
  employeeWageStepSchema,
  isoDateSchema,
  type EmployeeDetailsStepValues,
  type EmployeeEmailStepValues,
  type EmployeePayrollStepValues,
  type EmployeeWageStepValues,
} from "@mytask/validation";
import {
  getErrorMessage,
  normalizeAddress,
  phoneValueFromE164,
  type GlobalAddress,
} from "@mytask/utils";
import { FormFieldError, FormTextField } from "./FormTextField";
import { PlacesAddressInput } from "./PlacesAddressInput";
import { GlobalPhoneInput } from "./GlobalPhoneInput";
import { MobileSelect } from "./MobileSelect";
import { AppBottomSheet, SegmentedControl } from "../ui";
import {
  fieldChainProps,
  useAppForm,
  useFormFieldChain,
  useValidatedSubmit,
} from "../hooks/useAppForm";
import { useThemeStore } from "../store/themeStore";
import { useToastStore } from "../store/toastStore";
import { triggerHaptic } from "../utils/haptics";

type Step = "email" | "details" | "wage" | "payroll";

type EmployeeSeed = {
  id?: number | string;
  details?: {
    id?: number | string;
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

type MetaState = {
  createUser: boolean;
  lockIdentity: boolean;
  actionMessage: string | null;
};

function emptyEmailValues(): EmployeeEmailStepValues {
  return { email: "" };
}

function emptyDetailsValues(): EmployeeDetailsStepValues {
  return {
    first_name: "",
    middle_name: "",
    last_name: "",
    email: "",
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

function emptyWageValues(): EmployeeWageStepValues {
  return {
    start_date: "",
    employment_type_id: "",
    payroll_calendar_id: "",
    pay_type: "HOURLY",
    currency: DEFAULT_CURRENCY,
    hourly_rate: "",
    fixed_rate: "",
  };
}

function emptyPayrollValues(): EmployeePayrollStepValues {
  return {
    payment_method: "CASH",
    account_holder_name: "",
    bank_name: "",
    bank_account_number: "",
    ifsc_code: "",
    swift_code: "",
  };
}

function emptyMeta(): MetaState {
  return {
    createUser: true,
    lockIdentity: false,
    actionMessage: null,
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

function detailsValuesFromAddress(
  address: GlobalAddress | null,
): Pick<EmployeeDetailsStepValues, "address_line_1" | "formatted_address"> {
  const normalized = normalizeAddress(address);
  return {
    address_line_1: normalized.address_line_1 || "",
    formatted_address: normalized.formatted_address || "",
  };
}

function detailsFromEmployee(row: EmployeeSeed): EmployeeDetailsStepValues {
  const d = row.details;
  const phone = phoneValueFromE164(d?.phone_number, d?.phone_country_iso);
  const address = addressFromUnknown(d?.address);
  const addressFields = detailsValuesFromAddress(address);
  return {
    first_name: d?.first_name || "",
    middle_name: d?.middle_name || "",
    last_name: d?.last_name || "",
    email: d?.email || "",
    preferred_name: d?.preferred_name || "",
    dob: (d?.dob as string) || "",
    phone_number: phone.phone_number || "",
    phone_country_code: phone.phone_country_code,
    phone_country_iso: phone.phone_country_iso,
    ...addressFields,
    role_id: d?.role?.id != null ? String(d.role.id) : "",
  };
}

function wageFromEmployee(row: EmployeeSeed): EmployeeWageStepValues {
  const w = row.wage;
  const payType =
    String(w?.pay_type || "HOURLY").toUpperCase() === "FIXED"
      ? "FIXED"
      : "HOURLY";
  return {
    start_date: (w?.start_date as string) || "",
    employment_type_id:
      w?.employment_type?.id != null ? String(w.employment_type.id) : "",
    payroll_calendar_id:
      w?.payroll_calendar?.id != null ? String(w.payroll_calendar.id) : "",
    pay_type: payType,
    currency: (w?.currency as SupportedCurrencyCode) || DEFAULT_CURRENCY,
    hourly_rate:
      w?.hourly_rate_exc_super != null ? String(w.hourly_rate_exc_super) : "",
    fixed_rate:
      w?.fixed_rate_exc_super != null ? String(w.fixed_rate_exc_super) : "",
  };
}

function payrollFromEmployee(row: EmployeeSeed): EmployeePayrollStepValues {
  const p = row.payroll;
  const method = String(p?.payment_method || "CASH").toUpperCase();
  return {
    payment_method:
      method === "BANK_TRANSFER" || method === "DIRECT_DEBIT"
        ? method
        : "CASH",
    account_holder_name: p?.account_holder_name || "",
    bank_name: p?.bank_name || "",
    bank_account_number: p?.bank_account_number || "",
    ifsc_code: p?.ifsc_code || "",
    swift_code: p?.swift_code || "",
  };
}

/** Mirrors employeeDetailsStepSchema; names optional when linking an existing user. */
function buildDetailsSchema(createUser: boolean) {
  return z
    .object({
      first_name: createUser
        ? z.string().min(1, "Please enter first name")
        : z.string().optional().nullable().or(z.literal("")),
      middle_name: z.string().optional().nullable().or(z.literal("")),
      last_name: createUser
        ? z.string().min(1, "Please enter last name")
        : z.string().optional().nullable().or(z.literal("")),
      email: z.string().email("Please enter a valid email"),
      preferred_name: z.string().optional().nullable().or(z.literal("")),
      dob: isoDateSchema,
      phone_number: e164PhoneSchema,
      phone_country_code: z.string().optional().nullable(),
      phone_country_iso: z.string().optional().nullable(),
      address_line_1: z.string().optional().nullable().or(z.literal("")),
      formatted_address: z.string().optional().nullable().or(z.literal("")),
      role_id: z.string().min(1, "Please select a role"),
    })
    .refine(
      (data) =>
        Boolean(data.address_line_1?.trim() || data.formatted_address?.trim()),
      {
        message: "Please select or enter an address",
        path: ["formatted_address"],
      },
    );
}

function validateOwnerRole(
  form: UseFormReturn<EmployeeDetailsStepValues>,
  roles: NamedLookup[],
): boolean {
  const roleId = form.getValues("role_id");
  const role = roles.find((r) => String(r.id) === roleId);
  if (String(role?.code || "").toLowerCase() === "owner") {
    form.setError("role_id", {
      message: "Organisation Owner cannot be assigned",
    });
    return false;
  }
  return true;
}

function validateEmploymentType(
  form: UseFormReturn<EmployeeWageStepValues>,
  employmentTypes: NamedLookup[],
): boolean {
  const typeId = form.getValues("employment_type_id");
  const emp = employmentTypes.find((t) => String(t.id) === typeId);
  if (String(emp?.code || "").toUpperCase() === "CONTRACT") {
    form.setError("employment_type_id", {
      message: "Contract employment type is not allowed",
    });
    return false;
  }
  return true;
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
  const employeeId = employee?.details?.id ?? employee?.id;
  const isEdit = employeeId != null;
  const c = useThemeStore((s) => s.colors);
  const toast = useToastStore();
  const [step, setStep] = useState<Step>(isEdit ? "details" : "email");
  const [meta, setMeta] = useState<MetaState>(emptyMeta);
  const [addressObj, setAddressObj] = useState<GlobalAddress | null>(null);

  const createUserRef = useRef(meta.createUser);
  createUserRef.current = meta.createUser;

  const detailsResolver = useMemo<Resolver<EmployeeDetailsStepValues>>(
    () => async (values, context, options) =>
      zodResolver(buildDetailsSchema(createUserRef.current))(
        values as never,
        context,
        options as never,
      ) as Promise<
        import("react-hook-form").ResolverResult<EmployeeDetailsStepValues>
      >,
    [],
  );

  const emailForm = useAppForm({
    schema: employeeEmailStepSchema,
    defaultValues: emptyEmailValues(),
  });

  const detailsForm = useForm<EmployeeDetailsStepValues>({
    resolver: detailsResolver,
    defaultValues: emptyDetailsValues(),
    mode: "onTouched",
    shouldFocusError: true,
  });

  const wageForm = useAppForm({
    schema: employeeWageStepSchema,
    defaultValues: emptyWageValues(),
  });

  const payrollForm = useAppForm({
    schema: employeePayrollStepSchema,
    defaultValues: emptyPayrollValues(),
  });

  const lookupsQuery = useEmployeeFormLookups(open);
  const searchMutation = useSearchEmployeeByEmail();
  const createMutation = useCreateEmployee();
  const updateMutation = useUpdateEmployee();

  const resetAll = useCallback(
    (row: EmployeeSeed | null) => {
      if (row) {
        const address = addressFromUnknown(row.details?.address);
        setAddressObj(address);
        setMeta({
          createUser: false,
          lockIdentity: true,
          actionMessage: null,
        });
        emailForm.reset({ email: row.details?.email || "" });
        detailsForm.reset(detailsFromEmployee(row));
        wageForm.reset(wageFromEmployee(row));
        payrollForm.reset(payrollFromEmployee(row));
        setStep("details");
        return;
      }
      setAddressObj(null);
      setMeta(emptyMeta());
      emailForm.reset(emptyEmailValues());
      detailsForm.reset(emptyDetailsValues());
      wageForm.reset(emptyWageValues());
      payrollForm.reset(emptyPayrollValues());
      setStep("email");
    },
    [detailsForm, emailForm, payrollForm, wageForm],
  );

  useEffect(() => {
    if (!open) return;
    resetAll(employee);
  }, [open, employee, resetAll]);

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

  const detailsChain = useFormFieldChain(detailsForm, [
    "first_name",
    "middle_name",
    "last_name",
    "preferred_name",
    "dob",
  ]);

  const wageChain = useFormFieldChain(wageForm, ["start_date"]);

  const payrollChain = useFormFieldChain(payrollForm, [
    "account_holder_name",
    "bank_name",
    "bank_account_number",
    "ifsc_code",
    "swift_code",
  ]);

  const syncAddressToDetails = useCallback(
    (address: GlobalAddress | null) => {
      setAddressObj(address);
      const fields = detailsValuesFromAddress(address);
      detailsForm.setValue("address_line_1", fields.address_line_1, {
        shouldDirty: true,
        shouldValidate: true,
      });
      detailsForm.setValue("formatted_address", fields.formatted_address, {
        shouldDirty: true,
        shouldValidate: true,
      });
    },
    [detailsForm],
  );

  const handleSearch = useCallback(
    async ({ email }: EmployeeEmailStepValues) => {
      try {
        const data = await searchMutation.mutateAsync(email.trim());
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
        const address = addressFromUnknown(
          details.address as Partial<GlobalAddress> | string | null,
        );
        const addressFields = detailsValuesFromAddress(address);

        setMeta({
          createUser,
          lockIdentity: !createUser,
          actionMessage: action.message || null,
        });
        setAddressObj(address);

        detailsForm.reset({
          first_name: String(details.first_name || ""),
          middle_name: String(details.middle_name || ""),
          last_name: String(details.last_name || ""),
          email: String(details.email || email.trim()),
          preferred_name: String(details.preferred_name || ""),
          dob: String(details.dob || ""),
          phone_number: phone.phone_number || "",
          phone_country_code: phone.phone_country_code,
          phone_country_iso: phone.phone_country_iso,
          ...addressFields,
          role_id: "",
        });

        wageForm.reset({
          start_date: String(wage.start_date || ""),
          employment_type_id: "",
          payroll_calendar_id: "",
          pay_type:
            String(wage.pay_type || "HOURLY").toUpperCase() === "FIXED"
              ? "FIXED"
              : "HOURLY",
          currency:
            (wage.currency as SupportedCurrencyCode) || DEFAULT_CURRENCY,
          hourly_rate:
            wage.hourly_rate_exc_super != null
              ? String(wage.hourly_rate_exc_super)
              : "",
          fixed_rate:
            wage.fixed_rate_exc_super != null
              ? String(wage.fixed_rate_exc_super)
              : "",
        });

        payrollForm.reset({
          payment_method: (() => {
            const m = String(payroll.payment_method || "CASH").toUpperCase();
            return m === "BANK_TRANSFER" || m === "DIRECT_DEBIT" ? m : "CASH";
          })(),
          account_holder_name: String(payroll.account_holder_name || ""),
          bank_name: String(payroll.bank_name || ""),
          bank_account_number: String(payroll.bank_account_number || ""),
          ifsc_code: String(payroll.ifsc_code || ""),
          swift_code: String(payroll.swift_code || ""),
        });

        setStep("details");
        if (action.message) toast.info("Email lookup", action.message);
      } catch (err) {
        toast.error("Search failed", getErrorMessage(err));
      }
    },
    [detailsForm, payrollForm, searchMutation, toast, wageForm],
  );

  const submitEmail = useValidatedSubmit(emailForm, handleSearch);

  const advanceDetails = useCallback(() => {
    void detailsForm.handleSubmit(
      () => {
        if (!validateOwnerRole(detailsForm, roles)) {
          void triggerHaptic("error");
          return;
        }
        setStep("wage");
      },
      () => {
        void triggerHaptic("error");
      },
    )();
  }, [detailsForm, roles]);

  const advanceWage = useCallback(() => {
    void wageForm.handleSubmit(
      () => {
        if (!validateEmploymentType(wageForm, employmentTypes)) {
          void triggerHaptic("error");
          return;
        }
        setStep("payroll");
      },
      () => {
        void triggerHaptic("error");
      },
    )();
  }, [employmentTypes, wageForm]);

  const validateDetailsStep = useCallback(async (): Promise<boolean> => {
    const valid = await detailsForm.trigger(undefined, { shouldFocus: true });
    if (!valid) {
      void triggerHaptic("error");
      return false;
    }
    if (!validateOwnerRole(detailsForm, roles)) {
      void triggerHaptic("error");
      return false;
    }
    return true;
  }, [detailsForm, roles]);

  const validateWageStep = useCallback(async (): Promise<boolean> => {
    const valid = await wageForm.trigger(undefined, { shouldFocus: true });
    if (!valid) {
      void triggerHaptic("error");
      return false;
    }
    if (!validateEmploymentType(wageForm, employmentTypes)) {
      void triggerHaptic("error");
      return false;
    }
    return true;
  }, [employmentTypes, wageForm]);

  const validatePayrollStep = useCallback(async (): Promise<boolean> => {
    const valid = await payrollForm.trigger(undefined, { shouldFocus: true });
    if (!valid) {
      void triggerHaptic("error");
      return false;
    }
    return true;
  }, [payrollForm]);

  const handleSave = useCallback(async () => {
    if (!(await validateDetailsStep())) {
      setStep("details");
      return;
    }
    if (!(await validateWageStep())) {
      setStep("wage");
      return;
    }
    if (!(await validatePayrollStep())) return;

    const details = detailsForm.getValues();
    const wage = wageForm.getValues();
    const payroll = payrollForm.getValues();
    const role = roles.find((r) => String(r.id) === details.role_id)!;
    const emp = employmentTypes.find(
      (t) => String(t.id) === wage.employment_type_id,
    )!;
    const cal = calendars.find((x) => String(x.id) === wage.payroll_calendar_id)!;
    const address = normalizeAddress(addressObj);

    const payload: Record<string, unknown> = {
      action: { create_user: Boolean(meta.createUser) },
      details: {
        first_name: details.first_name.trim(),
        middle_name: details.middle_name?.trim() || null,
        last_name: details.last_name.trim(),
        email: details.email.trim(),
        preferred_name: details.preferred_name?.trim() || null,
        dob: details.dob.trim(),
        phone_number: details.phone_number,
        phone_country_code: details.phone_country_code,
        phone_country_iso: details.phone_country_iso,
        address,
        role: {
          id: Number(role.id),
          code: role.code,
          name: role.name,
        },
      },
      wage: {
        start_date: wage.start_date.trim(),
        employment_type: { id: Number(emp.id), code: emp.code },
        payroll_calendar: { id: Number(cal.id) },
        pay_type: wage.pay_type,
        currency: wage.currency,
        hourly_rate_exc_super:
          wage.pay_type === "HOURLY" ? wage.hourly_rate?.trim() || null : null,
        fixed_rate_exc_super:
          wage.pay_type === "FIXED" ? wage.fixed_rate?.trim() || null : null,
      },
      payroll: {
        payment_method: payroll.payment_method,
        ...(payroll.payment_method === "BANK_TRANSFER"
          ? {
              account_holder_name: payroll.account_holder_name?.trim() || "",
              bank_name: payroll.bank_name?.trim() || "",
              bank_account_number: payroll.bank_account_number?.trim() || "",
              ifsc_code: payroll.ifsc_code?.trim() || "",
              swift_code: payroll.swift_code?.trim() || "",
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
      void triggerHaptic("success");
      sheetRef.current?.dismiss();
      onClose();
    } catch (err) {
      toast.error(
        isEdit ? "Update failed" : "Create failed",
        getErrorMessage(err),
      );
    }
  }, [
    addressObj,
    calendars,
    createMutation,
    detailsForm,
    employeeId,
    employmentTypes,
    isEdit,
    meta.createUser,
    onClose,
    payrollForm,
    roles,
    sheetRef,
    toast,
    updateMutation,
    validateDetailsStep,
    validatePayrollStep,
    validateWageStep,
    wageForm,
  ]);

  const submitPayroll = useValidatedSubmit(payrollForm, handleSave);

  function goNext() {
    if (step === "email") {
      submitEmail();
      return;
    }
    if (step === "details") {
      advanceDetails();
      return;
    }
    if (step === "wage") {
      advanceWage();
      return;
    }
    submitPayroll();
  }

  function goBack() {
    if (step === "payroll") setStep("wage");
    else if (step === "wage") setStep("details");
    else if (step === "details" && !isEdit) setStep("email");
  }

  async function handleSegmentChange(next: "details" | "wage" | "payroll") {
    if (step === "email") return;
    if (next === "wage" && !(await validateDetailsStep())) return;
    if (
      next === "payroll" &&
      (!(await validateDetailsStep()) || !(await validateWageStep()))
    ) {
      return;
    }
    setStep(next);
  }

  const pending =
    createMutation.isPending ||
    updateMutation.isPending ||
    searchMutation.isPending;

  const payType = wageForm.watch("pay_type");
  const paymentMethod = payrollForm.watch("payment_method");
  const addressError =
    detailsForm.formState.errors.formatted_address?.message ||
    detailsForm.formState.errors.address_line_1?.message;

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
                  ? "Update"
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
            void handleSegmentChange(next);
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
          <FormTextField
            control={emailForm.control}
            name="email"
            label="Email"
            inputType="bottomSheet"
            autoCapitalize="none"
            keyboardType="email-address"
            placeholder="name@company.com"
            editable={!pending}
          />
        </View>
      ) : null}

      {step === "details" ? (
        <View style={{ marginTop: spacing.md }}>
          {meta.actionMessage ? (
            <Text style={[styles.banner, { color: c.primary }]}>
              {meta.actionMessage}
            </Text>
          ) : null}
          <FormTextField
            control={detailsForm.control}
            name="first_name"
            label="First name"
            inputType="bottomSheet"
            editable={!meta.lockIdentity}
            {...fieldChainProps(detailsChain, "first_name")}
          />
          <FormTextField
            control={detailsForm.control}
            name="middle_name"
            label="Middle name"
            inputType="bottomSheet"
            editable={!meta.lockIdentity}
            {...fieldChainProps(detailsChain, "middle_name")}
          />
          <FormTextField
            control={detailsForm.control}
            name="last_name"
            label="Last name"
            inputType="bottomSheet"
            editable={!meta.lockIdentity}
            {...fieldChainProps(detailsChain, "last_name")}
          />
          <FormTextField
            control={detailsForm.control}
            name="email"
            label="Email"
            inputType="bottomSheet"
            editable={false}
          />
          <FormTextField
            control={detailsForm.control}
            name="preferred_name"
            label="Preferred name"
            inputType="bottomSheet"
            {...fieldChainProps(detailsChain, "preferred_name")}
          />
          <FormTextField
            control={detailsForm.control}
            name="dob"
            label="Date of birth (YYYY-MM-DD)"
            inputType="bottomSheet"
            editable={!meta.lockIdentity || !detailsForm.watch("dob")}
            {...fieldChainProps(detailsChain, "dob")}
          />
          <Controller
            control={detailsForm.control}
            name="phone_number"
            render={({ field: { onChange }, fieldState }) => (
              <>
                <GlobalPhoneInput
                  label="Phone"
                  value={{
                    phone_number: detailsForm.watch("phone_number") || null,
                    phone_country_code:
                      detailsForm.watch("phone_country_code") || null,
                    phone_country_iso:
                      detailsForm.watch("phone_country_iso") || null,
                  }}
                  onChange={(phone) => {
                    onChange(phone.phone_number || "");
                    detailsForm.setValue(
                      "phone_country_code",
                      phone.phone_country_code,
                      { shouldValidate: true },
                    );
                    detailsForm.setValue(
                      "phone_country_iso",
                      phone.phone_country_iso,
                      { shouldValidate: true },
                    );
                  }}
                  error={fieldState.error?.message}
                  required
                  inBottomSheet
                />
              </>
            )}
          />
          <PlacesAddressInput
            label="Address"
            value={addressObj}
            onChange={(address) => syncAddressToDetails(address)}
            inBottomSheet
          />
          <FormFieldError message={addressError} />
          <Controller
            control={detailsForm.control}
            name="role_id"
            render={({ field: { onChange, value }, fieldState }) => (
              <>
                <MobileSelect
                  label="Role"
                  value={value}
                  options={roles.map((r) => ({
                    value: String(r.id),
                    label: r.name || r.code || `#${r.id}`,
                  }))}
                  onChange={onChange}
                  placeholder="Select role"
                />
                <FormFieldError message={fieldState.error?.message} />
              </>
            )}
          />
        </View>
      ) : null}

      {step === "wage" ? (
        <View style={{ marginTop: spacing.md }}>
          <FormTextField
            control={wageForm.control}
            name="start_date"
            label="Start date (YYYY-MM-DD)"
            inputType="bottomSheet"
            {...fieldChainProps(wageChain, "start_date")}
          />
          <Controller
            control={wageForm.control}
            name="employment_type_id"
            render={({ field: { onChange, value }, fieldState }) => (
              <>
                <MobileSelect
                  label="Employment type"
                  value={value}
                  options={employmentTypes.map((t) => ({
                    value: String(t.id),
                    label: t.name || t.code || `#${t.id}`,
                  }))}
                  onChange={onChange}
                />
                <FormFieldError message={fieldState.error?.message} />
              </>
            )}
          />
          <Controller
            control={wageForm.control}
            name="payroll_calendar_id"
            render={({ field: { onChange, value }, fieldState }) => (
              <>
                <MobileSelect
                  label="Payroll calendar"
                  value={value}
                  options={calendars.map((cal) => ({
                    value: String(cal.id),
                    label: cal.name || `#${cal.id}`,
                  }))}
                  onChange={onChange}
                />
                <FormFieldError message={fieldState.error?.message} />
              </>
            )}
          />
          <Text style={[styles.label, { color: c.muted }]}>Pay type</Text>
          <Controller
            control={wageForm.control}
            name="pay_type"
            render={({ field: { onChange, value } }) => (
              <SegmentedControl
                value={value}
                options={[
                  { value: "HOURLY", label: "Hourly" },
                  { value: "FIXED", label: "Fixed" },
                ]}
                onChange={onChange}
              />
            )}
          />
          <View style={{ height: spacing.md }} />
          <Controller
            control={wageForm.control}
            name="currency"
            render={({ field: { onChange, value }, fieldState }) => (
              <>
                <MobileSelect
                  label="Currency"
                  value={value}
                  searchable={false}
                  options={SUPPORTED_CURRENCIES.map((cur) => ({
                    value: cur.code,
                    label: cur.label,
                  }))}
                  onChange={onChange}
                />
                <FormFieldError message={fieldState.error?.message} />
              </>
            )}
          />
          {payType === "HOURLY" ? (
            <FormTextField
              control={wageForm.control}
              name="hourly_rate"
              label="Hourly rate (exc super)"
              inputType="bottomSheet"
              keyboardType="decimal-pad"
            />
          ) : (
            <FormTextField
              control={wageForm.control}
              name="fixed_rate"
              label="Fixed rate (exc super)"
              inputType="bottomSheet"
              keyboardType="decimal-pad"
            />
          )}
        </View>
      ) : null}

      {step === "payroll" ? (
        <View style={{ marginTop: spacing.md }}>
          <Controller
            control={payrollForm.control}
            name="payment_method"
            render={({ field: { onChange, value }, fieldState }) => (
              <>
                <MobileSelect
                  label="Method"
                  value={value}
                  searchable={false}
                  options={[
                    { value: "CASH", label: "Cash" },
                    { value: "DIRECT_DEBIT", label: "Direct Debit" },
                    { value: "BANK_TRANSFER", label: "Bank Transfer" },
                  ]}
                  onChange={onChange}
                />
                <FormFieldError message={fieldState.error?.message} />
              </>
            )}
          />
          {paymentMethod === "BANK_TRANSFER" ? (
            <>
              <FormTextField
                control={payrollForm.control}
                name="account_holder_name"
                label="Account holder name"
                inputType="bottomSheet"
                {...fieldChainProps(payrollChain, "account_holder_name")}
              />
              <FormTextField
                control={payrollForm.control}
                name="bank_name"
                label="Bank name"
                inputType="bottomSheet"
                {...fieldChainProps(payrollChain, "bank_name")}
              />
              <FormTextField
                control={payrollForm.control}
                name="bank_account_number"
                label="Bank account number"
                inputType="bottomSheet"
                {...fieldChainProps(payrollChain, "bank_account_number")}
              />
              <FormTextField
                control={payrollForm.control}
                name="ifsc_code"
                label="IFSC code"
                inputType="bottomSheet"
                autoCapitalize="characters"
                {...fieldChainProps(payrollChain, "ifsc_code")}
              />
              <FormTextField
                control={payrollForm.control}
                name="swift_code"
                label="SWIFT code"
                inputType="bottomSheet"
                autoCapitalize="characters"
                {...fieldChainProps(payrollChain, "swift_code")}
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
