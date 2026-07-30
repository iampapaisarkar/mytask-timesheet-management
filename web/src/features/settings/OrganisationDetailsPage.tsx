import { useEffect, useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { organisationsApi } from "@mytask/api";
import { queryKeys } from "@mytask/hooks";
import { getErrorMessage, phoneValueFromE164, fromAddressRecord, toAddressApiPayload, type PhoneValue } from "@mytask/utils";
import { can, getOrganisationAcl } from "@mytask/services";
import { useOrganisationStore } from "@/store/organisationStore";
import { Card, PageHeader } from "@/components/ui/Card";
import { Button } from "@/components/ui/Button";
import { TextInput } from "@/components/ui/TextInput";
import { GlobalPhoneInput, GlobalPhoneDisplay } from "@/components/ui/GlobalPhoneInput";
import { ErrorState, LoadingState } from "@/components/ui/States";
import { useToastStore } from "@/store/toastStore";
import {
  useUpdateOrganisation,
  useUpdateOrganisationSettings,
} from "./settingsHooks";
import {
  GoogleAddressAutocomplete,
  emptyAddress,
  type AddressValue,
} from "@/components/GoogleAddress";

export function OrganisationDetailsPage() {
  const organisation = useOrganisationStore((s) => s.organisation);
  const orgCode = organisation?.code || "";
  const role = organisation?.role || organisation?.role_code;
  const acl = getOrganisationAcl(role);
  const canEdit = can(acl, "organisationSetting", "edit");
  const toast = useToastStore();
  const updateOrg = useUpdateOrganisation();
  const updateSettings = useUpdateOrganisationSettings();

  const query = useQuery({
    queryKey: queryKeys.organisation(orgCode),
    queryFn: async ({ signal }) => {
      const res = await organisationsApi.get(orgCode, { signal });
      return res.data.data as Record<string, unknown>;
    },
    enabled: Boolean(orgCode),
  });

  const [editing, setEditing] = useState(false);
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [phone, setPhone] = useState<PhoneValue>({
    phone_number: null,
    phone_country_code: null,
    phone_country_iso: null,
  });
  const [website, setWebsite] = useState("");
  const [address, setAddress] = useState<AddressValue>(emptyAddress);
  const [frequency, setFrequency] = useState("weekly");

  useEffect(() => {
    if (!query.data) return;
    const data = query.data;
    const addr = (data.address || {}) as Record<string, unknown>;
    const settings = (data.settings || {}) as Record<string, unknown>;
    setName(String(data.name || ""));
    setEmail(String(data.email || ""));
    setPhone(
      phoneValueFromE164(
        String(data.phone_number || ""),
        (data.phone_country_iso as string) || null,
      ),
    );
    setWebsite(String(data.website || ""));
    setAddress(fromAddressRecord(addr));
    setFrequency(
      String(settings.timesheet_submission_frequency || "weekly"),
    );
  }, [query.data]);

  if (query.isLoading) return <LoadingState />;
  if (query.isError) {
    return (
      <ErrorState
        message={getErrorMessage(query.error)}
        onRetry={() => void query.refetch()}
      />
    );
  }

  const data = query.data || {};
  const viewAddress = (data.address || {}) as Record<string, unknown>;
  const orgRole = (data.role || {}) as { name?: string; code?: string };
  const viewState = (viewAddress.state || {}) as { name?: string };

  async function handleSave() {
    try {
      await updateOrg.mutateAsync({
        name: name.trim(),
        email: email.trim(),
        phone_number: phone.phone_number,
        phone_country_code: phone.phone_country_code,
        phone_country_iso: phone.phone_country_iso,
        default_country: phone.phone_country_iso || address.country_code,
        website: website.trim() || null,
        address: toAddressApiPayload(address, { includeCoordinates: false }),
      });
      await updateSettings.mutateAsync({
        timesheet_submission_frequency: frequency,
      });
      toast.success("Organisation updated");
      setEditing(false);
      void query.refetch();
    } catch (err) {
      toast.error("Update failed", getErrorMessage(err));
    }
  }

  if (editing) {
    return (
      <div className="mt-fade-in flex flex-col gap-4">
        <PageHeader
          title="Edit organisation"
          actions={
            <div className="flex gap-2">
              <Button variant="secondary" onClick={() => setEditing(false)}>
                Cancel
              </Button>
              <Button
                loading={updateOrg.isPending || updateSettings.isPending}
                onClick={() => void handleSave()}
              >
                Save
              </Button>
            </div>
          }
        />
        <Card className="flex flex-col gap-3">
          <TextInput label="Name" value={name} onChange={(e) => setName(e.target.value)} />
          <TextInput label="Email" type="email" value={email} onChange={(e) => setEmail(e.target.value)} />
          <GlobalPhoneInput
            label="Phone"
            required
            value={phone}
            onChange={setPhone}
          />
          <TextInput label="Website" value={website} onChange={(e) => setWebsite(e.target.value)} />
          <GoogleAddressAutocomplete
            label="Address"
            value={address}
            onChange={setAddress}
            requireCoordinates={false}
          />
          <label className="flex flex-col gap-1 text-sm">
            <span className="font-medium text-muted">
              Timesheet submission frequency
            </span>
            <select
              className="rounded-xl border border-border bg-[var(--mt-surface)] px-3 py-2.5"
              value={frequency}
              onChange={(e) => setFrequency(e.target.value)}
            >
              <option value="daily">Daily</option>
              <option value="weekly">Weekly</option>
              <option value="fortnightly">Fortnightly</option>
              <option value="monthly">Monthly</option>
            </select>
          </label>
        </Card>
      </div>
    );
  }

  return (
    <div className="mt-fade-in flex flex-col gap-4">
      <PageHeader
        title="Organisation details"
        description="Core organisation information"
        actions={
          canEdit ? (
            <Button type="button" onClick={() => setEditing(true)}>
              Edit
            </Button>
          ) : undefined
        }
      />
      <div className="grid gap-4 sm:grid-cols-2">
        <Card>
          <p className="text-xs font-medium uppercase text-muted">Name</p>
          <p className="mt-1 text-lg font-semibold">{String(data.name || "—")}</p>
        </Card>
        <Card>
          <p className="text-xs font-medium uppercase text-muted">Code</p>
          <p className="mt-1 text-lg font-semibold">{String(data.code || "—")}</p>
        </Card>
        <Card>
          <p className="text-xs font-medium uppercase text-muted">Email</p>
          <p className="mt-1 text-lg font-semibold">{String(data.email || "—")}</p>
        </Card>
        <Card>
          <p className="text-xs font-medium uppercase text-muted">Phone</p>
          <p className="mt-1 text-lg font-semibold">
            <GlobalPhoneDisplay
              phoneNumber={String(data.phone_number || "")}
              countryIso={
                (data.phone_country_iso as string | null | undefined) || null
              }
            />
          </p>
        </Card>
        <Card>
          <p className="text-xs font-medium uppercase text-muted">Your role</p>
          <p className="mt-1 text-lg font-semibold">
            {orgRole.name || orgRole.code || "—"}
          </p>
        </Card>
        <Card>
          <p className="text-xs font-medium uppercase text-muted">Website</p>
          <p className="mt-1 text-lg font-semibold">
            {String(data.website || "—")}
          </p>
        </Card>
        <Card className="sm:col-span-2">
          <p className="text-xs font-medium uppercase text-muted">Address</p>
          <p className="mt-1 text-sm leading-relaxed text-[var(--mt-text)]">
            {String(
              viewAddress.formatted_address ||
                [
                  viewAddress.address_line_1 || viewAddress.address_1,
                  viewAddress.address_line_2 || viewAddress.address_2,
                  viewAddress.street,
                  viewAddress.city,
                  viewState.name ||
                    viewAddress.state_region_province ||
                    viewAddress.administrative_area,
                  viewAddress.postal_code || viewAddress.postcode,
                  viewAddress.country,
                ]
                  .filter(Boolean)
                  .join(", "),
            ) || "—"}
          </p>
        </Card>
      </div>
    </div>
  );
}
