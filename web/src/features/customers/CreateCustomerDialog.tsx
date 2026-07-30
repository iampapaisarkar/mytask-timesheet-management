import { useEffect, useState } from "react";
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

const selectClass =
  "mt-focus rounded-xl border border-border bg-[var(--mt-surface)] px-3.5 py-3 text-[var(--mt-text)] outline-none focus:border-primary";

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

  const [name, setName] = useState("");
  const [abn, setAbn] = useState("");
  const [address, setAddress] = useState<AddressValue>(emptyAddress);
  const [contactName, setContactName] = useState("");
  const [contactEmail, setContactEmail] = useState("");
  const [contactPhone, setContactPhone] = useState<PhoneValue>({
    phone_number: null,
    phone_country_code: null,
    phone_country_iso: null,
  });
  const [hourlyRate, setHourlyRate] = useState("");
  const [currency, setCurrency] =
    useState<SupportedCurrencyCode>(DEFAULT_CURRENCY);

  useEffect(() => {
    if (!open) return;
    setName(customer?.name || "");
    setAbn(customer?.abn || "");
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
    setContactName(customer?.contact_name || "");
    setContactEmail(customer?.contact_email || "");
    setContactPhone(
      phoneValueFromE164(
        customer?.contact_phone_number,
        customer?.contact_phone_country_iso,
      ),
    );
    setHourlyRate(
      customer?.hourly_rate != null ? String(customer.hourly_rate) : "",
    );
    setCurrency(normalizeCurrency(customer?.currency));
  }, [open, customer]);

  if (!open) return null;

  async function handleSubmit() {
    if (!name.trim()) {
      toast.warning("Name required");
      return;
    }
    const addressPayload = toAddressApiPayload(address, {
      includeCoordinates: false,
    });
    const payload = {
      name: name.trim(),
      abn: abn.trim() || null,
      ...addressPayload,
      address: address.formatted_address || address.address_line_1 || null,
      contact_name: contactName.trim() || null,
      contact_email: contactEmail.trim() || null,
      contact_phone_number: contactPhone.phone_number,
      contact_phone_country_code: contactPhone.phone_country_code,
      contact_phone_country_iso: contactPhone.phone_country_iso,
      hourly_rate: hourlyRate.trim() ? Number(hourlyRate) : null,
      currency,
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
      toast.error(isEdit ? "Update failed" : "Create failed", getErrorMessage(err));
    }
  }

  const pending = createMutation.isPending || updateMutation.isPending;

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
          <Button loading={pending} onClick={() => void handleSubmit()}>
            {isEdit ? "Save" : "Create"}
          </Button>
        </>
      }
    >
      <div className="flex flex-col gap-3">
        <TextInput
          label="Name"
          value={name}
          onChange={(e) => setName(e.target.value)}
        />
        <TextInput
          label="Business / tax ID"
          value={abn}
          onChange={(e) => setAbn(e.target.value)}
        />
        <GoogleAddressAutocomplete
          label="Address"
          value={address}
          onChange={setAddress}
          requireCoordinates={false}
        />
        <TextInput
          label="Contact name"
          value={contactName}
          onChange={(e) => setContactName(e.target.value)}
        />
        <TextInput
          label="Contact email"
          type="email"
          value={contactEmail}
          onChange={(e) => setContactEmail(e.target.value)}
        />
        <GlobalPhoneInput
          label="Contact phone"
          value={contactPhone}
          onChange={setContactPhone}
        />
        <div className="grid gap-3 sm:grid-cols-2">
          <TextInput
            label={`Hourly rate (${currencyDisplayPrefix(currency)})`}
            type="number"
            step="0.01"
            value={hourlyRate}
            onChange={(e) => setHourlyRate(e.target.value)}
          />
          <label className="flex w-full flex-col gap-1.5 text-sm">
            <span className="font-medium text-[var(--mt-text)]">Currency</span>
            <select
              className={selectClass}
              value={currency}
              onChange={(e) =>
                setCurrency(e.target.value as SupportedCurrencyCode)
              }
            >
              {SUPPORTED_CURRENCIES.map((c) => (
                <option key={c.code} value={c.code}>
                  {c.label}
                </option>
              ))}
            </select>
          </label>
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
