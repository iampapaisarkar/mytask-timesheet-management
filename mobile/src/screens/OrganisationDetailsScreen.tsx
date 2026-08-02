import { useEffect, useState } from "react";
import { ActivityIndicator, ScrollView, StyleSheet, Text, View } from "react-native";
import type { NativeStackScreenProps } from "@react-navigation/native-stack";
import { useQuery } from "@tanstack/react-query";
import { organisationsApi } from "@mytask/api";
import { queryKeys } from "@mytask/hooks";
import {
  SUPPORTED_CURRENCIES,
  currencyFromCountryIso,
  isSupportedCurrency,
  type SupportedCurrencyCode,
} from "@mytask/constants";
import { can, getOrganisationAcl } from "@mytask/services";
import { spacing, typography } from "@mytask/theme";
import {
  emptyGlobalAddress,
  fromAddressRecord,
  getErrorMessage,
  phoneValueFromE164,
  toAddressApiPayload,
  type GlobalAddress,
} from "@mytask/utils";
import {
  organisationDetailsSchema,
  type OrganisationDetailsFormValues,
} from "@mytask/validation";
import { AccessDenied } from "../components/AccessDenied";
import { FormTextField } from "../components/FormTextField";
import {
  GlobalPhoneDisplay,
  GlobalPhoneInput,
} from "../components/GlobalPhoneInput";
import { MobileSelect } from "../components/MobileSelect";
import { PlacesAddressInput } from "../components/PlacesAddressInput";
import { FormKeyboardScroll } from "../components/FormKeyboardScroll";
import type { OrgStackParamList } from "../navigation/types";
import { useOrganisationStore } from "../store/organisationStore";
import { useThemeStore } from "../store/themeStore";
import { useToastStore } from "../store/toastStore";
import { useAppForm, useValidatedSubmit } from "../hooks/useAppForm";
import { Button, Card, ErrorState } from "../ui";

type Props = NativeStackScreenProps<OrgStackParamList, "OrganisationDetails">;

const emptyOrgDetails: OrganisationDetailsFormValues = {
  name: "",
  website: "",
  email: "",
  phone_number: "",
  phone_country_code: null,
  phone_country_iso: null,
};

const FREQUENCY_OPTIONS = [
  { value: "daily", label: "Daily" },
  { value: "weekly", label: "Weekly" },
  { value: "fortnightly", label: "Fortnightly" },
  { value: "monthly", label: "Monthly" },
] as const;

function formatAddress(addr: Record<string, unknown> | null | undefined) {
  if (!addr) return "";
  const state = (addr.state || {}) as { name?: string };
  return (
    String(addr.formatted_address || "") ||
    [
      addr.address_line_1 || addr.address_1,
      addr.address_line_2 || addr.address_2,
      addr.street,
      addr.city,
      state.name || addr.state_region_province || addr.administrative_area,
      addr.postal_code || addr.postcode,
      addr.country,
    ]
      .filter(Boolean)
      .join(", ")
  );
}

