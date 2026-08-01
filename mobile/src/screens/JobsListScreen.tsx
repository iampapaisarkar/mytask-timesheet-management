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
  getErrorMessage,
  listPagination,
  listRows,
  phoneValueFromE164,
  emptyGlobalAddress,
  hasAddressContent,
  toAddressApiPayload,
  fromAddressRecord,
  type GlobalAddress,
  type PhoneValue,
} from "@mytask/utils";
import { AccessDenied } from "../components/AccessDenied";
import {
  GlobalPhoneInput,
  emptyPhoneValue,
} from "../components/GlobalPhoneInput";
import { ListPager } from "../components/ListPager";
import { MobileSelect } from "../components/MobileSelect";
import { PlacesAddressInput } from "../components/PlacesAddressInput";
import { SearchBar } from "../components/SearchBar";
import { SkeletonList } from "../components/Skeleton";
import { useDebouncedValue } from "../hooks/useDebouncedValue";
import type { MoreStackParamList } from "../navigation/types";
import { useOrganisationStore } from "../store/organisationStore";
import { useThemeStore } from "../store/themeStore";
import { useToastStore } from "../store/toastStore";
import { triggerHaptic } from "../utils/haptics";
import {
  AppBottomSheet,
  BottomSheetTextInput,
  BriefcaseIcon,
  Button,
  Card,
  ChevronIcon,
  EmptyState,
  ErrorState,
  PlusIcon,
  ScreenHeader,
} from "../ui";

type Props = NativeStackScreenProps<MoreStackParamList, "JobsList">;

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

type CreateForm = {
  name: string;
  customerId: string;
  address: GlobalAddress;
  radius: string;
  siteContactName: string;
  siteContactEmail: string;
  siteContactPhone: PhoneValue;
};

const emptyForm = (): CreateForm => ({
  name: "",
  customerId: "",
  address: emptyGlobalAddress(),
  radius: "100",
  siteContactName: "",
  siteContactEmail: "",
  siteContactPhone: emptyPhoneValue(),
});

function jobId(row: JobRow): number | string | undefined {
  return row.details?.id ?? row.id;
}

function jobName(row: JobRow): string {
  return row.details?.name || row.name || "";
}

function formFromJob(row: JobRow): CreateForm {
  return {
    name: jobName(row),
    customerId:
      row.customer?.id != null
        ? String(row.customer.id)
        : row.customer_id != null
          ? String(row.customer_id)
          : "",
    address: fromAddressRecord(row.address || null),
    radius: row.radius != null ? String(row.radius) : "100",
    siteContactName: row.site_contact_name || "",
    siteContactEmail: row.site_contact_email || "",
    siteContactPhone: phoneValueFromE164(
      row.site_contact_phone_number,
      row.site_contact_phone_country_iso,
    ),
  };
}

export function JobsListScreen(_props: Props) {
  const [page, setPage] = useState(1);
  const [search, setSearch] = useState("");
  const [customerId, setCustomerId] = useState<string>("");
  const [form, setForm] = useState<CreateForm>(emptyForm);
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

  const patchForm = useCallback((partial: Partial<CreateForm>) => {
    setForm((prev) => ({ ...prev, ...partial }));
  }, []);

  function openCreate() {
    setEditing(null);
    setForm(emptyForm());
    sheetRef.current?.present();
  }

  function openEdit(row: JobRow) {
    if (!canEdit || jobId(row) == null) return;
    setEditing(row);
    setForm(formFromJob(row));
    sheetRef.current?.present();
  }

  async function handleSubmit() {
    if (!form.name.trim()) {
      toast.warning("Name required");
      return;
    }
    if (!form.customerId) {
      toast.warning("Customer required");
      return;
    }
    if (!hasAddressContent(form.address)) {
      toast.warning("Address required");
      return;
    }
    if (form.address.latitude == null || form.address.longitude == null) {
      toast.warning("Select an address with coordinates");
      return;
    }
    if (!form.radius.trim()) {
      toast.warning("Radius required");
      return;
    }
    const phone = form.siteContactPhone;
    const payload: Record<string, unknown> = {
      name: form.name.trim(),
      customer: { id: Number(form.customerId) },
      address: toAddressApiPayload(form.address, { includeCoordinates: true }),
      radius: Number(form.radius),
      site_contact_name: form.siteContactName.trim() || null,
      site_contact_email: form.siteContactEmail.trim() || null,
      site_contact_phone_number: phone.phone_number,
      site_contact_phone_country_code: phone.phone_country_code,
      site_contact_phone_country_iso: phone.phone_country_iso,
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
      setForm(emptyForm());
      setEditing(null);
    } catch (err) {
      toast.error(
        isEdit ? "Update failed" : "Create failed",
        getErrorMessage(err),
      );
    }
  }

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
  const inputStyle = [
    styles.input,
    { borderColor: c.border, backgroundColor: c.bg, color: c.text },
  ];

  return (
    <View style={{ flex: 1, backgroundColor: c.bg }}>
      <View style={styles.header}>
        <ScreenHeader title="Jobs" subtitle="Work sites and jobs" />
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
            onPress={() => void handleSubmit()}
          />
        }
      >
        <Text style={[styles.fieldLabel, { color: c.muted }]}>Name *</Text>
        <BottomSheetTextInput
          style={inputStyle}
          value={form.name}
          onChangeText={(name) => patchForm({ name })}
          placeholderTextColor={c.muted}
          autoCapitalize="words"
        />
        <MobileSelect
          label="Customer *"
          value={form.customerId}
          options={customerOptions}
          onChange={(id) => patchForm({ customerId: id })}
          placeholder="Select customer"
        />
        <PlacesAddressInput
          value={form.address}
          onChange={(address) => patchForm({ address })}
          label="Site address *"
          requireCoordinates
          inBottomSheet
        />
        <Text style={[styles.fieldLabel, { color: c.muted }]}>
          Geofence radius (m) *
        </Text>
        <BottomSheetTextInput
          style={inputStyle}
          value={form.radius}
          onChangeText={(radius) => patchForm({ radius })}
          placeholderTextColor={c.muted}
          keyboardType="number-pad"
        />
        <Text style={[styles.fieldLabel, { color: c.muted }]}>
          Site contact name
        </Text>
        <BottomSheetTextInput
          style={inputStyle}
          value={form.siteContactName}
          onChangeText={(siteContactName) => patchForm({ siteContactName })}
          placeholderTextColor={c.muted}
          autoCapitalize="words"
        />
        <Text style={[styles.fieldLabel, { color: c.muted }]}>
          Site contact email
        </Text>
        <BottomSheetTextInput
          style={inputStyle}
          value={form.siteContactEmail}
          onChangeText={(siteContactEmail) => patchForm({ siteContactEmail })}
          placeholderTextColor={c.muted}
          autoCapitalize="none"
          keyboardType="email-address"
        />
        <GlobalPhoneInput
          label="Site contact phone"
          value={form.siteContactPhone}
          onChange={(siteContactPhone) => patchForm({ siteContactPhone })}
          inBottomSheet
        />
      </AppBottomSheet>
    </View>
  );
}

const styles = StyleSheet.create({
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
  fieldLabel: {
    fontWeight: "600",
    fontSize: 13,
    marginBottom: 6,
    marginTop: spacing.sm,
  },
  input: {
    borderWidth: 1,
    borderRadius: 12,
    paddingHorizontal: 14,
    paddingVertical: 12,
    fontSize: 16,
    marginBottom: 4,
  },
});
