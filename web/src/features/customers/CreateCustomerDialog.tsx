import { useEffect, useState } from "react";
import { Controller } from "react-hook-form";
import type { z } from "zod";
import {
  DEFAULT_CURRENCY,
  SUPPORTED_CURRENCIES,
  currencyDisplayPrefix,
  normalizeCurrency,
  type SupportedCurrencyCode,
} from "@mytask/constants";
import {
  useCreateCustomer,
  useUpdateCustomer,
} from "@mytask/hooks";
import {
  customerSchema,
  type CustomerFormValues,
} from "@mytask/validation";
import {
  getErrorMessage,
  phoneValueFromE164,
  fromAddressRecord,
  toAddressApiPayload,
} from "@mytask/utils";
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
import { useAppForm, useValidatedSubmit } from "@/hooks/useAppForm";

const selectClass =
  "mt-focus rounded-xl border border-border bg-[var(--mt-surface)] px-3.5 py-3 text-[var(--mt-text)] outline-none focus:border-primary";

const emptyCustomer: CustomerFormValues = {
  name: "",
  abn: "",
  address: "",
  contact_name: "",
  contact_email: "",
  contact_phone_number: "",
  contact_phone_country_code: null,
  contact_phone_country_iso: null,
  hourly_rate: "",
  currency: DEFAULT_CURRENCY,
};

export type CustomerRow = {
  id?: number | string;
  name?: string;
  abn?: string | null;
  address?: string | null;
  formatted_address?: string | null;
  address_line_1?: string | null;
  address_line_2?: string | null;
  street?: string | null;
  administrative_area?: string | null;
  state_region_province?: string | null;
  city?: string | null;
  postal_code?: string | null;
  country?: string | null;
  country_code?: string | null;
  place_id?: string | null;
  latitude?: number | string | null;
  longitude?: number | string | null;
  contact_name?: string | null;
  contact_email?: string | null;
  contact_phone_number?: string | null;
  contact_phone_country_code?: string | null;
  contact_phone_country_iso?: string | null;
  hourly_rate?: number | string | null;
  currency?: string | null;
};

