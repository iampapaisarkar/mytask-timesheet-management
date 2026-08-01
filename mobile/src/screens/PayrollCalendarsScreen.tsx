import { useCallback, useMemo, useRef, useState } from "react";
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
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { payrollCalendarsApi, systemApi } from "@mytask/api";
import { DEFAULT_LIST_PAGE_SIZE } from "@mytask/constants";
import { can, getOrganisationAcl } from "@mytask/services";
import { spacing } from "@mytask/theme";
import { getErrorMessage, listPagination, listRows } from "@mytask/utils";
import { ListPager } from "../components/ListPager";
import type { RootStackParamList } from "../navigation/RootNavigator";
import { useOrganisationStore } from "../store/organisationStore";
import { useThemeStore } from "../store/themeStore";
import { useToastStore } from "../store/toastStore";
import { AppBottomSheet, BottomSheetTextInput } from "../ui";

type Props = NativeStackScreenProps<RootStackParamList, "PayrollCalendars">;

type PayCycle = { id: number; name: string; code: string };

type PayrollCalendarRow = {
  id?: number | string;
  name?: string;
  start_date?: string | null;
  first_payment_date?: string | null;
  pay_cycle?: PayCycle | null;
  default?: boolean;
};

export function PayrollCalendarsScreen({}: Props) {
  const [page, setPage] = useState(1);
  const [name, setName] = useState("");
  const [payCycleId, setPayCycleId] = useState("");
  const [startDate, setStartDate] = useState("");
  const [firstPaymentDate, setFirstPaymentDate] = useState("");
  const [cyclePickerOpen, setCyclePickerOpen] = useState(false);
  const sheetRef = useRef<BottomSheetModal>(null);
  const c = useThemeStore((s) => s.colors);
  const toast = useToastStore();
  const qc = useQueryClient();
  const organisation = useOrganisationStore((s) => s.organisation);
  const role = organisation?.role || organisation?.role_code;
  const acl = getOrganisationAcl(role);
  const canCreate = can(acl, "payrollCalendar", "create");

  const { data, isLoading, isError, isFetching, refetch } = useQuery({
    queryKey: ["payroll-calendars", page] as const,
    queryFn: async ({ signal }) => {
      const res = await payrollCalendarsApi.list(
        {
          rows_per_page: DEFAULT_LIST_PAGE_SIZE,
          page_number: page,
          sort_by: "id",
        },
        { signal },
      );
      const body = res.data as {
        data?: PayrollCalendarRow[];
        pagination?: {
          total_pages?: number;
          page_number?: number;
          total_rows?: number;
        };
        info?: {
          pagination?: {
            total_pages?: number;
            page_number?: number;
            total_rows?: number;
          };
        };
      };
      return {
        data: Array.isArray(body.data) ? body.data : [],
        pagination: body.pagination || body.info?.pagination || null,
      };
    },
  });

  const payCyclesQuery = useQuery({
    queryKey: ["system", "pay-cycles"] as const,
    queryFn: async ({ signal }) => {
      const res = await systemApi.get("pay-cycles", undefined, { signal });
      const raw = res.data.data;
      return (Array.isArray(raw) ? raw : []) as PayCycle[];
    },
    enabled: canCreate,
  });

  const createMutation = useMutation({
    mutationFn: async (payload: Record<string, unknown>) => {
      await payrollCalendarsApi.create(payload);
    },
    onSuccess: async () => {
      toast.success("Payroll calendar created");
      sheetRef.current?.dismiss();
      await qc.invalidateQueries({ queryKey: ["payroll-calendars"] });
    },
    onError: (err) => {
      toast.error("Create failed", getErrorMessage(err));
    },
  });

  const rows = listRows<PayrollCalendarRow>(data);
  const pagination = listPagination(data);
  const totalPages = Math.max(1, Number(pagination?.total_pages) || 1);
  const currentPage = Number(pagination?.page_number) || page;
  const payCycles = payCyclesQuery.data || [];
  const selectedPayCycle = useMemo(
    () => payCycles.find((cycle) => String(cycle.id) === payCycleId) || null,
    [payCycles, payCycleId],
  );

  const openCreate = useCallback(() => {
    setName("");
    setPayCycleId("");
    setStartDate("");
    setFirstPaymentDate("");
    sheetRef.current?.present();
  }, []);

  function handleSave() {
    if (!name.trim() || !selectedPayCycle || !startDate.trim() || !firstPaymentDate.trim()) {
      toast.warning("Name, pay cycle, start date, and first payment date are required");
      return;
    }
    if (
      !/^\d{4}-\d{2}-\d{2}$/.test(startDate.trim()) ||
      !/^\d{4}-\d{2}-\d{2}$/.test(firstPaymentDate.trim())
    ) {
      toast.warning("Dates must be YYYY-MM-DD");
      return;
    }
    createMutation.mutate({
      name: name.trim(),
      pay_cycle: {
        id: selectedPayCycle.id,
        name: selectedPayCycle.name,
        code: selectedPayCycle.code,
      },
      start_date: startDate.trim(),
      first_payment_date: firstPaymentDate.trim(),
      default: rows.length === 0,
    });
  }

  if (isError && !data) {
    return (
      <View style={[styles.center, { backgroundColor: c.bg }]}>
        <Text style={{ color: c.text }}>Failed to load payroll calendars</Text>
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
      {canCreate ? (
        <TouchableOpacity
          style={[styles.createBtn, { backgroundColor: c.primary }]}
          onPress={openCreate}
        >
          <Text style={styles.createBtnText}>Create calendar</Text>
        </TouchableOpacity>
      ) : null}
      {isLoading && !data ? (
        <View style={styles.center}>
          <ActivityIndicator color={c.primary} />
        </View>
      ) : (
        <FlatList
          contentContainerStyle={{
            padding: spacing.md,
            paddingTop: canCreate ? 0 : spacing.md,
          }}
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
              No payroll calendars found
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
                {item.name || `Calendar #${item.id}`}
                {item.default ? " · Default" : ""}
              </Text>
              <Text style={{ color: c.muted }}>
                {item.pay_cycle?.name || "—"}
                {item.start_date
                  ? ` · ${String(item.start_date).slice(0, 10)}`
                  : ""}
              </Text>
              {item.first_payment_date ? (
                <Text style={{ color: c.muted, marginTop: 4, fontSize: 12 }}>
                  First payment {String(item.first_payment_date).slice(0, 10)}
                </Text>
              ) : null}
            </View>
          )}
        />
      )}

      <AppBottomSheet
        ref={sheetRef}
        title="Create payroll calendar"
        snapPoints={["60%", "92%"]}
        footer={
          <TouchableOpacity
            style={[
              styles.submitBtn,
              { backgroundColor: c.primary, opacity: pending ? 0.6 : 1 },
            ]}
            disabled={pending}
            onPress={handleSave}
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
          value={name}
          onChangeText={setName}
          placeholderTextColor={c.muted}
          autoCapitalize="words"
        />
        <Text style={[styles.fieldLabel, { color: c.muted }]}>Pay cycle *</Text>
        <TouchableOpacity
          style={[
            styles.pickerBtn,
            { borderColor: c.border, backgroundColor: c.bg },
          ]}
          onPress={() => setCyclePickerOpen(true)}
        >
          <Text style={{ color: selectedPayCycle ? c.text : c.muted }}>
            {selectedPayCycle?.name || "Select pay cycle"}
          </Text>
        </TouchableOpacity>
        <Text style={[styles.fieldLabel, { color: c.muted }]}>
          Start date (YYYY-MM-DD) *
        </Text>
        <BottomSheetTextInput
          style={inputStyle}
          value={startDate}
          onChangeText={setStartDate}
          placeholder="2026-01-01"
          placeholderTextColor={c.muted}
          autoCapitalize="none"
        />
        <Text style={[styles.fieldLabel, { color: c.muted }]}>
          First payment date (YYYY-MM-DD) *
        </Text>
        <BottomSheetTextInput
          style={inputStyle}
          value={firstPaymentDate}
          onChangeText={setFirstPaymentDate}
          placeholder="2026-01-15"
          placeholderTextColor={c.muted}
          autoCapitalize="none"
        />
      </AppBottomSheet>

      <Modal
        visible={cyclePickerOpen}
        animationType="slide"
        onRequestClose={() => setCyclePickerOpen(false)}
      >
        <View style={[styles.modal, { backgroundColor: c.bg }]}>
          <Text style={[styles.modalTitle, { color: c.text }]}>
            Select pay cycle
          </Text>
          <ScrollView>
            {payCyclesQuery.isLoading ? (
              <ActivityIndicator color={c.primary} />
            ) : (
              payCycles.map((cycle) => {
                const id = String(cycle.id);
                const selected = payCycleId === id;
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
                      setPayCycleId(id);
                      setCyclePickerOpen(false);
                    }}
                  >
                    <Text style={{ color: c.text }}>{cycle.name}</Text>
                    <Text style={{ color: c.muted, marginTop: 2, fontSize: 12 }}>
                      {cycle.code}
                    </Text>
                  </Pressable>
                );
              })
            )}
          </ScrollView>
          <TouchableOpacity
            style={[styles.doneBtn, { backgroundColor: c.primary }]}
            onPress={() => setCyclePickerOpen(false)}
          >
            <Text style={styles.createBtnText}>Done</Text>
          </TouchableOpacity>
        </View>
      </Modal>
    </View>
  );
}

const styles = StyleSheet.create({
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