export function OrganisationDetailsScreen({ route }: Props) {
  const { orgCode } = route.params;
  const organisation = useOrganisationStore((s) => s.organisation);
  const setOrganisation = useOrganisationStore((s) => s.setOrganisation);
  const role = organisation?.role || organisation?.role_code;
  const acl = getOrganisationAcl(role);
  const canView = can(acl, "organisationSetting", "view");
  const canEdit = can(acl, "organisationSetting", "edit");
  const c = useThemeStore((s) => s.colors);
  const toast = useToastStore();

  const [editing, setEditing] = useState(false);
  const [saving, setSaving] = useState(false);
  const [address, setAddress] = useState<GlobalAddress>(emptyGlobalAddress());
  const [frequency, setFrequency] = useState("weekly");
  const [defaultCurrency, setDefaultCurrency] =
    useState<SupportedCurrencyCode>("USD");

  const form = useAppForm<OrganisationDetailsFormValues>({
    schema: organisationDetailsSchema,
    defaultValues: emptyOrgDetails,
  });
  const { reset, watch, setValue, control } = form;
  const phoneNumber = watch("phone_number");
  const phoneIso = watch("phone_country_iso");
  const phoneCode = watch("phone_country_code");

  const query = useQuery({
    queryKey: queryKeys.organisation(orgCode),
    queryFn: async ({ signal }) => {
      const res = await organisationsApi.get(orgCode, { signal });
      return res.data.data as Record<string, unknown>;
    },
    enabled: Boolean(orgCode) && canView,
  });

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
    setSaving(true);
    try {
      await organisationsApi.update({
        name: values.name.trim(),
        email: values.email?.trim() || "",
        phone_number: values.phone_number || null,
        phone_country_code: values.phone_country_code,
        phone_country_iso: values.phone_country_iso,
        default_country: values.phone_country_iso || address.country_code,
        default_currency: defaultCurrency,
        website: values.website?.trim() || null,
        address: toAddressApiPayload(address, { includeCoordinates: false }),
        code: organisation?.code || orgCode,
        id: organisation?.id,
      });
      await organisationsApi.updateSettings({
        timesheet_submission_frequency: frequency,
      });
      if (organisation) {
        await setOrganisation({
          ...organisation,
          name: values.name.trim(),
        });
      }
      toast.success("Organisation updated");
      setEditing(false);
      void query.refetch();
    } catch (err) {
      toast.error("Update failed", getErrorMessage(err));
    } finally {
      setSaving(false);
    }
  });

  if (!canView) {
    return <AccessDenied />;
  }

  if (query.isLoading) {
    return (
      <View style={[styles.centered, { backgroundColor: c.bg }]}>
        <ActivityIndicator color={c.primary} />
      </View>
    );
  }

  if (query.isError) {
    return (
      <View style={[styles.flex, { backgroundColor: c.bg }]}>
        <ErrorState
          title="Failed to load organisation"
          description={getErrorMessage(query.error)}
          onRetry={() => void query.refetch()}
        />
      </View>
    );
  }

  const data = query.data || {};
  const viewAddress = (data.address || {}) as Record<string, unknown>;
  const orgRole = (data.role || {}) as { name?: string; code?: string };
  const addressLabel = formatAddress(viewAddress);

  if (editing) {
    return (
      <FormKeyboardScroll
        style={{ flex: 1, backgroundColor: c.bg }}
        contentContainerStyle={styles.container}
      >
        <View style={styles.editActions}>
          <Button
            title="Cancel"
            variant="secondary"
            onPress={() => setEditing(false)}
            disabled={saving}
            fullWidth={false}
            style={styles.actionBtn}
          />
          <Button
            title="Update"
            onPress={handleSave}
            loading={saving}
            fullWidth={false}
            style={styles.actionBtn}
          />
        </View>

        <Card style={styles.card}>
          <FormTextField
            control={control}
            name="name"
            label="Name"
            autoCapitalize="words"
            editable={!saving}
          />
          <FormTextField
            control={control}
            name="email"
            label="Email"
            autoCapitalize="none"
            keyboardType="email-address"
            editable={!saving}
          />
          <GlobalPhoneInput
            label="Phone"
            required
            value={{
              phone_number: phoneNumber || null,
              phone_country_code: phoneCode || null,
              phone_country_iso: phoneIso || null,
            }}
            onChange={(next) => {
              setValue("phone_number", next.phone_number || "", {
                shouldValidate: true,
              });
              setValue("phone_country_code", next.phone_country_code ?? null, {
                shouldValidate: true,
              });
              setValue("phone_country_iso", next.phone_country_iso ?? null, {
                shouldValidate: true,
              });
              if (next.phone_country_iso) {
                setDefaultCurrency(
                  currencyFromCountryIso(next.phone_country_iso),
                );
              }
            }}
            disabled={saving}
          />
          <MobileSelect
            label="Reporting currency (dashboard)"
            value={defaultCurrency}
            onChange={(value) =>
              setDefaultCurrency(value as SupportedCurrencyCode)
            }
            options={SUPPORTED_CURRENCIES.map((cur) => ({
              value: cur.code,
              label: cur.label,
            }))}
            searchable
            disabled={saving}
          />
          <Text style={[styles.hint, { color: c.muted }]}>
            Aggregated payroll on the dashboard converts employee payouts into
            this currency.
          </Text>
          <FormTextField
            control={control}
            name="website"
            label="Website"
            autoCapitalize="none"
            keyboardType="url"
            editable={!saving}
          />
          <PlacesAddressInput
            label="Address"
            value={address}
            onChange={setAddress}
            requireCoordinates={false}
          />
          <MobileSelect
            label="Timesheet submission frequency"
            value={frequency}
            onChange={setFrequency}
            options={[...FREQUENCY_OPTIONS]}
            searchable={false}
            disabled={saving}
          />
        </Card>
      </FormKeyboardScroll>
    );
  }

  return (
    <ScrollView
      style={{ flex: 1, backgroundColor: c.bg }}
      contentContainerStyle={styles.container}
    >
      <View style={styles.headerRow}>
        <Text style={[styles.pageSub, { color: c.muted, flex: 1 }]}>
          Core organisation information
        </Text>
        {canEdit ? (
          <Button
            title="Edit"
            onPress={() => setEditing(true)}
            size="sm"
            fullWidth={false}
          />
        ) : null}
      </View>

      <View style={styles.grid}>
        <Card style={styles.gridCard}>
          <Text style={[styles.label, { color: c.muted }]}>Name</Text>
          <Text style={[styles.value, { color: c.text }]}>
            {String(data.name || "—")}
          </Text>
        </Card>
        <Card style={styles.gridCard}>
          <Text style={[styles.label, { color: c.muted }]}>Code</Text>
          <Text style={[styles.value, { color: c.text }]}>
            {String(data.code || orgCode || "—")}
          </Text>
        </Card>
        <Card style={styles.gridCard}>
          <Text style={[styles.label, { color: c.muted }]}>Email</Text>
          <Text style={[styles.value, { color: c.text }]}>
            {String(data.email || "—")}
          </Text>
        </Card>
        <Card style={styles.gridCard}>
          <Text style={[styles.label, { color: c.muted }]}>Phone</Text>
          <Text style={[styles.value, { color: c.text }]}>
            {data.phone_number ? (
              <GlobalPhoneDisplay
                phoneNumber={String(data.phone_number || "")}
                countryIso={
                  (data.phone_country_iso as string | null | undefined) || null
                }
              />
            ) : (
              "—"
            )}
          </Text>
        </Card>
        <Card style={styles.gridCard}>
          <Text style={[styles.label, { color: c.muted }]}>
            Reporting currency
          </Text>
          <Text style={[styles.value, { color: c.text }]}>
            {String(data.default_currency || defaultCurrency || "—")}
          </Text>
        </Card>
        <Card style={styles.gridCard}>
          <Text style={[styles.label, { color: c.muted }]}>Your role</Text>
          <Text style={[styles.value, { color: c.text }]}>
            {orgRole.name || orgRole.code || String(role || "—")}
          </Text>
        </Card>
        <Card style={styles.gridCard}>
          <Text style={[styles.label, { color: c.muted }]}>Website</Text>
          <Text style={[styles.value, { color: c.text }]}>
            {String(data.website || "—")}
          </Text>
        </Card>
        <Card style={[styles.gridCard, styles.fullWidth]}>
          <Text style={[styles.label, { color: c.muted }]}>Address</Text>
          <Text style={[styles.addressValue, { color: c.text }]}>
            {addressLabel || "—"}
          </Text>
        </Card>
        <Card style={[styles.gridCard, styles.fullWidth]}>
          <Text style={[styles.label, { color: c.muted }]}>
            Timesheet submission frequency
          </Text>
          <Text style={[styles.value, { color: c.text }]}>
            {FREQUENCY_OPTIONS.find((o) => o.value === frequency)?.label ||
              frequency ||
              "—"}
          </Text>
        </Card>
      </View>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  flex: { flex: 1 },
  centered: { flex: 1, alignItems: "center", justifyContent: "center" },
  pageSub: { fontSize: 13, marginBottom: 8 },
  container: { padding: spacing.lg, paddingBottom: spacing.xxl },
  headerRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: spacing.sm,
    marginBottom: spacing.sm,
  },
  editActions: {
    flexDirection: "row",
    justifyContent: "flex-end",
    gap: spacing.sm,
    marginBottom: spacing.md,
  },
  actionBtn: { minWidth: 96 },
  card: { marginBottom: spacing.md, gap: spacing.sm },
  grid: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: spacing.md,
  },
  gridCard: {
    width: "47%",
    flexGrow: 1,
    minWidth: 140,
  },
  fullWidth: { width: "100%" },
  label: {
    fontSize: 11,
    fontWeight: "700",
    textTransform: "uppercase",
    letterSpacing: 0.4,
    marginBottom: 6,
  },
  value: { fontSize: typography.sizes.md, fontWeight: "700" },
  addressValue: {
    fontSize: typography.sizes.sm,
    fontWeight: "500",
    lineHeight: 20,
  },
  hint: { fontSize: 12, marginTop: -4, marginBottom: spacing.sm },
});
