import { useCallback, useEffect, useRef, useState } from "react";
import {
  FlatList,
  RefreshControl,
  StyleSheet,
  Text,
  View,
} from "react-native";
import type { BottomSheetModal } from "@gorhom/bottom-sheet";
import type { NativeStackScreenProps } from "@react-navigation/native-stack";
import { Controller } from "react-hook-form";
import type { z } from "zod";
import {
  useCreateCustomer,
  useCustomers,
  useUpdateCustomer,
} from "@mytask/hooks";
import {
  DEFAULT_CURRENCY,
  DEFAULT_LIST_PAGE_SIZE,
  SUPPORTED_CURRENCIES,
  normalizeCurrency,
} from "@mytask/constants";
import { can, getOrganisationAcl } from "@mytask/services";
import { spacing } from "@mytask/theme";
import {
  customerSchema,
  type CustomerFormValues,
} from "@mytask/validation";
import {
  getErrorMessage,
  listPagination,
  listRows,
  phoneValueFromE164,
  emptyGlobalAddress,
  fromAddressRecord,
  toAddressApiPayload,
  type GlobalAddress,
} from "@mytask/utils";
import { AccessDenied } from "../components/AccessDenied";
import { FormTextField } from "../components/FormTextField";
import { GlobalPhoneInput } from "../components/GlobalPhoneInput";
import { ListPager } from "../components/ListPager";
import { MobileSelect } from "../components/MobileSelect";
import { PlacesAddressInput } from "../components/PlacesAddressInput";
import { SearchBar } from "../components/SearchBar";
import { SkeletonList } from "../components/Skeleton";
import {
  fieldChainProps,
  useAppForm,
  useFormFieldChain,
  useValidatedSubmit,
} from "../hooks/useAppForm";
import { useDebouncedValue } from "../hooks/useDebouncedValue";
import type { OrgStackParamList } from "../navigation/types";
import { useOrganisationStore } from "../store/organisationStore";
import { useThemeStore } from "../store/themeStore";
import { useToastStore } from "../store/toastStore";
import { triggerHaptic } from "../utils/haptics";
import {
  AppBottomSheet,
  BuildingIcon,
  Button,
  Card,
  ChevronIcon,
  EmptyState,
  ErrorState,
  PlusIcon,
} from "../ui";

type Props = NativeStackScreenProps<OrgStackParamList, "CustomersList">;

type CustomerRow = {
  id?: number | string;
  name?: string;
  abn?: string | null;
  address?: string | Record<string, unknown> | null;
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
  contact_phone_country_iso?: string | null;
  hourly_rate?: number | string | null;
  currency?: string | null;
};

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

function addressFromCustomer(row: CustomerRow): GlobalAddress {
  if (row.address && typeof row.address === "object") {
    return fromAddressRecord(row.address);
  }
  const addressStr = typeof row.address === "string" ? row.address : "";
  return fromAddressRecord({
    address_line_1:
      row.address_line_1 || row.formatted_address || addressStr || "",
    address_line_2: row.address_line_2 || "",
    street: row.street || "",
    administrative_area:
      row.administrative_area || row.state_region_province || "",
    state_region_province: row.state_region_province || "",
    city: row.city || "",
    postal_code: row.postal_code || "",
    country: row.country || "",
    country_code: row.country_code || "",
    place_id: row.place_id || "",
    latitude: row.latitude ?? null,
    longitude: row.longitude ?? null,
    formatted_address: row.formatted_address || addressStr || "",
  });
}

function formFromCustomer(row: CustomerRow): CustomerFormValues {
  const phone = phoneValueFromE164(
    row.contact_phone_number,
    row.contact_phone_country_iso,
  );
  const address = addressFromCustomer(row);
  return {
    name: row.name || "",
    abn: row.abn || "",
    address: address.formatted_address || address.address_line_1 || "",
    contact_name: row.contact_name || "",
    contact_email: row.contact_email || "",
    contact_phone_number: phone.phone_number || "",
    contact_phone_country_code: phone.phone_country_code,
    contact_phone_country_iso: phone.phone_country_iso,
    hourly_rate: row.hourly_rate != null ? String(row.hourly_rate) : "",
    currency: normalizeCurrency(row.currency),
  };
}

