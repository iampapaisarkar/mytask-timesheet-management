import { useCallback, useEffect, useRef, useState } from "react";
import {
  ActivityIndicator,
  FlatList,
  RefreshControl,
  StyleSheet,
  Text,
  TouchableOpacity,
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
} from "@mytask/utils";
import { ListPager } from "../components/ListPager";
import { PlacesAddressInput } from "../components/PlacesAddressInput";
import { SearchBar } from "../components/SearchBar";
import { useDebouncedValue } from "../hooks/useDebouncedValue";
import type { RootStackParamList } from "../navigation/RootNavigator";
import { useOrganisationStore } from "../store/organisationStore";
import { useThemeStore } from "../store/themeStore";
import { useToastStore } from "../store/toastStore";
import { AppBottomSheet, BottomSheetTextInput } from "../ui";

type Props = NativeStackScreenProps<RootStackParamList, "CustomersList">;

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
  contactPhone: string;
  hourlyRate: string;
};

const emptyForm = (): CreateForm => ({
  name: "",
  abn: "",
  address: emptyGlobalAddress(),
  contactName: "",
  contactEmail: "",
  contactPhone: "",
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
  const phone = phoneValueFromE164(
    row.contact_phone_number,
    row.contact_phone_country_iso,
  );
  return {
    name: row.name || "",
    abn: row.abn || "",
    address: addressFromCustomer(row),
    contactName: row.contact_name || "",
    contactEmail: row.contact_email || "",
    contactPhone: phone.phone_number || row.contact_phone_number || "",
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

  const { data, isLoading, isError, isFetching, refetch } = useCustomers({
    rows_per_page: DEFAULT_LIST_PAGE_SIZE,
    page_number: page,
    sort_by: "id",
    ...(debouncedSearch ? { search: debouncedSearch } : {}),
  });
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
    const phone = phoneValueFromE164(form.contactPhone.trim() || null);
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

  if (isError && !data) {
    return (
      <View style={[styles.center, { backgroundColor: c.bg }]}>
        <Text style={{ color: c.text }}>Failed to load customers</Text>
        <TouchableOpacity onPress={() => void refetch()}>
          <Text style={[styles.link, { color: c.primary }]}>Try again</Text>
        </TouchableOpacity>
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
        <SearchBar
          value={search}
          onChangeText={setSearch}
          placeholder="Search name or email"
        />
      </View>
      {canCreate ? (
        <TouchableOpacity
          style={[styles.createBtn, { backgroundColor: c.primary }]}
          onPress={openCreate}
        >
          <Text style={styles.createBtnText}>Create customer</Text>
        </TouchableOpacity>
      ) : null}
      {isLoading && !data ? (
        <View style={styles.center}>
          <ActivityIndicator color={c.primary} />
        </View>
      ) : (
        <FlatList
          contentContainerStyle={{ padding: spacing.md, paddingTop: 0 }}
          data={rows}
          keyExtractor={(item, index) => String(item.id ?? index)}
          refreshControl={
            <RefreshControl
              refreshing={isFetching && !isLoading}
              onRefresh={() => void refetch()}
              tintColor={c.primary}
            />
          }
          ListEmptyComponent={
            <Text style={[styles.empty, { color: c.muted }]}>
              {debouncedSearch
                ? "No customers match your search"
                : "No customers"}
            </Text>
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
            <TouchableOpacity
              style={[
                styles.card,
                { backgroundColor: c.surface, borderColor: c.border },
              ]}
              disabled={!canEdit}
              onPress={() => openEdit(item)}
            >
              <Text style={[styles.name, { color: c.text }]}>
                {item.name || `Customer #${item.id}`}
              </Text>
              <Text style={{ color: c.muted }}>
                {item.contact_email || "—"}
              </Text>
              {item.abn ? (
                <Text style={[styles.meta, { color: c.muted }]}>
                  ABN {item.abn}
                </Text>
              ) : null}
              {canEdit ? (
                <Text
                  style={{ color: c.primary, marginTop: 8, fontWeight: "600" }}
                >
                  Edit
                </Text>
              ) : null}
            </TouchableOpacity>
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
          <TouchableOpacity
            style={[
              styles.submitBtn,
              { backgroundColor: c.primary, opacity: pending ? 0.6 : 1 },
            ]}
            disabled={pending}
            onPress={() => void handleSubmit()}
          >
            <Text style={styles.createBtnText}>
              {pending
                ? isEdit
                  ? "Saving…"
                  : "Creating…"
                : isEdit
                  ? "Save"
                  : "Create"}
            </Text>
          </TouchableOpacity>
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
        <Text style={[styles.fieldLabel, { color: c.muted }]}>
          Contact phone (E.164)
        </Text>
        <BottomSheetTextInput
          style={inputStyle}
          value={form.contactPhone}
          onChangeText={(contactPhone) => patchForm({ contactPhone })}
          placeholder="+61412345678"
          placeholderTextColor={c.muted}
          keyboardType="phone-pad"
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
  header: { paddingHorizontal: spacing.md, paddingTop: spacing.md },
  center: { flex: 1, alignItems: "center", justifyContent: "center" },
  card: {
    borderRadius: 16,
    padding: spacing.md,
    marginBottom: spacing.sm,
    borderWidth: 1,
  },
  name: { fontWeight: "700", marginBottom: 4 },
  meta: { marginTop: 4, fontSize: 12 },
  empty: { textAlign: "center", marginTop: 40 },
  link: { fontWeight: "700", marginTop: 8 },
  createBtn: {
    marginHorizontal: spacing.md,
    marginTop: spacing.md,
    marginBottom: spacing.sm,
    borderRadius: 12,
    paddingVertical: 12,
    alignItems: "center",
  },
  createBtnText: { color: "#fff", fontWeight: "700" },
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
  submitBtn: {
    borderRadius: 12,
    paddingVertical: 14,
    alignItems: "center",
  },
});
