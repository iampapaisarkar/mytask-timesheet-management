import { useCallback, useEffect, useMemo, useRef, useState } from "react";
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
import {
  useCreateJob,
  useCustomers,
  useJobs,
  useUpdateJob,
} from "@mytask/hooks";
import { DEFAULT_LIST_PAGE_SIZE } from "@mytask/constants";
import { can, getOrganisationAcl } from "@mytask/services";
import { spacing } from "@mytask/theme";
import {
  jobFormSchema,
  type JobFormValues,
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
import { FormFieldError, FormTextField } from "../components/FormTextField";
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
  BriefcaseIcon,
  Button,
  Card,
  ChevronIcon,
  EmptyState,
  ErrorState,
  PlusIcon,
} from "../ui";

type Props = NativeStackScreenProps<OrgStackParamList, "JobsList">;

type JobRow = {
  id?: number | string;
  name?: string;
  details?: { id?: number; name?: string };
  customer?: { id?: number | string; name?: string } | null;
  customer_id?: number | string | null;
  address?: Record<string, unknown> | null;
  radius?: number | string | null;
  site_contact_name?: string | null;
  site_contact_email?: string | null;
  site_contact_phone_number?: string | null;
  site_contact_phone_country_iso?: string | null;
};

type CustomerRow = {
  id?: number | string;
  name?: string;
};

const emptyJob: JobFormValues = {
  name: "",
  customer_id: "",
  address_line_1: "",
  formatted_address: "",
  latitude: null,
  longitude: null,
  radius: "100",
  site_contact_name: "",
  site_contact_email: "",
  site_contact_phone_number: "",
  site_contact_phone_country_code: null,
  site_contact_phone_country_iso: null,
};

function jobId(row: JobRow): number | string | undefined {
  return row.details?.id ?? row.id;
}

function jobName(row: JobRow): string {
  return row.details?.name || row.name || "";
}

function coordsFromAddress(next: GlobalAddress): {
  latitude: number | null;
  longitude: number | null;
} {
  const latitude =
    next.latitude === "" || next.latitude == null
      ? null
      : Number(next.latitude);
  const longitude =
    next.longitude === "" || next.longitude == null
      ? null
      : Number(next.longitude);
  return { latitude, longitude };
}

function formFromJob(row: JobRow): JobFormValues {
  const addr = fromAddressRecord(row.address || null);
  const { latitude, longitude } = coordsFromAddress(addr);
  const phone = phoneValueFromE164(
    row.site_contact_phone_number,
    row.site_contact_phone_country_iso,
  );
  return {
    name: jobName(row),
    customer_id:
      row.customer?.id != null
        ? String(row.customer.id)
        : row.customer_id != null
          ? String(row.customer_id)
          : "",
    address_line_1: addr.address_line_1 || "",
    formatted_address: addr.formatted_address || "",
    latitude,
    longitude,
    radius: row.radius != null ? String(row.radius) : "100",
    site_contact_name: row.site_contact_name || "",
    site_contact_email: row.site_contact_email || "",
    site_contact_phone_number: phone.phone_number || "",
    site_contact_phone_country_code: phone.phone_country_code,
    site_contact_phone_country_iso: phone.phone_country_iso,
  };
}

