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
import { useCreateCustomer, useCustomers } from "@mytask/hooks";
import { DEFAULT_CURRENCY, DEFAULT_LIST_PAGE_SIZE } from "@mytask/constants";
import { can, getOrganisationAcl } from "@mytask/services";
import { spacing } from "@mytask/theme";
import {
  getErrorMessage,
  listPagination,
  listRows,
  phoneValueFromE164,
} from "@mytask/utils";
import { ListPager } from "../components/ListPager";
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
  contact_email?: string;
  contact_phone_number?: string;
  abn?: string;
};

type CreateForm = {
  name: string;
  abn: string;
  address: string;
  contactName: string;
  contactEmail: string;
  contactPhone: string;
  hourlyRate: string;
};

const emptyForm = (): CreateForm => ({
  name: "",
  abn: "",
  address: "",
  contactName: "",
  contactEmail: "",
  contactPhone: "",
  hourlyRate: "",
});

export function CustomersListScreen(_props: Props) {
  const [page, setPage] = useState(1);
  const [search, setSearch] = useState("");
  const [form, setForm] = useState<CreateForm>(emptyForm);
  const createSheetRef = useRef<BottomSheetModal>(null);
  const debouncedSearch = useDebouncedValue(search.trim(), 400);
  const organisation = useOrganisationStore((s) => s.organisation);
  const role = organisation?.role || organisation?.role_code;
  const acl = getOrganisationAcl(role);
  const canCreate = can(acl, "customer", "create");
  const c = useThemeStore((s) => s.colors);
  const toast = useToastStore();
  const createMutation = useCreateCustomer();

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
    setForm(emptyForm());
    createSheetRef.current?.present();
  }

  async function handleCreate() {
    if (!form.name.trim()) {
      toast.warning("Name required");
      return;
    }
    const addressLine = form.address.trim();
    const phone = phoneValueFromE164(form.contactPhone.trim() || null);
    const payload: Record<string, unknown> = {
      name: form.name.trim(),
      abn: form.abn.trim() || null,
      address: addressLine || null,
      address_1: addressLine || null,
      address_line_1: addressLine || null,
      formatted_address: addressLine || null,
      contact_name: form.contactName.trim() || null,
      contact_email: form.contactEmail.trim() || null,
      contact_phone_number: phone.phone_number,
      contact_phone_country_code: phone.phone_country_code,
      contact_phone_country_iso: phone.phone_country_iso,
      hourly_rate: form.hourlyRate.trim() ? Number(form.hourlyRate) : null,
      currency: DEFAULT_CURRENCY,
    };
    try {
      await createMutation.mutateAsync(payload);
      toast.success("Customer created");
      createSheetRef.current?.dismiss();
      setForm(emptyForm());
    } catch (err) {
      toast.error("Create failed", getErrorMessage(err));
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

  const pending = createMutation.isPending;
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
            <View
              style={[
                styles.card,
                { backgroundColor: c.surface, borderColor: c.border },
              ]}
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
            </View>
          )}
        />
      )}

      <AppBottomSheet
        ref={createSheetRef}
        title="Create customer"
        snapPoints={["70%", "92%"]}
        footer={
          <TouchableOpacity
            style={[
              styles.submitBtn,
              { backgroundColor: c.primary, opacity: pending ? 0.6 : 1 },
            ]}
            disabled={pending}
            onPress={() => void handleCreate()}
          >
            <Text style={styles.createBtnText}>
              {pending ? "Creating…" : "Create"}
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
        <Text style={[styles.fieldLabel, { color: c.muted }]}>Address</Text>
        <BottomSheetTextInput
          style={inputStyle}
          value={form.address}
          onChangeText={(address) => patchForm({ address })}
          placeholderTextColor={c.muted}
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
