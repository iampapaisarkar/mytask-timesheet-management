import { useEffect, useState } from "react";
import {
  useCreateJob,
  useCustomers,
  useManagementGroups,
} from "@mytask/hooks";
import { getErrorMessage, emptyPhoneValue, type PhoneValue } from "@mytask/utils";
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

export function CreateJobDialog({
  open,
  onClose,
}: {
  open: boolean;
  onClose: () => void;
}) {
  const toast = useToastStore();
  const createMutation = useCreateJob();
  const customersQuery = useCustomers({ rows_per_page: 200 }, open);
  const groupsQuery = useManagementGroups({ rows_per_page: 200 }, open);

  const [name, setName] = useState("");
  const [customerId, setCustomerId] = useState("");
  const [address, setAddress] = useState<AddressValue>(emptyAddress);
  const [radius, setRadius] = useState("100");
  const [siteContactName, setSiteContactName] = useState("");
  const [siteContactEmail, setSiteContactEmail] = useState("");
  const [siteContactPhone, setSiteContactPhone] =
    useState<PhoneValue>(emptyPhoneValue);
  const [groupIds, setGroupIds] = useState<number[]>([]);
  const [isActive, setIsActive] = useState(true);

  const customers = (Array.isArray(customersQuery.data)
    ? customersQuery.data
    : []) as Array<{ id?: number; name?: string }>;
  const groups = (Array.isArray(groupsQuery.data)
    ? groupsQuery.data
    : []) as Array<{ id?: number; name?: string }>;

  useEffect(() => {
    if (!open) {
      setName("");
      setCustomerId("");
      setAddress(emptyAddress());
      setRadius("100");
      setSiteContactName("");
      setSiteContactEmail("");
      setSiteContactPhone(emptyPhoneValue());
      setGroupIds([]);
      setIsActive(true);
    }
  }, [open]);

  if (!open) return null;

  function toggleGroup(id: number) {
    setGroupIds((prev) =>
      prev.includes(id) ? prev.filter((x) => x !== id) : [...prev, id],
    );
  }

  async function handleCreate() {
    if (!name.trim()) {
      toast.warning("Name required");
      return;
    }
    if (!customerId) {
      toast.warning("Customer required");
      return;
    }
    if (!(address.street_address || address.address_1 || address.formatted_address)?.trim()) {
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
    if (groupIds.length <= 0) {
      toast.warning("Select at least one management group");
      return;
    }

    try {
      await createMutation.mutateAsync({
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
        management_groups: groupIds.map((id) => ({ id })),
        is_active: isActive,
      });
      toast.success("Job created");
      onClose();
    } catch (err) {
      toast.error("Create failed", getErrorMessage(err));
    }
  }

  return (
    <FullScreenModal
      open={open}
      onClose={onClose}
      title="Create job"
      variant="form"
      footer={
        <>
          <Button variant="secondary" onClick={onClose}>
            Cancel
          </Button>
          <Button
            loading={createMutation.isPending}
            onClick={() => void handleCreate()}
          >
            Create
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

        <div>
          <p className="mb-2 text-sm font-medium text-[var(--mt-text)]">
            Site address
          </p>
          <GoogleAddressAutocomplete
            label="Site address"
            value={address}
            onChange={setAddress}
            requireCoordinates
          />
        </div>

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

        <fieldset className="flex flex-col gap-2">
          <legend className="text-sm font-medium text-[var(--mt-text)]">
            Management groups
          </legend>
          <div className="max-h-48 space-y-2 overflow-y-auto rounded-xl border border-border p-3">
            {!groups.length ? (
              <p className="text-sm text-muted">No management groups found</p>
            ) : (
              groups.map((g) => {
                const id = Number(g.id);
                return (
                  <label
                    key={String(g.id)}
                    className="flex items-center gap-2 text-sm"
                  >
                    <input
                      type="checkbox"
                      className="size-4 accent-primary"
                      checked={groupIds.includes(id)}
                      onChange={() => toggleGroup(id)}
                    />
                    <span>{g.name || `Group #${g.id}`}</span>
                  </label>
                );
              })
            )}
          </div>
        </fieldset>

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
