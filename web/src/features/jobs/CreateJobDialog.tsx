import { useEffect, useState } from "react";
import {
  useCreateJob,
  useCustomers,
  useManagementGroups,
} from "@mytask/hooks";
import { getErrorMessage } from "@mytask/utils";
import { Button } from "@/components/ui/Button";
import { TextInput } from "@/components/ui/TextInput";
import {
  GoogleAddress,
  type AddressValue,
} from "@/components/GoogleAddress";
import { useToastStore } from "@/store/toastStore";

const selectClass =
  "mt-focus rounded-xl border border-border bg-[var(--mt-surface)] px-3.5 py-3 text-[var(--mt-text)] outline-none focus:border-primary";

const emptyAddress = (): AddressValue => ({
  address_1: "",
  address_2: "",
  city: "",
  state: null,
  postcode: "",
  latitude: "",
  longitude: "",
});

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
  const [siteContactPhone, setSiteContactPhone] = useState("");
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
      setSiteContactPhone("");
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
    if (!address.address_1.trim()) {
      toast.warning("Address Line 1 is required");
      return;
    }
    if (!address.city.trim()) {
      toast.warning("City is required");
      return;
    }
    if (!address.state?.id) {
      toast.warning("State is required");
      return;
    }
    if (!address.postcode.trim()) {
      toast.warning("Postcode is required");
      return;
    }
    if (address.latitude === "" || address.latitude == null) {
      toast.warning("Latitude is required");
      return;
    }
    if (address.longitude === "" || address.longitude == null) {
      toast.warning("Longitude is required");
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
          address_1: address.address_1.trim(),
          address_2: address.address_2?.trim() || null,
          city: address.city.trim(),
          state: { id: address.state.id },
          postcode: address.postcode.trim(),
          latitude: Number(address.latitude),
          longitude: Number(address.longitude),
        },
        radius: Number(radius),
        site_contact_name: siteContactName.trim() || null,
        site_contact_email: siteContactEmail.trim() || null,
        site_contact_phone_number: siteContactPhone.trim() || null,
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
    <div className="fixed inset-0 z-[60] flex items-end justify-center bg-black/45 p-4 sm:items-center">
      <button
        type="button"
        className="absolute inset-0 cursor-pointer"
        aria-label="Close dialog"
        onClick={onClose}
      />
      <div className="relative z-10 max-h-[90vh] w-full max-w-2xl overflow-y-auto rounded-2xl border border-border bg-[var(--mt-surface)] p-5 shadow-2xl">
        <h2 className="text-lg font-bold text-[var(--mt-text)]">Create job</h2>
        <div className="mt-4 flex flex-col gap-3">
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
            <GoogleAddress value={address} onChange={setAddress} />
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
          <TextInput
            label="Site contact phone"
            value={siteContactPhone}
            onChange={(e) => setSiteContactPhone(e.target.value)}
          />

          <fieldset className="flex flex-col gap-2">
            <legend className="text-sm font-medium text-[var(--mt-text)]">
              Management groups
            </legend>
            <div className="max-h-40 space-y-2 overflow-y-auto rounded-xl border border-border p-3">
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
        <div className="mt-5 flex justify-end gap-2">
          <Button variant="secondary" onClick={onClose}>
            Cancel
          </Button>
          <Button
            loading={createMutation.isPending}
            onClick={() => void handleCreate()}
          >
            Create
          </Button>
        </div>
      </div>
    </div>
  );
}
