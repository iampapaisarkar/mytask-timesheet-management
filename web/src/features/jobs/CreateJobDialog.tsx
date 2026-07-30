import { useEffect, useState } from "react";
import {
  useCreateJob,
  useCustomers,
  useUpdateJob,
} from "@mytask/hooks";
import {
  getErrorMessage,
  emptyPhoneValue,
  phoneValueFromE164,
  type PhoneValue,
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
import { MapLocationPicker } from "@/components/maps/MapLocationPicker";
import { useToastStore } from "@/store/toastStore";

const selectClass =
  "mt-focus rounded-xl border border-border bg-[var(--mt-surface)] px-3.5 py-3 text-[var(--mt-text)] outline-none focus:border-primary";

export type JobRow = {
  id?: number | string;
  name?: string;
  customer?: { id?: number | string; name?: string } | null;
  customer_id?: number | string | null;
  address?: {
    address_1?: string | null;
    address_2?: string | null;
    street_address?: string | null;
    formatted_address?: string | null;
    city?: string | null;
    state?: { id?: number; name?: string; code?: string } | null;
    administrative_area?: string | null;
    postcode?: string | null;
    postal_code?: string | null;
    country?: string | null;
    country_code?: string | null;
    place_id?: string | null;
    latitude?: number | string | null;
    longitude?: number | string | null;
  } | null;
  radius?: number | string | null;
  site_contact_name?: string | null;
  site_contact_email?: string | null;
  site_contact_phone_number?: string | null;
  site_contact_phone_country_code?: string | null;
  site_contact_phone_country_iso?: string | null;
};

function addressFromJob(job?: JobRow | null): AddressValue {
  const addr = job?.address;
  if (!addr) return emptyAddress();
  const street =
    addr.street_address ||
    addr.address_1 ||
    addr.formatted_address ||
    "";
  const admin =
    addr.administrative_area || addr.state?.name || "";
  return {
    ...emptyAddress(),
    formatted_address: addr.formatted_address || street,
    street_address: street,
    address_1: street,
    address_2: addr.address_2 || "",
    city: addr.city || "",
    administrative_area: admin,
    postcode: addr.postcode || addr.postal_code || "",
    postal_code: addr.postal_code || addr.postcode || "",
    country: addr.country || "",
    country_code: addr.country_code || "",
    place_id: addr.place_id || "",
    latitude: addr.latitude ?? "",
    longitude: addr.longitude ?? "",
    state: addr.state
      ? {
          id: addr.state.id,
          name: addr.state.name,
          code: addr.state.code,
        }
      : admin
        ? { name: admin }
        : null,
  };
}

export function JobFormDialog({
  open,
  onClose,
  job,
}: {
  open: boolean;
  onClose: () => void;
  job?: JobRow | null;
}) {
  const toast = useToastStore();
  const createMutation = useCreateJob();
  const updateMutation = useUpdateJob();
  const isEdit = job?.id != null;
  const customersQuery = useCustomers({ rows_per_page: 200 }, open);

  const [name, setName] = useState("");
  const [customerId, setCustomerId] = useState("");
  const [address, setAddress] = useState<AddressValue>(emptyAddress);
  const [radius, setRadius] = useState("100");
  const [siteContactName, setSiteContactName] = useState("");
  const [siteContactEmail, setSiteContactEmail] = useState("");
  const [siteContactPhone, setSiteContactPhone] =
    useState<PhoneValue>(emptyPhoneValue);

  const customers = (Array.isArray(customersQuery.data)
    ? customersQuery.data
    : []) as Array<{ id?: number; name?: string }>;

  useEffect(() => {
    if (!open) return;
    setName(job?.name || "");
    setCustomerId(
      job?.customer?.id != null
        ? String(job.customer.id)
        : job?.customer_id != null
          ? String(job.customer_id)
          : "",
    );
    setAddress(addressFromJob(job));
    setRadius(job?.radius != null ? String(job.radius) : "100");
    setSiteContactName(job?.site_contact_name || "");
    setSiteContactEmail(job?.site_contact_email || "");
    setSiteContactPhone(
      phoneValueFromE164(
        job?.site_contact_phone_number,
        job?.site_contact_phone_country_iso,
      ),
    );
  }, [open, job]);

  if (!open) return null;

  async function handleSubmit() {
    if (!name.trim()) {
      toast.warning("Name required");
      return;
    }
    if (!customerId) {
      toast.warning("Customer required");
      return;
    }
    if (
      !(
        address.street_address ||
        address.address_1 ||
        address.formatted_address
      )?.trim()
    ) {
      toast.warning("Please select an address from Google Places");
      return;
    }
    if (address.latitude === "" || address.latitude == null) {
      toast.warning("Please select an address with map coordinates");
      return;
    }
    if (address.longitude === "" || address.longitude == null) {
      toast.warning("Please select an address with map coordinates");
      return;
    }
    if (!radius.trim()) {
      toast.warning("Radius is required");
      return;
    }

    const payload = {
      name: name.trim(),
      customer: { id: Number(customerId) },
      address: {
        address_1: (address.street_address || address.address_1).trim(),
        street_address: (address.street_address || address.address_1).trim(),
        formatted_address: address.formatted_address || null,
        address_2: address.address_2?.trim() || null,
        city: address.city || null,
        state: address.state,
        administrative_area: address.administrative_area || null,
        postcode: address.postal_code || address.postcode || null,
        postal_code: address.postal_code || address.postcode || null,
        country: address.country || null,
        country_code: address.country_code || null,
        place_id: address.place_id || null,
        latitude: Number(address.latitude),
        longitude: Number(address.longitude),
      },
      radius: Number(radius),
      site_contact_name: siteContactName.trim() || null,
      site_contact_email: siteContactEmail.trim() || null,
      site_contact_phone_number: siteContactPhone.phone_number,
      site_contact_phone_country_code: siteContactPhone.phone_country_code,
      site_contact_phone_country_iso: siteContactPhone.phone_country_iso,
    };

    try {
      if (isEdit && job?.id != null) {
        await updateMutation.mutateAsync({ id: job.id, payload });
        toast.success("Job updated");
      } else {
        await createMutation.mutateAsync(payload);
        toast.success("Job created");
      }
      onClose();
    } catch (err) {
      toast.error(
        isEdit ? "Update failed" : "Create failed",
        getErrorMessage(err),
      );
    }
  }

  const pending = createMutation.isPending || updateMutation.isPending;

  return (
    <FullScreenModal
      open={open}
      onClose={onClose}
      title={isEdit ? "Edit job" : "Create job"}
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
        <label className="flex w-full flex-col gap-1.5 text-sm">
          <span className="font-medium text-[var(--mt-text)]">Customer</span>
          <select
            className={selectClass}
            value={customerId}
            onChange={(e) => setCustomerId(e.target.value)}
          >
            <option value="">Select customer</option>
            {customers.map((c) => (
              <option key={String(c.id)} value={String(c.id)}>
                {c.name || `Customer #${c.id}`}
              </option>
            ))}
          </select>
        </label>

        <GoogleAddressAutocomplete
          label="Site address"
          value={address}
          onChange={setAddress}
          requireCoordinates
        />
        <MapLocationPicker value={address} onChange={setAddress} />

        <TextInput
          label="Geofence radius (meters)"
          type="number"
          min={1}
          value={radius}
          onChange={(e) => setRadius(e.target.value)}
        />

        <TextInput
          label="Site contact name"
          value={siteContactName}
          onChange={(e) => setSiteContactName(e.target.value)}
        />
        <TextInput
          label="Site contact email"
          type="email"
          value={siteContactEmail}
          onChange={(e) => setSiteContactEmail(e.target.value)}
        />
        <GlobalPhoneInput
          label="Site contact phone"
          value={siteContactPhone}
          onChange={setSiteContactPhone}
        />
      </div>
    </FullScreenModal>
  );
}

/** @deprecated Prefer JobFormDialog */
export function CreateJobDialog(
  props: Omit<Parameters<typeof JobFormDialog>[0], "job">,
) {
  return <JobFormDialog {...props} />;
}
