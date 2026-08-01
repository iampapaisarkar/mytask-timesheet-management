import { useCallback, useMemo, useRef, useState } from "react";
import { FlatList, RefreshControl, StyleSheet, Text, View } from "react-native";
import type { BottomSheetModal } from "@gorhom/bottom-sheet";
import type { NativeStackScreenProps } from "@react-navigation/native-stack";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { payrollCalendarsApi, systemApi } from "@mytask/api";
import { DEFAULT_LIST_PAGE_SIZE } from "@mytask/constants";
import { can, getOrganisationAcl } from "@mytask/services";
import { spacing, typography } from "@mytask/theme";
import { getErrorMessage, listPagination, listRows } from "@mytask/utils";
import { AccessDenied } from "../components/AccessDenied";
import { ListPager } from "../components/ListPager";
import { MobileSelect } from "../components/MobileSelect";
import { SkeletonList } from "../components/Skeleton";
import type { MoreStackParamList } from "../navigation/types";
import { useOrganisationStore } from "../store/organisationStore";
import { useThemeStore } from "../store/themeStore";
import { useToastStore } from "../store/toastStore";
import { triggerHaptic } from "../utils/haptics";
import {
  AppBottomSheet,
  BottomSheetTextInput,
  Button,
  Card,
  EmptyState,
  ErrorState,
  ScreenHeader,
  SheetsIcon,
} from "../ui";

type Props = NativeStackScreenProps<MoreStackParamList, "PayrollCalendars">;

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
  const sheetRef = useRef<BottomSheetModal>(null);
  const c = useThemeStore((s) => s.colors);
  const toast = useToastStore();
  const qc = useQueryClient();
  const organisation = useOrganisationStore((s) => s.organisation);
  const role = organisation?.role || organisation?.role_code;
  const acl = getOrganisationAcl(role);
  const canList = can(acl, "payrollCalendar", "list");
  const canCreate = can(acl, "payrollCalendar", "create");

  const { data, isLoading, isError, isFetching, refetch } = useQuery({
    queryKey: ["payroll-calendars", page] as const,
    enabled: canList,
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
  const payCycleOptions = useMemo(
    () =>
      payCycles.map((cycle) => ({
        value: String(cycle.id),
        label: cycle.name,
        hint: cycle.code,
      })),
    [payCycles],
  );

  const openCreate = useCallback(() => {
    setName("");
    setPayCycleId("");
    setStartDate("");
    setFirstPaymentDate("");
    sheetRef.current?.present();
  }, []);

  function handleSave() {
    const selectedPayCycle =
      payCycles.find((cycle) => String(cycle.id) === payCycleId) || null;
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

  if (!canList) {
    return <AccessDenied />;
  }

  if (isError && !data) {
    return (
      <View style={[styles.flex, { backgroundColor: c.bg }]}>
        <ErrorState
          title="Failed to load payroll calendars"
          onRetry={() => void refetch()}
        />
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
        <ScreenHeader
          title="Payroll calendars"
          subtitle="Pay cycles and payment schedules"
        />
        {canCreate ? (
          <Button title="Create calendar" onPress={openCreate} size="md" />
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
              icon={<SheetsIcon color={c.primary} size={28} />}
              title="No payroll calendars found"
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
            <Card style={styles.card}>
              <View style={styles.cardTop}>
                <Text style={[styles.name, { color: c.text }]} numberOfLines={1}>
                  {item.name || `Calendar #${item.id}`}
                </Text>
                {item.default ? (
                  <View
                    style={[
                      styles.defaultPill,
                      { backgroundColor: c.primarySoft },
                    ]}
                  >
                    <Text style={[styles.defaultPillText, { color: c.primary }]}>
                      Default
                    </Text>
                  </View>
                ) : null}
              </View>
              <Text style={{ color: c.muted, marginTop: 2 }}>
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
            </Card>
          )}
        />
      )}

      <AppBottomSheet
        ref={sheetRef}
        title="Create payroll calendar"
        snapPoints={["60%", "92%"]}
        footer={
          <Button
            title={pending ? "Creating…" : "Create"}
            onPress={handleSave}
            loading={pending}
          />
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
        <MobileSelect
          label="Pay cycle *"
          value={payCycleId}
          options={payCycleOptions}
          onChange={setPayCycleId}
          placeholder="Select pay cycle"
          emptyText={
            payCyclesQuery.isLoading ? "Loading…" : "No pay cycles"
          }
        />
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
  list: {
    padding: spacing.md,
    paddingTop: spacing.sm,
    paddingBottom: spacing.xxl,
  },
  card: { marginBottom: spacing.sm },
  cardTop: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    gap: spacing.sm,
  },
  name: { flex: 1, fontWeight: "700", fontSize: typography.sizes.md },
  defaultPill: {
    borderRadius: 999,
    paddingHorizontal: 10,
    paddingVertical: 4,
  },
  defaultPillText: { fontSize: 11, fontWeight: "700" },
  fieldLabel: {
    fontWeight: "700",
    fontSize: 12,
    marginBottom: 6,
    marginTop: spacing.sm,
    textTransform: "uppercase",
    letterSpacing: 0.4,
  },
  input: {
    borderWidth: StyleSheet.hairlineWidth,
    borderRadius: 14,
    paddingHorizontal: 14,
    paddingVertical: 12,
    fontSize: 16,
    marginBottom: 4,
  },
});
