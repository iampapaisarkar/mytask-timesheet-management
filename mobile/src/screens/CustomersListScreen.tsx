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
import {
  useCreateCustomer,
  useCustomers,
  useUpdateCustomer,
} from "@mytask/hooks";
import { DEFAULT_CURRENCY, DEFAULT_LIST_PAGE_SIZE } from "@mytask/constants";
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
  BuildingIcon,
  Button,
  Card,
  ChevronIcon,
  EmptyState,
  ErrorState,
  PlusIcon,
  ScreenHeader,
} from "../ui";

type Props = NativeStackScreenProps<MoreStackParamList, "CustomersList">;

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
};

type CreateForm = {
  name: string;
  abn: string;
  address: GlobalAddress;
  contactName: string;
  contactEmail: string;
  contactPhone: PhoneValue;
  hourlyRate: string;
};

const emptyForm = (): CreateForm => ({
  name: "",
  abn: "",
  address: emptyGlobalAddress(),
  contactName: "",
  contactEmail: "",
  contactPhone: emptyPhoneValue(),
  hourlyRate: "",
});

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

function formFromCustomer(row: CustomerRow): CreateForm {
  return {
    name: row.name || "",
    abn: row.abn || "",
    address: addressFromCustomer(row),
    contactName: row.contact_name || "",
    contactEmail: row.contact_email || "",
    contactPhone: phoneValueFromE164(
      row.contact_phone_number,
      row.contact_phone_country_iso,
    ),
    hourlyRate: row.hourly_rate != null ? String(row.hourly_rate) : "",
  };
}

export function CustomersListScreen(_props: Props) {
  const [page, setPage] = useState(1);
  const [search, setSearch] = useState("");
  const [form, setForm] = useState<CreateForm>(emptyForm);
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

  const patchForm = useCallback((partial: Partial<CreateForm>) => {
    setForm((prev) => ({ ...prev, ...partial }));
  }, []);

  function openCreate() {
    setEditing(null);
    setForm(emptyForm());
    sheetRef.current?.present();
  }

  function openEdit(row: CustomerRow) {
    if (!canEdit || row.id == null) return;
    setEditing(row);
    setForm(formFromCustomer(row));
    sheetRef.current?.present();
  }

  async function handleSubmit() {
    if (!form.name.trim()) {
      toast.warning("Name required");
      return;
    }
    const phone = form.contactPhone;
    const addressPayload = hasAddressContent(form.address)
      ? toAddressApiPayload(form.address, { includeCoordinates: false })
      : null;
    const payload: Record<string, unknown> = {
      name: form.name.trim(),
      abn: form.abn.trim() || null,
      ...(addressPayload
        ? { address: addressPayload, ...addressPayload }
        : { address: null }),
      contact_name: form.contactName.trim() || null,
      contact_email: form.contactEmail.trim() || null,
      contact_phone_number: phone.phone_number,
      contact_phone_country_code: phone.phone_country_code,
      contact_phone_country_iso: phone.phone_country_iso,
      hourly_rate: form.hourlyRate.trim() ? Number(form.hourlyRate) : null,
      currency: DEFAULT_CURRENCY,
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
          title="Failed to load customers"
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
        <ScreenHeader title="Customers" subtitle="Client directory" />
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
        <Text style={[styles.fieldLabel, { color: c.muted }]}>
          Business / tax ID
        </Text>
        <BottomSheetTextInput
          style={inputStyle}
          value={form.abn}
          onChangeText={(abn) => patchForm({ abn })}
          placeholderTextColor={c.muted}
        />
        <PlacesAddressInput
          value={form.address}
          onChange={(address) => patchForm({ address })}
          label="Address"
          inBottomSheet
        />
        <Text style={[styles.fieldLabel, { color: c.muted }]}>
          Contact name
        </Text>
        <BottomSheetTextInput
          style={inputStyle}
          value={form.contactName}
          onChangeText={(contactName) => patchForm({ contactName })}
          placeholderTextColor={c.muted}
          autoCapitalize="words"
        />
        <Text style={[styles.fieldLabel, { color: c.muted }]}>
          Contact email
        </Text>
        <BottomSheetTextInput
          style={inputStyle}
          value={form.contactEmail}
          onChangeText={(contactEmail) => patchForm({ contactEmail })}
          placeholderTextColor={c.muted}
          autoCapitalize="none"
          keyboardType="email-address"
        />
        <GlobalPhoneInput
          label="Contact phone"
          value={form.contactPhone}
          onChange={(contactPhone) => patchForm({ contactPhone })}
          inBottomSheet
        />
        <Text style={[styles.fieldLabel, { color: c.muted }]}>
          Hourly rate
        </Text>
        <BottomSheetTextInput
          style={inputStyle}
          value={form.hourlyRate}
          onChangeText={(hourlyRate) => patchForm({ hourlyRate })}
          placeholderTextColor={c.muted}
          keyboardType="decimal-pad"
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
