import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import {
  ActivityIndicator,
  FlatList,
  Modal,
  Pressable,
  RefreshControl,
  ScrollView,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
} from "react-native";
import type { BottomSheetModal } from "@gorhom/bottom-sheet";
import type { NativeStackScreenProps } from "@react-navigation/native-stack";
import { useCreateJob, useCustomers, useJobs } from "@mytask/hooks";
import { DEFAULT_LIST_PAGE_SIZE } from "@mytask/constants";
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

type Props = NativeStackScreenProps<RootStackParamList, "JobsList">;

type JobRow = {
  id?: number | string;
  name?: string;
  details?: { id?: number; name?: string };
  customer?: { id?: number; name?: string } | null;
  site_contact_name?: string;
};

type CustomerRow = {
  id?: number | string;
  name?: string;
};

type CreateForm = {
  name: string;
  customerId: string;
  address: string;
  latitude: string;
  longitude: string;
  radius: string;
  siteContactName: string;
  siteContactEmail: string;
  siteContactPhone: string;
};

const emptyForm = (): CreateForm => ({
  name: "",
  customerId: "",
  address: "",
  latitude: "",
  longitude: "",
  radius: "100",
  siteContactName: "",
  siteContactEmail: "",
  siteContactPhone: "",
});

export function JobsListScreen(_props: Props) {
  const [page, setPage] = useState(1);
  const [search, setSearch] = useState("");
  const [customerId, setCustomerId] = useState<string>("");
  const [filterOpen, setFilterOpen] = useState(false);
  const [form, setForm] = useState<CreateForm>(emptyForm);
  const [customerPickerOpen, setCustomerPickerOpen] = useState(false);
  const createSheetRef = useRef<BottomSheetModal>(null);
  const debouncedSearch = useDebouncedValue(search.trim(), 400);
  const organisation = useOrganisationStore((s) => s.organisation);
  const role = organisation?.role || organisation?.role_code;
  const acl = getOrganisationAcl(role);
  const canCreate = can(acl, "job", "create");
  const c = useThemeStore((s) => s.colors);
  const toast = useToastStore();
  const createMutation = useCreateJob();

  useEffect(() => {
    setPage(1);
  }, [debouncedSearch, customerId]);

  const customersQuery = useCustomers({ rows_per_page: 200, sort_by: "name" });
  const customers = listRows<CustomerRow>(customersQuery.data);
  const selectedCustomer = useMemo(
    () => customers.find((x) => String(x.id) === customerId),
    [customers, customerId],
  );
  const formCustomer = useMemo(
    () => customers.find((x) => String(x.id) === form.customerId),
    [customers, form.customerId],
  );

  const { data, isLoading, isError, isFetching, refetch } = useJobs({
    rows_per_page: DEFAULT_LIST_PAGE_SIZE,
    page_number: page,
    sort_by: "id",
    ...(debouncedSearch ? { search: debouncedSearch } : {}),
    ...(customerId ? { customer_id: customerId } : {}),
  });
  const rows = listRows<JobRow>(data);
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
    if (!form.customerId) {
      toast.warning("Customer required");
      return;
    }
    const addressLine = form.address.trim();
    if (!addressLine) {
      toast.warning("Address required");
      return;
    }
    const lat = Number(form.latitude);
    const lng = Number(form.longitude);
    if (!form.latitude.trim() || Number.isNaN(lat)) {
      toast.warning("Latitude required");
      return;
    }
    if (!form.longitude.trim() || Number.isNaN(lng)) {
      toast.warning("Longitude required");
      return;
    }
    if (!form.radius.trim()) {
      toast.warning("Radius required");
      return;
    }
    const phone = phoneValueFromE164(form.siteContactPhone.trim() || null);
    const payload: Record<string, unknown> = {
      name: form.name.trim(),
      customer: { id: Number(form.customerId) },
      address: {
        address_1: addressLine,
        address_line_1: addressLine,
        formatted_address: addressLine,
        street: addressLine,
        latitude: lat,
        longitude: lng,
      },
      radius: Number(form.radius),
      site_contact_name: form.siteContactName.trim() || null,
      site_contact_email: form.siteContactEmail.trim() || null,
      site_contact_phone_number: phone.phone_number,
      site_contact_phone_country_code: phone.phone_country_code,
      site_contact_phone_country_iso: phone.phone_country_iso,
    };
    try {
      await createMutation.mutateAsync(payload);
      toast.success("Job created");
      createSheetRef.current?.dismiss();
      setForm(emptyForm());
    } catch (err) {
      toast.error("Create failed", getErrorMessage(err));
    }
  }

  if (isError && !data) {
    return (
      <View style={[styles.center, { backgroundColor: c.bg }]}>
        <Text style={{ color: c.text }}>Failed to load jobs</Text>
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
          placeholder="Search by job name"
        />
        <View style={styles.filterRow}>
          <TouchableOpacity
            style={[
              styles.filterBtn,
              { borderColor: c.border, backgroundColor: c.surface },
            ]}
            onPress={() => setFilterOpen(true)}
          >
            <Text style={{ color: c.text, fontWeight: "600" }} numberOfLines={1}>
              {selectedCustomer?.name
                ? `Customer: ${selectedCustomer.name}`
                : "Filter by customer"}
            </Text>
          </TouchableOpacity>
          {customerId ? (
            <TouchableOpacity
              onPress={() => setCustomerId("")}
              style={styles.clearBtn}
            >
              <Text style={{ color: c.primary, fontWeight: "700" }}>Clear</Text>
            </TouchableOpacity>
          ) : null}
        </View>
      </View>
      {canCreate ? (
        <TouchableOpacity
          style={[styles.createBtn, { backgroundColor: c.primary }]}
          onPress={openCreate}
        >
          <Text style={styles.createBtnText}>Create job</Text>
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
          keyExtractor={(item, index) =>
            String(item.details?.id ?? item.id ?? index)
          }
          refreshControl={
            <RefreshControl
              refreshing={isFetching && !isLoading}
              onRefresh={() => void refetch()}
              tintColor={c.primary}
            />
          }
          ListEmptyComponent={
            <Text style={[styles.empty, { color: c.muted }]}>
              {debouncedSearch || customerId
                ? "No jobs match your filters"
                : "No jobs"}
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
          renderItem={({ item }) => {
            const name = item.details?.name || item.name || `Job #${item.id}`;
            return (
              <View
                style={[
                  styles.card,
                  { backgroundColor: c.surface, borderColor: c.border },
                ]}
              >
                <Text style={[styles.name, { color: c.text }]}>{name}</Text>
                <Text style={{ color: c.muted }}>
                  {item.customer?.name || "No customer"}
                  {item.site_contact_name
                    ? ` · ${item.site_contact_name}`
                    : ""}
                </Text>
              </View>
            );
          }}
        />
      )}

      <AppBottomSheet
        ref={createSheetRef}
        title="Create job"
        snapPoints={["75%", "92%"]}
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
        <Text style={[styles.fieldLabel, { color: c.muted }]}>Customer *</Text>
        <TouchableOpacity
          style={[
            styles.pickerBtn,
            { borderColor: c.border, backgroundColor: c.bg },
          ]}
          onPress={() => setCustomerPickerOpen(true)}
        >
          <Text style={{ color: formCustomer ? c.text : c.muted }}>
            {formCustomer?.name || "Select customer"}
          </Text>
        </TouchableOpacity>
        <Text style={[styles.fieldLabel, { color: c.muted }]}>
          Site address *
        </Text>
        <BottomSheetTextInput
          style={inputStyle}
          value={form.address}
          onChangeText={(address) => patchForm({ address })}
          placeholderTextColor={c.muted}
        />
        <Text style={[styles.fieldLabel, { color: c.muted }]}>
          Latitude *
        </Text>
        <BottomSheetTextInput
          style={inputStyle}
          value={form.latitude}
          onChangeText={(latitude) => patchForm({ latitude })}
          placeholder="-33.8688"
          placeholderTextColor={c.muted}
          keyboardType="decimal-pad"
        />
        <Text style={[styles.fieldLabel, { color: c.muted }]}>
          Longitude *
        </Text>
        <BottomSheetTextInput
          style={inputStyle}
          value={form.longitude}
          onChangeText={(longitude) => patchForm({ longitude })}
          placeholder="151.2093"
          placeholderTextColor={c.muted}
          keyboardType="decimal-pad"
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
        <Text style={[styles.fieldLabel, { color: c.muted }]}>
          Site contact phone (E.164)
        </Text>
        <BottomSheetTextInput
          style={inputStyle}
          value={form.siteContactPhone}
          onChangeText={(siteContactPhone) => patchForm({ siteContactPhone })}
          placeholder="+61412345678"
          placeholderTextColor={c.muted}
          keyboardType="phone-pad"
        />
      </AppBottomSheet>

      <Modal
        visible={customerPickerOpen}
        animationType="slide"
        onRequestClose={() => setCustomerPickerOpen(false)}
      >
        <View style={[styles.modal, { backgroundColor: c.bg }]}>
          <Text style={[styles.modalTitle, { color: c.text }]}>
            Select customer
          </Text>
          <ScrollView>
            {customers.map((cust) => {
              const id = String(cust.id);
              const selected = form.customerId === id;
              return (
                <Pressable
                  key={id}
                  style={[
                    styles.option,
                    {
                      borderColor: selected ? c.primary : c.border,
                      backgroundColor: c.surface,
                    },
                  ]}
                  onPress={() => {
                    patchForm({ customerId: id });
                    setCustomerPickerOpen(false);
                  }}
                >
                  <Text style={{ color: c.text }}>
                    {cust.name || `Customer #${cust.id}`}
                  </Text>
                </Pressable>
              );
            })}
          </ScrollView>
          <TouchableOpacity
            style={[styles.doneBtn, { backgroundColor: c.primary }]}
            onPress={() => setCustomerPickerOpen(false)}
          >
            <Text style={styles.createBtnText}>Done</Text>
          </TouchableOpacity>
        </View>
      </Modal>

      <Modal
        visible={filterOpen}
        animationType="slide"
        onRequestClose={() => setFilterOpen(false)}
      >
        <View style={[styles.modal, { backgroundColor: c.bg }]}>
          <Text style={[styles.modalTitle, { color: c.text }]}>
            Filter by customer
          </Text>
          <ScrollView>
            <Pressable
              style={[
                styles.option,
                {
                  borderColor: !customerId ? c.primary : c.border,
                  backgroundColor: c.surface,
                },
              ]}
              onPress={() => {
                setCustomerId("");
                setFilterOpen(false);
              }}
            >
              <Text style={{ color: c.text, fontWeight: "600" }}>
                All customers
              </Text>
            </Pressable>
            {customers.map((cust) => {
              const id = String(cust.id);
              const selected = customerId === id;
              return (
                <Pressable
                  key={id}
                  style={[
                    styles.option,
                    {
                      borderColor: selected ? c.primary : c.border,
                      backgroundColor: c.surface,
                    },
                  ]}
                  onPress={() => {
                    setCustomerId(id);
                    setFilterOpen(false);
                  }}
                >
                  <Text style={{ color: c.text }}>
                    {cust.name || `Customer #${cust.id}`}
                  </Text>
                </Pressable>
              );
            })}
          </ScrollView>
          <TouchableOpacity
            style={[styles.doneBtn, { backgroundColor: c.primary }]}
            onPress={() => setFilterOpen(false)}
          >
            <Text style={styles.createBtnText}>Done</Text>
          </TouchableOpacity>
        </View>
      </Modal>
    </View>
  );
}

const styles = StyleSheet.create({
  header: { paddingHorizontal: spacing.md, paddingTop: spacing.md },
  filterRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: spacing.sm,
    marginBottom: spacing.sm,
  },
  filterBtn: {
    flex: 1,
    borderWidth: 1,
    borderRadius: 14,
    paddingHorizontal: spacing.md,
    paddingVertical: 12,
  },
  clearBtn: { paddingHorizontal: 8, paddingVertical: 8 },
  center: { flex: 1, alignItems: "center", justifyContent: "center" },
  card: {
    borderRadius: 16,
    padding: spacing.md,
    marginBottom: spacing.sm,
    borderWidth: 1,
  },
  name: { fontWeight: "700", marginBottom: 4 },
  empty: { textAlign: "center", marginTop: 40 },
  link: { fontWeight: "700", marginTop: 8 },
  createBtn: {
    marginHorizontal: spacing.md,
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
  pickerBtn: {
    borderWidth: 1,
    borderRadius: 12,
    paddingHorizontal: 14,
    paddingVertical: 12,
    marginBottom: 4,
  },
  submitBtn: {
    borderRadius: 12,
    paddingVertical: 14,
    alignItems: "center",
  },
  modal: { flex: 1, padding: spacing.lg, paddingTop: 56 },
  modalTitle: { fontSize: 20, fontWeight: "700", marginBottom: spacing.md },
  option: {
    borderWidth: 1,
    borderRadius: 12,
    padding: spacing.md,
    marginBottom: spacing.sm,
  },
  doneBtn: {
    marginTop: spacing.md,
    borderRadius: 14,
    paddingVertical: 14,
    alignItems: "center",
  },
});
