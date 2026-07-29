import { useEffect, useState } from "react";
import {
  useCreateCustomer,
  useUpdateCustomer,
} from "@mytask/hooks";
import { getErrorMessage } from "@mytask/utils";
import { Button } from "@/components/ui/Button";
import { FullScreenModal } from "@/components/ui/FullScreenModal";
import { TextInput } from "@/components/ui/TextInput";
import { useToastStore } from "@/store/toastStore";

export type CustomerRow = {
  id?: number | string;
  name?: string;
  abn?: string | null;
  address?: string | null;
  contact_name?: string | null;
  contact_email?: string | null;
  contact_phone_number?: string | null;
  hourly_rate?: number | string | null;
  is_active?: boolean | null;
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
  const [address, setAddress] = useState("");
  const [contactName, setContactName] = useState("");
  const [contactEmail, setContactEmail] = useState("");
  const [contactPhone, setContactPhone] = useState("");
  const [hourlyRate, setHourlyRate] = useState("");
  const [isActive, setIsActive] = useState(true);

  useEffect(() => {
    if (!open) return;
    setName(customer?.name || "");
    setAbn(customer?.abn || "");
    setAddress(customer?.address || "");
    setContactName(customer?.contact_name || "");
    setContactEmail(customer?.contact_email || "");
    setContactPhone(customer?.contact_phone_number || "");
    setHourlyRate(
      customer?.hourly_rate != null ? String(customer.hourly_rate) : "",
    );
    setIsActive(customer?.is_active !== false);
  }, [open, customer]);

  if (!open) return null;

  async function handleSubmit() {
    if (!name.trim()) {
      toast.warning("Name required");
      return;
    }
    const payload = {
      name: name.trim(),
      abn: abn.trim() || null,
      address: address.trim() || null,
      contact_name: contactName.trim() || null,
      contact_email: contactEmail.trim() || null,
      contact_phone_number: contactPhone.trim() || null,
      hourly_rate: hourlyRate.trim() ? Number(hourlyRate) : null,
      is_active: isActive,
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
          label="ABN"
          value={abn}
          onChange={(e) => setAbn(e.target.value)}
        />
        <TextInput
          label="Address"
          value={address}
          onChange={(e) => setAddress(e.target.value)}
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
        <TextInput
          label="Contact phone"
          value={contactPhone}
          onChange={(e) => setContactPhone(e.target.value)}
        />
        <TextInput
          label="Hourly rate"
          type="number"
          step="0.01"
          value={hourlyRate}
          onChange={(e) => setHourlyRate(e.target.value)}
        />
        <label className="flex items-center gap-2 text-sm">
          <input
            type="checkbox"
            className="size-4 accent-primary"
            checked={isActive}
            onChange={(e) => setIsActive(e.target.checked)}
          />
          <span className="font-medium text-[var(--mt-text)]">Active</span>
        </label>
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