export function CustomerFormDialog({
  open,
  onClose,
  customer,
}: {
  open: boolean;
  onClose: () => void;
  customer?: CustomerRow | null;
}) {
  const toast = useToastStore();
  const createMutation = useCreateCustomer();
  const updateMutation = useUpdateCustomer();
  const isEdit = customer?.id != null;

  const [address, setAddress] = useState<AddressValue>(emptyAddress);

  const form = useAppForm<CustomerFormValues>({
    schema: customerSchema as z.ZodType<CustomerFormValues>,
    defaultValues: emptyCustomer,
  });
  const {
    register,
    control,
    reset,
    setValue,
    watch,
    formState: { errors },
  } = form;

  const phoneNumber = watch("contact_phone_number");
  const phoneIso = watch("contact_phone_country_iso");
  const phoneCode = watch("contact_phone_country_code");
  const currency = watch("currency") as SupportedCurrencyCode;

  useEffect(() => {
    if (!open) return;
    const phone = phoneValueFromE164(
      customer?.contact_phone_number,
      customer?.contact_phone_country_iso,
    );
    reset({
      name: customer?.name || "",
      abn: customer?.abn || "",
      address:
        customer?.formatted_address ||
        customer?.address ||
        customer?.address_line_1 ||
        "",
      contact_name: customer?.contact_name || "",
      contact_email: customer?.contact_email || "",
      contact_phone_number: phone.phone_number || "",
      contact_phone_country_code: phone.phone_country_code,
      contact_phone_country_iso: phone.phone_country_iso,
      hourly_rate:
        customer?.hourly_rate != null ? String(customer.hourly_rate) : "",
      currency: normalizeCurrency(customer?.currency),
    });
    setAddress(
      fromAddressRecord(
        customer
          ? {
              ...customer,
              address_line_1:
                customer.address_line_1 ||
                customer.formatted_address ||
                customer.address ||
                "",
              formatted_address:
                customer.formatted_address || customer.address || "",
            }
          : null,
      ),
    );
  }, [open, customer, reset]);

  const handleSubmit = useValidatedSubmit(form, async (values) => {
    const addressPayload = toAddressApiPayload(address, {
      includeCoordinates: false,
    });
    const payload = {
      name: values.name.trim(),
      abn: values.abn?.trim() || null,
      ...addressPayload,
      address: address.formatted_address || address.address_line_1 || null,
      contact_name: values.contact_name?.trim() || null,
      contact_email: values.contact_email?.trim() || null,
      contact_phone_number: values.contact_phone_number || null,
      contact_phone_country_code: values.contact_phone_country_code,
      contact_phone_country_iso: values.contact_phone_country_iso,
      hourly_rate: values.hourly_rate
        ? Number(String(values.hourly_rate).trim())
        : null,
      currency: values.currency,
    };
    try {
      if (isEdit && customer?.id != null) {
        await updateMutation.mutateAsync({ id: customer.id, payload });
        toast.success("Customer updated");
      } else {
        await createMutation.mutateAsync(payload);
        toast.success("Customer created");
      }
      onClose();
    } catch (err) {
      toast.error(
        isEdit ? "Update failed" : "Create failed",
        getErrorMessage(err),
      );
    }
  });

  const pending = createMutation.isPending || updateMutation.isPending;

  if (!open) return null;

  return (
    <FullScreenModal
      open={open}
      onClose={onClose}
      title={isEdit ? "Edit customer" : "Create customer"}
      variant="form"
      footer={
        <>
          <Button variant="secondary" onClick={onClose}>
            Cancel
          </Button>
          <Button loading={pending} onClick={handleSubmit}>
            {isEdit ? "Save" : "Create"}
          </Button>
        </>
      }
    >
      <div className="flex flex-col gap-3">
        <TextInput
          label="Name"
          error={errors.name?.message}
          {...register("name")}
        />
        <TextInput label="Business / tax ID" {...register("abn")} />
        <GoogleAddressAutocomplete
          label="Address"
          value={address}
          onChange={(next) => {
            setAddress(next);
            setValue(
              "address",
              next.formatted_address || next.address_line_1 || "",
            );
          }}
          requireCoordinates={false}
        />
        <TextInput label="Contact name" {...register("contact_name")} />
        <TextInput
          label="Contact email"
          type="email"
          error={errors.contact_email?.message}
          {...register("contact_email")}
        />
        <Controller
          name="contact_phone_number"
          control={control}
          render={({ field }) => (
            <GlobalPhoneInput
              label="Contact phone"
              value={{
                phone_number: phoneNumber || null,
                phone_country_code: phoneCode || null,
                phone_country_iso: phoneIso || null,
              }}
              error={errors.contact_phone_number?.message}
              onChange={(phone) => {
                field.onChange(phone.phone_number || "");
                setValue("contact_phone_country_code", phone.phone_country_code, {
                  shouldValidate: true,
                });
                setValue("contact_phone_country_iso", phone.phone_country_iso, {
                  shouldValidate: true,
                });
              }}
              onBlur={field.onBlur}
            />
          )}
        />
        <div className="grid gap-3 sm:grid-cols-2">
          <TextInput
            label={`Hourly rate (${currencyDisplayPrefix(currency)})`}
            type="number"
            step="0.01"
            {...register("hourly_rate")}
          />
          <Controller
            name="currency"
            control={control}
            render={({ field }) => (
              <label className="flex w-full flex-col gap-1.5 text-sm">
                <span className="font-medium text-[var(--mt-text)]">
                  Currency
                </span>
                <select
                  className={selectClass}
                  value={field.value}
                  onChange={field.onChange}
                  onBlur={field.onBlur}
                >
                  {SUPPORTED_CURRENCIES.map((c) => (
                    <option key={c.code} value={c.code}>
                      {c.label}
                    </option>
                  ))}
                </select>
              </label>
            )}
          />
        </div>
      </div>
    </FullScreenModal>
  );
}

/** @deprecated Prefer CustomerFormDialog */
export function CreateCustomerDialog(
  props: Omit<Parameters<typeof CustomerFormDialog>[0], "customer">,
) {
  return <CustomerFormDialog {...props} />;
}
