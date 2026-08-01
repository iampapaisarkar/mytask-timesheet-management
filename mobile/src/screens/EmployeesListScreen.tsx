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
import {
  useCreateEmployee,
  useEmployeeFormLookups,
  useEmployees,
} from "@mytask/hooks";
import {
  DEFAULT_CURRENCY,
  DEFAULT_LIST_PAGE_SIZE,
} from "@mytask/constants";
import { can, getOrganisationAcl } from "@mytask/services";
import { spacing } from "@mytask/theme";
import type { NamedLookup } from "@mytask/types";
import {
  formatPhoneDisplay,
  getErrorMessage,
  listPagination,
  listRows,
  phoneValueFromE164,
} from "@mytask/utils";
import { ListPager } from "../components/ListPager";
import { SearchBar } from "../components/SearchBar";
import { useDebouncedValue } from "../hooks/useDebouncedValue";
import { useOrganisationStore } from "../store/organisationStore";
import { useThemeStore } from "../store/themeStore";
import { useToastStore } from "../store/toastStore";
import { AppBottomSheet, BottomSheetTextInput } from "../ui";

type EmployeeRow = {
  id?: number | string;
  details?: {
    id?: number;
    full_name?: string;
    email?: string;
    phone_number?: string;
    phone_country_iso?: string;
    role?: { name?: string };
    address?: {
      formatted_address?: string;
      address_1?: string;
      city?: string;
    };
  };
};

type CreateForm = {
  email: string;
  firstName: string;
  lastName: string;
  phone: string;
  dob: string;
  address: string;
  roleId: string;
  startDate: string;
  employmentTypeId: string;
  payrollCalendarId: string;
  hourlyRate: string;
};

function todayIso() {
  return new Date().toISOString().slice(0, 10);
}

const emptyForm = (): CreateForm => ({
  email: "",
  firstName: "",
  lastName: "",
  phone: "",
  dob: "",
  address: "",
  roleId: "",
  startDate: todayIso(),
  employmentTypeId: "",
  payrollCalendarId: "",
  hourlyRate: "",
});

function addressLabel(details: EmployeeRow["details"]) {
  const a = details?.address;
  if (!a) return null;
  return (
    a.formatted_address ||
    [a.address_1, a.city].filter(Boolean).join(", ") ||
    null
  );
}