export function JobsListScreen(_props: Props) {
  const [page, setPage] = useState(1);
  const [search, setSearch] = useState("");
  const [customerId, setCustomerId] = useState<string>("");
  const [address, setAddress] = useState<GlobalAddress>(emptyGlobalAddress());
  const [editing, setEditing] = useState<JobRow | null>(null);
  const sheetRef = useRef<BottomSheetModal>(null);
  const debouncedSearch = useDebouncedValue(search.trim(), 400);
  const organisation = useOrganisationStore((s) => s.organisation);
  const role = organisation?.role || organisation?.role_code;
  const acl = getOrganisationAcl(role);
  const canList = can(acl, "job", "list");
  const canCreate = can(acl, "job", "create");
  const canEdit = can(acl, "job", "edit");
  const c = useThemeStore((s) => s.colors);
  const toast = useToastStore();
  const createMutation = useCreateJob();
  const updateMutation = useUpdateJob();
  const editingId = editing ? jobId(editing) : undefined;
  const isEdit = editingId != null;

  const form = useAppForm<JobFormValues>({
    schema: jobFormSchema,
    defaultValues: emptyJob,
  });
  const chain = useFormFieldChain(form, [
    "name",
    "radius",
    "site_contact_name",
    "site_contact_email",
  ]);
  const { setValue, watch } = form;
  const phoneNumber = watch("site_contact_phone_number");
  const phoneIso = watch("site_contact_phone_country_iso");
  const phoneCode = watch("site_contact_phone_country_code");

  useEffect(() => {
    setPage(1);
  }, [debouncedSearch, customerId]);

  const customersQuery = useCustomers({ rows_per_page: 200, sort_by: "name" });
  const customers = listRows<CustomerRow>(customersQuery.data);
  const customerOptions = useMemo(
    () =>
      customers.map((cust) => ({
        value: String(cust.id),
        label: cust.name || `Customer #${cust.id}`,
      })),
    [customers],
  );
  const filterOptions = useMemo(
    () => [{ value: "", label: "All customers" }, ...customerOptions],
    [customerOptions],
  );

  const { data, isLoading, isError, isFetching, refetch } = useJobs(
    {
      rows_per_page: DEFAULT_LIST_PAGE_SIZE,
      page_number: page,
      sort_by: "id",
      ...(debouncedSearch ? { search: debouncedSearch } : {}),
      ...(customerId ? { customer_id: customerId } : {}),
    },
    canList,
  );
  const rows = listRows<JobRow>(data);
  const pagination = listPagination(data);
  const totalPages = Math.max(1, Number(pagination?.total_pages) || 1);
  const currentPage = Number(pagination?.page_number) || page;

  const handleAddressChange = useCallback(
    (next: GlobalAddress) => {
      setAddress(next);
      const { latitude, longitude } = coordsFromAddress(next);
      setValue("address_line_1", next.address_line_1 || "", {
        shouldValidate: true,
      });
      setValue("formatted_address", next.formatted_address || "", {
        shouldValidate: true,
      });
      setValue("latitude", latitude, { shouldValidate: true });
      setValue("longitude", longitude, { shouldValidate: true });
    },
    [setValue],
  );

  const openCreate = useCallback(() => {
    setEditing(null);
    form.reset(emptyJob);
    setAddress(emptyGlobalAddress());
    sheetRef.current?.present();
  }, [form]);

  const openEdit = useCallback(
    (row: JobRow) => {
      if (!canEdit || jobId(row) == null) return;
      setEditing(row);
      form.reset(formFromJob(row));
      setAddress(fromAddressRecord(row.address || null));
      sheetRef.current?.present();
    },
    [canEdit, form],
  );

  const handleSubmit = useValidatedSubmit(form, async (values) => {
    const payload: Record<string, unknown> = {
      name: values.name.trim(),
      customer: { id: Number(values.customer_id) },
      address: toAddressApiPayload(address, { includeCoordinates: true }),
      radius: Number(values.radius),
      site_contact_name: values.site_contact_name?.trim() || null,
      site_contact_email: values.site_contact_email?.trim() || null,
      site_contact_phone_number: values.site_contact_phone_number || null,
      site_contact_phone_country_code: values.site_contact_phone_country_code,
      site_contact_phone_country_iso: values.site_contact_phone_country_iso,
    };
    try {
      if (isEdit && editingId != null) {
        await updateMutation.mutateAsync({ id: editingId, payload });
        toast.success("Job updated");
      } else {
        await createMutation.mutateAsync(payload);
        toast.success("Job created");
      }
      sheetRef.current?.dismiss();
      form.reset(emptyJob);
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
          title="Failed to load jobs"
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
        <Text style={[styles.pageSub, { color: c.muted }]}>Work sites and jobs</Text>
        <SearchBar
          value={search}
          onChangeText={setSearch}
          placeholder="Search by job name"
        />
        <MobileSelect
          label="Filter by customer"
          value={customerId}
          options={filterOptions}
          onChange={setCustomerId}
          placeholder="All customers"
        />
        {canCreate ? (
          <Button
            title="Add job"
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
          keyExtractor={(item, index) =>
            String(item.details?.id ?? item.id ?? index)
          }
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
              icon={<BriefcaseIcon color={c.primary} size={28} />}
              title={
                debouncedSearch || customerId
                  ? "No matching jobs"
                  : "No jobs yet"
              }
              description={
                debouncedSearch || customerId
                  ? "Try a different search or clear filters."
                  : "Add your first job site to start tracking time."
              }
              actionLabel={
                !debouncedSearch && !customerId && canCreate
                  ? "Add job"
                  : undefined
              }
              onAction={
                !debouncedSearch && !customerId && canCreate
                  ? openCreate
                  : undefined
              }
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
          renderItem={({ item }) => {
            const name = jobName(item) || `Job #${jobId(item) ?? ""}`;
            return (
              <Card
                style={styles.card}
                accessibilityLabel={`Job ${name}`}
                onPress={canEdit ? () => openEdit(item) : undefined}
              >
                <View style={styles.row}>
                  <View style={styles.textCol}>
                    <Text style={[styles.name, { color: c.text }]} numberOfLines={1}>
                      {name}
                    </Text>
                    <Text style={[styles.meta, { color: c.muted }]} numberOfLines={1}>
                      {item.customer?.name || "No customer"}
                      {item.site_contact_name
                        ? ` · ${item.site_contact_name}`
                        : ""}
                    </Text>
                  </View>
                  {canEdit ? <ChevronIcon color={c.subtle} /> : null}
                </View>
              </Card>
            );
          }}
        />
      )}

      <AppBottomSheet
        ref={sheetRef}
        title={isEdit ? "Edit job" : "Create job"}
        snapPoints={["75%", "92%"]}
        onDismiss={() => {
          setEditing(null);
          form.reset(emptyJob);
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
        <Controller
          control={form.control}
          name="customer_id"
          render={({ field: { onChange, onBlur, value }, fieldState }) => (
            <>
              <MobileSelect
                label="Customer"
                value={value}
                options={customerOptions}
                onChange={(id) => {
                  onChange(id);
                  onBlur();
                }}
                placeholder="Select customer"
                disabled={pending}
              />
              <FormFieldError message={fieldState.error?.message} />
            </>
          )}
        />
        <Controller
          control={form.control}
          name="formatted_address"
          render={({ fieldState }) => (
            <>
              <PlacesAddressInput
                value={address}
                onChange={handleAddressChange}
                label="Site address"
                requireCoordinates
                showMap
                inBottomSheet
              />
              <FormFieldError message={fieldState.error?.message} />
            </>
          )}
        />
        <FormTextField
          control={form.control}
          name="radius"
          label="Geofence radius (m)"
          inputType="bottomSheet"
          keyboardType="number-pad"
          editable={!pending}
          {...fieldChainProps(chain, "radius")}
        />
        <FormTextField
          control={form.control}
          name="site_contact_name"
          label="Site contact name"
          inputType="bottomSheet"
          autoCapitalize="words"
          editable={!pending}
          {...fieldChainProps(chain, "site_contact_name")}
        />
        <FormTextField
          control={form.control}
          name="site_contact_email"
          label="Site contact email"
          inputType="bottomSheet"
          autoCapitalize="none"
          keyboardType="email-address"
          editable={!pending}
          {...fieldChainProps(chain, "site_contact_email")}
        />
        <Controller
          control={form.control}
          name="site_contact_phone_number"
          render={({ field: { onChange }, fieldState }) => (
            <GlobalPhoneInput
              label="Site contact phone"
              value={{
                phone_number: phoneNumber || null,
                phone_country_code: phoneCode || null,
                phone_country_iso: phoneIso || null,
              }}
              onChange={(phone) => {
                onChange(phone.phone_number || "");
                setValue(
                  "site_contact_phone_country_code",
                  phone.phone_country_code,
                  { shouldValidate: true },
                );
                setValue(
                  "site_contact_phone_country_iso",
                  phone.phone_country_iso,
                  { shouldValidate: true },
                );
              }}
              error={fieldState.error?.message}
              inBottomSheet
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