export function CustomersListScreen(_props: Props) {
  const [page, setPage] = useState(1);
  const [search, setSearch] = useState("");
  const [address, setAddress] = useState<GlobalAddress>(emptyGlobalAddress());
  const [editing, setEditing] = useState<CustomerRow | null>(null);
  const sheetRef = useRef<BottomSheetModal>(null);
  const debouncedSearch = useDebouncedValue(search.trim(), 400);
  const organisation = useOrganisationStore((s) => s.organisation);
  const role = organisation?.role || organisation?.role_code;
  const acl = getOrganisationAcl(role);
  const canList = can(acl, "customer", "list");
  const canCreate = can(acl, "customer", "create");
  const canEdit = can(acl, "customer", "edit");
  const c = useThemeStore((s) => s.colors);
  const toast = useToastStore();
  const createMutation = useCreateCustomer();
  const updateMutation = useUpdateCustomer();
  const isEdit = editing?.id != null;

  const form = useAppForm<CustomerFormValues>({
    schema: customerSchema as z.ZodType<CustomerFormValues>,
    defaultValues: emptyCustomer,
  });
  const chain = useFormFieldChain(form, [
    "name",
    "abn",
    "contact_name",
    "contact_email",
    "hourly_rate",
  ]);
  const { setValue, watch } = form;
  const phoneNumber = watch("contact_phone_number");
  const phoneIso = watch("contact_phone_country_iso");
  const phoneCode = watch("contact_phone_country_code");

  useEffect(() => {
    setPage(1);
  }, [debouncedSearch]);

  const { data, isLoading, isError, isFetching, refetch } = useCustomers(
    {
      rows_per_page: DEFAULT_LIST_PAGE_SIZE,
      page_number: page,
      sort_by: "id",
      ...(debouncedSearch ? { search: debouncedSearch } : {}),
    },
    canList,
  );
  const rows = listRows<CustomerRow>(data);
  const pagination = listPagination(data);
  const totalPages = Math.max(1, Number(pagination?.total_pages) || 1);
  const currentPage = Number(pagination?.page_number) || page;

  const openCreate = useCallback(() => {
    setEditing(null);
    form.reset(emptyCustomer);
    setAddress(emptyGlobalAddress());
    sheetRef.current?.present();
  }, [form]);

  const openEdit = useCallback(
    (row: CustomerRow) => {
      if (!canEdit || row.id == null) return;
      setEditing(row);
      form.reset(formFromCustomer(row));
      setAddress(addressFromCustomer(row));
      sheetRef.current?.present();
    },
    [canEdit, form],
  );

  const handleSubmit = useValidatedSubmit(form, async (values) => {
    const addressPayload = toAddressApiPayload(address, {
      includeCoordinates: false,
    });
    const payload: Record<string, unknown> = {
      name: values.name.trim(),
      abn: values.abn?.trim() || null,
      ...(addressPayload
        ? { address: addressPayload, ...addressPayload }
        : { address: null }),
      contact_name: values.contact_name?.trim() || null,
      contact_email: values.contact_email?.trim() || null,
      contact_phone_number: values.contact_phone_number || null,
      contact_phone_country_code: values.contact_phone_country_code,
      contact_phone_country_iso: values.contact_phone_country_iso,
      hourly_rate: values.hourly_rate
        ? Number(String(values.hourly_rate).trim())
        : null,
      currency: normalizeCurrency(values.currency),
    };
    try {
      if (isEdit && editing?.id != null) {
        await updateMutation.mutateAsync({ id: editing.id, payload });
        toast.success("Customer updated");
      } else {
        await createMutation.mutateAsync(payload);
        toast.success("Customer created");
      }
      sheetRef.current?.dismiss();
      form.reset(emptyCustomer);
      setAddress(emptyGlobalAddress());
      setEditing(null);
    } catch (err) {
      toast.error(
        isEdit ? "Update failed" : "Create failed",
        getErrorMessage(err),
      );
    }
  });

  if (!canList) {
    return <AccessDenied />;
  }

  if (isError && !data) {
    return (
      <View style={[styles.flex, { backgroundColor: c.bg }]}>
        <ErrorState
          title="Failed to load customers"
          description="Check your connection and try again."
          onRetry={() => void refetch()}
        />
      </View>
    );
  }

  const pending = createMutation.isPending || updateMutation.isPending;

  return (
    <View style={{ flex: 1, backgroundColor: c.bg }}>
      <View style={styles.header}>
        <Text style={[styles.pageSub, { color: c.muted }]}>Client directory</Text>
        <SearchBar
          value={search}
          onChangeText={setSearch}
          placeholder="Search name or email"
        />
        {canCreate ? (
          <Button
            title="Add customer"
            onPress={openCreate}
            size="sm"
            fullWidth={false}
            leftIcon={<PlusIcon color={c.white} size={16} />}
            style={styles.addBtn}
          />
        ) : null}
      </View>
      {isLoading && !data ? (
        <SkeletonList rows={6} />
      ) : (
        <FlatList
          contentContainerStyle={styles.list}
          data={rows}
          keyExtractor={(item, index) => String(item.id ?? index)}
          showsHorizontalScrollIndicator={false}
          refreshControl={
            <RefreshControl
              refreshing={isFetching && !isLoading}
              onRefresh={() => {
                void triggerHaptic("light");
                void refetch();
              }}
              tintColor={c.primary}
            />
          }
          ListEmptyComponent={
            <EmptyState
              icon={<BuildingIcon color={c.primary} size={28} />}
              title={debouncedSearch ? "No matching customers" : "No customers yet"}
              description={
                debouncedSearch
                  ? "Try a different search term."
                  : "Add your first customer to start creating jobs."
              }
              actionLabel={
                !debouncedSearch && canCreate ? "Add customer" : undefined
              }
              onAction={!debouncedSearch && canCreate ? openCreate : undefined}
            />
          }
          ListFooterComponent={
            <ListPager
              currentPage={currentPage}
              totalPages={totalPages}
              isFetching={isFetching}
              hasRows={Boolean(rows.length || Number(pagination?.total_rows))}
              onPrev={() => setPage(Math.max(1, currentPage - 1))}
              onNext={() => setPage(Math.min(totalPages, currentPage + 1))}
            />
          }
          renderItem={({ item }) => (
            <Card
              style={styles.card}
              accessibilityLabel={`Customer ${item.name || item.id}`}
              onPress={canEdit ? () => openEdit(item) : undefined}
            >
              <View style={styles.row}>
                <View style={styles.textCol}>
                  <Text style={[styles.name, { color: c.text }]} numberOfLines={1}>
                    {item.name || `Customer #${item.id}`}
                  </Text>
                  <Text style={[styles.meta, { color: c.muted }]} numberOfLines={1}>
                    {item.contact_email || "—"}
                  </Text>
                  {item.abn ? (
                    <Text style={[styles.meta, { color: c.subtle }]} numberOfLines={1}>
                      ABN {item.abn}
                    </Text>
                  ) : null}
                </View>
                {canEdit ? <ChevronIcon color={c.subtle} /> : null}
              </View>
            </Card>
          )}
        />
      )}

      <AppBottomSheet
        ref={sheetRef}
        title={isEdit ? "Edit customer" : "Create customer"}
        snapPoints={["70%", "92%"]}
        onDismiss={() => {
          setEditing(null);
          form.reset(emptyCustomer);
          setAddress(emptyGlobalAddress());
        }}
        footer={
          <Button
            title={
              pending
                ? isEdit
                  ? "Saving…"
                  : "Creating…"
                : isEdit
                  ? "Save"
                  : "Create"
            }
            disabled={pending}
            loading={pending}
            onPress={handleSubmit}
          />
        }
      >
        <FormTextField
          control={form.control}
          name="name"
          label="Name"
          inputType="bottomSheet"
          autoCapitalize="words"
          editable={!pending}
          {...fieldChainProps(chain, "name")}
        />
        <FormTextField
          control={form.control}
          name="abn"
          label="Business / tax ID"
          inputType="bottomSheet"
          editable={!pending}
          {...fieldChainProps(chain, "abn")}
        />
        <PlacesAddressInput
          value={address}
          onChange={(next) => {
            setAddress(next);
            setValue(
              "address",
              next.formatted_address || next.address_line_1 || "",
              { shouldDirty: true },
            );
          }}
          label="Address"
          inBottomSheet
        />
        <FormTextField
          control={form.control}
          name="contact_name"
          label="Contact name"
          inputType="bottomSheet"
          autoCapitalize="words"
          editable={!pending}
          {...fieldChainProps(chain, "contact_name")}
        />
        <FormTextField
          control={form.control}
          name="contact_email"
          label="Contact email"
          inputType="bottomSheet"
          autoCapitalize="none"
          keyboardType="email-address"
          editable={!pending}
          {...fieldChainProps(chain, "contact_email")}
        />
        <Controller
          control={form.control}
          name="contact_phone_number"
          render={({ field: { onChange }, fieldState }) => (
            <GlobalPhoneInput
              label="Contact phone"
              value={{
                phone_number: phoneNumber || null,
                phone_country_code: phoneCode || null,
                phone_country_iso: phoneIso || null,
              }}
              onChange={(phone) => {
                onChange(phone.phone_number || "");
                setValue("contact_phone_country_code", phone.phone_country_code, {
                  shouldValidate: true,
                });
                setValue("contact_phone_country_iso", phone.phone_country_iso, {
                  shouldValidate: true,
                });
              }}
              error={fieldState.error?.message}
              inBottomSheet
              disabled={pending}
            />
          )}
        />
        <FormTextField
          control={form.control}
          name="hourly_rate"
          label="Hourly rate"
          inputType="bottomSheet"
          keyboardType="decimal-pad"
          editable={!pending}
          {...fieldChainProps(chain, "hourly_rate")}
        />
        <Controller
          control={form.control}
          name="currency"
          render={({ field: { value, onChange } }) => (
            <MobileSelect
              label="Currency"
              value={value || DEFAULT_CURRENCY}
              onChange={onChange}
              options={SUPPORTED_CURRENCIES.map((cur) => ({
                value: cur.code,
                label: cur.label,
              }))}
              searchable
              disabled={pending}
            />
          )}
        />
      </AppBottomSheet>
    </View>
  );
}

const styles = StyleSheet.create({
  pageSub: { fontSize: 13, marginBottom: 8 },
  flex: { flex: 1 },
  header: {
    paddingHorizontal: spacing.md,
    paddingTop: spacing.md,
    gap: spacing.sm,
  },
  addBtn: { alignSelf: "flex-end" },
  list: {
    padding: spacing.md,
    paddingTop: spacing.sm,
    paddingBottom: spacing.xxl,
  },
  card: { marginBottom: spacing.sm },
  row: {
    flexDirection: "row",
    alignItems: "center",
    gap: spacing.sm,
  },
  textCol: { flex: 1, minWidth: 0 },
  name: { fontWeight: "700", marginBottom: 4, letterSpacing: -0.2 },
  meta: { marginTop: 2, fontSize: 12, fontWeight: "500" },
});