export function EmployeesListScreen() {
  const [page, setPage] = useState(1);
  const [search, setSearch] = useState("");
  const [form, setForm] = useState<CreateForm>(emptyForm);
  const [sheetOpen, setSheetOpen] = useState(false);
  const [picker, setPicker] = useState<"role" | "employment" | "calendar" | null>(
    null,
  );
  const createSheetRef = useRef<BottomSheetModal>(null);
  const debouncedSearch = useDebouncedValue(search.trim(), 400);
  const organisation = useOrganisationStore((s) => s.organisation);
  const role = organisation?.role || organisation?.role_code;
  const acl = getOrganisationAcl(role);
  const canCreate = can(acl, "employee", "create");
  const c = useThemeStore((s) => s.colors);
  const toast = useToastStore();
  const createMutation = useCreateEmployee();

  useEffect(() => {
    setPage(1);
  }, [debouncedSearch]);

  const { data, isLoading, isError, isFetching, refetch } = useEmployees({
    rows_per_page: DEFAULT_LIST_PAGE_SIZE,
    page_number: page,
    sort_by: "id",
    ...(debouncedSearch ? { search: debouncedSearch } : {}),
  });
  const rows = listRows<EmployeeRow>(data);
  const pagination = listPagination(data);
  const totalPages = Math.max(1, Number(pagination?.total_pages) || 1);
  const currentPage = Number(pagination?.page_number) || page;

  const lookupsQuery = useEmployeeFormLookups(sheetOpen);
  const lookups = lookupsQuery.data;

  const roles = useMemo(() => {
    const raw = (lookups?.organisation_roles || lookups?.roles ||
      []) as NamedLookup[];
    return raw.filter((r) => String(r.code || "").toLowerCase() !== "owner");
  }, [lookups]);

  const employmentTypes = useMemo(() => {
    const raw = (lookups?.employment_types || []) as NamedLookup[];
    return raw.filter(
      (t) => String(t.code || "").toUpperCase() !== "CONTRACT",
    );
  }, [lookups]);

  const calendars = (lookups?.payroll_calendars || []) as NamedLookup[];

  const selectedRole = roles.find((r) => String(r.id) === form.roleId);
  const selectedEmployment = employmentTypes.find(
    (t) => String(t.id) === form.employmentTypeId,
  );
  const selectedCalendar = calendars.find(
    (cal) => String(cal.id) === form.payrollCalendarId,
  );

  const patchForm = useCallback((partial: Partial<CreateForm>) => {
    setForm((prev) => ({ ...prev, ...partial }));
  }, []);

  function openCreate() {
    setForm(emptyForm());
    setSheetOpen(true);
    createSheetRef.current?.present();
  }

  async function handleCreate() {
    if (!form.email.trim() || !form.email.includes("@")) {
      toast.warning("Enter a valid email");
      return;
    }
    if (!form.firstName.trim()) {
      toast.warning("First name is required");
      return;
    }
    if (!form.lastName.trim()) {
      toast.warning("Last name is required");
      return;
    }
    if (!form.dob.trim()) {
      toast.warning("Date of birth is required (YYYY-MM-DD)");
      return;
    }
    if (!form.phone.trim()) {
      toast.warning("Phone number is required");
      return;
    }
    const phone = phoneValueFromE164(form.phone.trim());
    if (!phone.phone_number) {
      toast.warning("Enter a valid international phone (E.164)");
      return;
    }
    const addressLine = form.address.trim();
    if (!addressLine) {
      toast.warning("Address is required");
      return;
    }
    if (!selectedRole) {
      toast.warning("Role is required");
      return;
    }
    if (!form.startDate.trim()) {
      toast.warning("Start date is required (YYYY-MM-DD)");
      return;
    }
    if (!selectedEmployment) {
      toast.warning("Employment type is required");
      return;
    }
    if (!selectedCalendar) {
      toast.warning("Payroll calendar is required");
      return;
    }
    if (!form.hourlyRate.trim() || Number(form.hourlyRate) <= 0) {
      toast.warning("Hourly rate must be greater than 0");
      return;
    }

    const payload: Record<string, unknown> = {
      action: { create_user: true },
      details: {
        first_name: form.firstName.trim(),
        middle_name: null,
        last_name: form.lastName.trim(),
        email: form.email.trim(),
        preferred_name: null,
        dob: form.dob.trim(),
        phone_number: phone.phone_number,
        phone_country_code: phone.phone_country_code,
        phone_country_iso: phone.phone_country_iso,
        address: {
          address_1: addressLine,
          address_line_1: addressLine,
          formatted_address: addressLine,
        },
        role: {
          id: Number(selectedRole.id),
          code: selectedRole.code,
          name: selectedRole.name,
        },
      },
      wage: {
        start_date: form.startDate.trim(),
        employment_type: {
          id: Number(selectedEmployment.id),
          code: selectedEmployment.code,
        },
        payroll_calendar: { id: Number(selectedCalendar.id) },
        pay_type: "HOURLY",
        currency: DEFAULT_CURRENCY,
        hourly_rate_exc_super: form.hourlyRate.trim(),
        fixed_rate_exc_super: null,
      },
      payroll: {
        payment_method: "CASH",
      },
    };

    try {
      await createMutation.mutateAsync(payload);
      toast.success("Employee created & invitation sent");
      createSheetRef.current?.dismiss();
      setForm(emptyForm());
    } catch (err) {
      toast.error("Create failed", getErrorMessage(err));
    }
  }

  if (isError && !data) {
    return (
      <View style={[styles.center, { backgroundColor: c.bg }]}>
        <Text style={{ color: c.text }}>Failed to load employees</Text>
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

  const pickerOptions: NamedLookup[] =
    picker === "role"
      ? roles
      : picker === "employment"
        ? employmentTypes
        : picker === "calendar"
          ? calendars
          : [];

  return (
    <View style={{ flex: 1, backgroundColor: c.bg }}>
      <View style={styles.header}>
        <SearchBar
          value={search}
          onChangeText={setSearch}
          placeholder="Search name, email, or address"
        />
      </View>
      {canCreate ? (
        <TouchableOpacity
          style={[styles.createBtn, { backgroundColor: c.primary }]}
          onPress={openCreate}
        >
          <Text style={styles.createBtnText}>Create employee</Text>
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
              {debouncedSearch
                ? "No employees match your search"
                : "No employees"}
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
            const details = item.details;
            const address = addressLabel(details);
            return (
              <View
                style={[
                  styles.card,
                  { backgroundColor: c.surface, borderColor: c.border },
                ]}
              >
                <Text style={[styles.name, { color: c.text }]}>
                  {details?.full_name || `Employee #${details?.id ?? item.id}`}
                </Text>
                <Text style={{ color: c.muted }}>
                  {details?.email || "—"}
                  {details?.role?.name ? ` · ${details.role.name}` : ""}
                </Text>
                {details?.phone_number ? (
                  <Text style={[styles.meta, { color: c.muted }]}>
                    {formatPhoneDisplay(
                      details.phone_number,
                      details.phone_country_iso,
                    )}
                  </Text>
                ) : null}
                {address ? (
                  <Text
                    style={[styles.meta, { color: c.muted }]}
                    numberOfLines={2}
                  >
                    {address}
                  </Text>
                ) : null}
              </View>
            );
          }}
        />
      )}

      <AppBottomSheet
        ref={createSheetRef}
        title="Create employee"
        snapPoints={["80%", "92%"]}
        onDismiss={() => {
          setSheetOpen(false);
          setPicker(null);
        }}
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
              {pending ? "Creating…" : "Create & invite"}
            </Text>
          </TouchableOpacity>
        }
      >
        {lookupsQuery.isLoading ? (
          <ActivityIndicator color={c.primary} style={{ marginVertical: 24 }} />
        ) : null}

        <Text style={[styles.fieldLabel, { color: c.muted }]}>Email *</Text>
        <BottomSheetTextInput
          style={inputStyle}
          value={form.email}
          onChangeText={(email) => patchForm({ email })}
          placeholderTextColor={c.muted}
          autoCapitalize="none"
          keyboardType="email-address"
        />
        <Text style={[styles.fieldLabel, { color: c.muted }]}>
          First name *
        </Text>
        <BottomSheetTextInput
          style={inputStyle}
          value={form.firstName}
          onChangeText={(firstName) => patchForm({ firstName })}
          placeholderTextColor={c.muted}
          autoCapitalize="words"
        />
        <Text style={[styles.fieldLabel, { color: c.muted }]}>
          Last name *
        </Text>
        <BottomSheetTextInput
          style={inputStyle}
          value={form.lastName}
          onChangeText={(lastName) => patchForm({ lastName })}
          placeholderTextColor={c.muted}
          autoCapitalize="words"
        />
        <Text style={[styles.fieldLabel, { color: c.muted }]}>
          Phone (E.164) *
        </Text>
        <BottomSheetTextInput
          style={inputStyle}
          value={form.phone}
          onChangeText={(phone) => patchForm({ phone })}
          placeholder="+61412345678"
          placeholderTextColor={c.muted}
          keyboardType="phone-pad"
        />
        <Text style={[styles.fieldLabel, { color: c.muted }]}>
          Date of birth (YYYY-MM-DD) *
        </Text>
        <BottomSheetTextInput
          style={inputStyle}
          value={form.dob}
          onChangeText={(dob) => patchForm({ dob })}
          placeholder="1990-01-15"
          placeholderTextColor={c.muted}
        />
        <Text style={[styles.fieldLabel, { color: c.muted }]}>Address *</Text>
        <BottomSheetTextInput
          style={inputStyle}
          value={form.address}
          onChangeText={(address) => patchForm({ address })}
          placeholderTextColor={c.muted}
        />
        <Text style={[styles.fieldLabel, { color: c.muted }]}>Role *</Text>
        <TouchableOpacity
          style={[
            styles.pickerBtn,
            { borderColor: c.border, backgroundColor: c.bg },
          ]}
          onPress={() => setPicker("role")}
        >
          <Text style={{ color: selectedRole ? c.text : c.muted }}>
            {selectedRole?.name || "Select role"}
          </Text>
        </TouchableOpacity>
        <Text style={[styles.fieldLabel, { color: c.muted }]}>
          Start date (YYYY-MM-DD) *
        </Text>
        <BottomSheetTextInput
          style={inputStyle}
          value={form.startDate}
          onChangeText={(startDate) => patchForm({ startDate })}
          placeholderTextColor={c.muted}
        />
        <Text style={[styles.fieldLabel, { color: c.muted }]}>
          Employment type *
        </Text>
        <TouchableOpacity
          style={[
            styles.pickerBtn,
            { borderColor: c.border, backgroundColor: c.bg },
          ]}
          onPress={() => setPicker("employment")}
        >
          <Text style={{ color: selectedEmployment ? c.text : c.muted }}>
            {selectedEmployment?.name || "Select employment type"}
          </Text>
        </TouchableOpacity>
        <Text style={[styles.fieldLabel, { color: c.muted }]}>
          Payroll calendar *
        </Text>
        <TouchableOpacity
          style={[
            styles.pickerBtn,
            { borderColor: c.border, backgroundColor: c.bg },
          ]}
          onPress={() => setPicker("calendar")}
        >
          <Text style={{ color: selectedCalendar ? c.text : c.muted }}>
            {selectedCalendar?.name || "Select payroll calendar"}
          </Text>
        </TouchableOpacity>
        <Text style={[styles.fieldLabel, { color: c.muted }]}>
          Hourly rate *
        </Text>
        <BottomSheetTextInput
          style={inputStyle}
          value={form.hourlyRate}
          onChangeText={(hourlyRate) => patchForm({ hourlyRate })}
          placeholderTextColor={c.muted}
          keyboardType="decimal-pad"
        />
      </AppBottomSheet>

      <Modal
        visible={picker != null}
        animationType="slide"
        onRequestClose={() => setPicker(null)}
      >
        <View style={[styles.modal, { backgroundColor: c.bg }]}>
          <Text style={[styles.modalTitle, { color: c.text }]}>
            {picker === "role"
              ? "Select role"
              : picker === "employment"
                ? "Select employment type"
                : "Select payroll calendar"}
          </Text>
          <ScrollView>
            {pickerOptions.map((opt) => {
              const id = String(opt.id);
              const selected =
                (picker === "role" && form.roleId === id) ||
                (picker === "employment" && form.employmentTypeId === id) ||
                (picker === "calendar" && form.payrollCalendarId === id);
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
                    if (picker === "role") patchForm({ roleId: id });
                    if (picker === "employment")
                      patchForm({ employmentTypeId: id });
                    if (picker === "calendar")
                      patchForm({ payrollCalendarId: id });
                    setPicker(null);
                  }}
                >
                  <Text style={{ color: c.text }}>{opt.name || `#${id}`}</Text>
                </Pressable>
              );
            })}
          </ScrollView>
          <TouchableOpacity
            style={[styles.doneBtn, { backgroundColor: c.primary }]}
            onPress={() => setPicker(null)}
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
