import { useEffect, useState } from "react";
import { Controller } from "react-hook-form";
import { useQuery } from "@tanstack/react-query";
import { organisationsApi } from "@mytask/api";
import { queryKeys } from "@mytask/hooks";
import {
  SUPPORTED_CURRENCIES,
  currencyFromCountryIso,
  isSupportedCurrency,
  type SupportedCurrencyCode,
} from "@mytask/constants";
import {
  getErrorMessage,
  phoneValueFromE164,
  fromAddressRecord,
  toAddressApiPayload,
} from "@mytask/utils";
import {
  organisationDetailsSchema,
  type OrganisationDetailsFormValues,
} from "@mytask/validation";
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
import { useLocaleDefaults } from "@/hooks/useLocaleDefaults";
import { useAppForm, useValidatedSubmit } from "@/hooks/useAppForm";

const emptyOrgDetails: OrganisationDetailsFormValues = {
  name: "",
  website: "",
  email: "",
  phone_number: "",
  phone_country_code: null,
  phone_country_iso: null,
};

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
  const [address, setAddress] = useState<AddressValue>(emptyAddress);
  const [frequency, setFrequency] = useState("weekly");
  const [defaultCurrency, setDefaultCurrency] =
    useState<SupportedCurrencyCode>("USD");

  const form = useAppForm<OrganisationDetailsFormValues>({
    schema: organisationDetailsSchema,
    defaultValues: emptyOrgDetails,
  });
  const {
    register,
    control,
    reset,
    watch,
    formState: { errors },
  } = form;

  const phoneIso = watch("phone_country_iso");
  const localeDefaults = useLocaleDefaults(
    phoneIso ||
      (organisation as { default_country?: string } | null)?.default_country ||
      null,
  );

  useEffect(() => {
    if (!query.data) return;
    const data = query.data;
    const addr = (data.address || {}) as Record<string, unknown>;
    const settings = (data.settings || {}) as Record<string, unknown>;
    const phone = phoneValueFromE164(
      String(data.phone_number || ""),
      (data.phone_country_iso as string) || null,
    );
    reset({
      name: String(data.name || ""),
      email: String(data.email || ""),
      website: String(data.website || ""),
      phone_number: phone.phone_number || "",
      phone_country_code: phone.phone_country_code,
      phone_country_iso: phone.phone_country_iso,
    });
    setAddress(fromAddressRecord(addr));
    setFrequency(String(settings.timesheet_submission_frequency || "weekly"));
    const stored = String(data.default_currency || "").toUpperCase();
    if (isSupportedCurrency(stored)) {
      setDefaultCurrency(stored);
    } else {
      setDefaultCurrency(
        currencyFromCountryIso(
          (data.default_country as string) ||
            (data.phone_country_iso as string) ||
            null,
        ),
      );
    }
  }, [query.data, reset]);

  const handleSave = useValidatedSubmit(form, async (values) => {
    try {
      await updateOrg.mutateAsync({
        name: values.name.trim(),
        email: values.email?.trim() || "",
        phone_number: values.phone_number || null,
        phone_country_code: values.phone_country_code,
        phone_country_iso: values.phone_country_iso,
        default_country: values.phone_country_iso || address.country_code,
        default_currency: defaultCurrency,
        website: values.website?.trim() || null,
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
  });

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
                onClick={handleSave}
              >
                Save
              </Button>
            </div>
          }
        />
        <Card className="flex flex-col gap-3">
          <TextInput
            label="Name"
            error={errors.name?.message}
            {...register("name")}
          />
          <TextInput
            label="Email"
            type="email"
            error={errors.email?.message}
            {...register("email")}
          />
          <Controller
            control={control}
            name="phone_number"
            render={({ fieldState }) => (
              <GlobalPhoneInput
                label="Phone"
                required
                defaultCountry={localeDefaults.defaultCountry}
                value={{
                  phone_number: watch("phone_number") || null,
                  phone_country_code: watch("phone_country_code") ?? null,
                  phone_country_iso: watch("phone_country_iso") ?? null,
                }}
                onChange={(next) => {
                  form.setValue("phone_number", next.phone_number || "", {
                    shouldValidate: true,
                  });
                  form.setValue(
                    "phone_country_code",
                    next.phone_country_code ?? null,
                    { shouldValidate: true },
                  );
                  form.setValue(
                    "phone_country_iso",
                    next.phone_country_iso ?? null,
                    { shouldValidate: true },
                  );
                  if (next.phone_country_iso) {
                    setDefaultCurrency(
                      currencyFromCountryIso(next.phone_country_iso),
                    );
                  }
                }}
                error={fieldState.error?.message}
              />
            )}
          />
          <label className="flex flex-col gap-1 text-sm">
            <span className="font-medium text-muted">
              Reporting currency (dashboard)
            </span>
            <select
              className="rounded-xl border border-border bg-[var(--mt-surface)] px-3 py-2.5"
              value={defaultCurrency}
              onChange={(e) =>
                setDefaultCurrency(e.target.value as SupportedCurrencyCode)
              }
            >
              {SUPPORTED_CURRENCIES.map((c) => (
                <option key={c.code} value={c.code}>
                  {c.label}
                </option>
              ))}
            </select>
            <span className="text-xs text-muted">
              Aggregated payroll on the dashboard converts employee payouts into
              this currency.
            </span>
          </label>
          <TextInput
            label="Website"
            error={errors.website?.message}
            {...register("website")}
          />
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
          <p className="text-xs font-medium uppercase text-muted">
            Reporting currency
          </p>
          <p className="mt-1 text-lg font-semibold">
            {String(data.default_currency || defaultCurrency || "—")}
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
