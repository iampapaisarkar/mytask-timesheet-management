import { useCallback, useMemo, useRef, useState } from "react";
import { FlatList, RefreshControl, StyleSheet, Text, View } from "react-native";
import type { BottomSheetModal } from "@gorhom/bottom-sheet";
import type { NativeStackScreenProps } from "@react-navigation/native-stack";
import { Controller } from "react-hook-form";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { payrollCalendarsApi, systemApi } from "@mytask/api";
import { DEFAULT_LIST_PAGE_SIZE } from "@mytask/constants";
import { can, getOrganisationAcl } from "@mytask/services";
import { spacing, typography } from "@mytask/theme";
import {
  payrollCalendarSchema,
  type PayrollCalendarFormValues,
} from "@mytask/validation";
import { getErrorMessage, listPagination, listRows } from "@mytask/utils";
import { AccessDenied } from "../components/AccessDenied";
import { FormFieldError, FormTextField } from "../components/FormTextField";
import { ListPager } from "../components/ListPager";
import { MobileSelect } from "../components/MobileSelect";
import { SkeletonList } from "../components/Skeleton";
import {
  fieldChainProps,
  useAppForm,
  useFormFieldChain,
  useValidatedSubmit,
} from "../hooks/useAppForm";
import type { OrgStackParamList } from "../navigation/types";
import { useOrganisationStore } from "../store/organisationStore";
import { useThemeStore } from "../store/themeStore";
import { useToastStore } from "../store/toastStore";
import { triggerHaptic } from "../utils/haptics";
import {
  AppBottomSheet,
  Button,
  Card,
  EmptyState,
  ErrorState,
  SheetsIcon,
} from "../ui";

type Props = NativeStackScreenProps<OrgStackParamList, "PayrollCalendars">;

type PayCycle = { id: number; name: string; code: string };

type PayrollCalendarRow = {
  id?: number | string;
  name?: string;
  start_date?: string | null;
  first_payment_date?: string | null;
  pay_cycle?: PayCycle | null;
  default?: boolean;
};

const emptyPayrollCalendar: PayrollCalendarFormValues = {
  name: "",
  pay_cycle_id: "",
  start_date: "",
  first_payment_date: "",
};

export function PayrollCalendarsScreen({}: Props) {
  const [page, setPage] = useState(1);
  const sheetRef = useRef<BottomSheetModal>(null);
  const c = useThemeStore((s) => s.colors);
  const toast = useToastStore();
  const qc = useQueryClient();
  const organisation = useOrganisationStore((s) => s.organisation);
  const role = organisation?.role || organisation?.role_code;
  const acl = getOrganisationAcl(role);
  const canList = can(acl, "payrollCalendar", "list");
  const canCreate = can(acl, "payrollCalendar", "create");

  const form = useAppForm<PayrollCalendarFormValues>({
    schema: payrollCalendarSchema,
    defaultValues: emptyPayrollCalendar,
  });
  const chain = useFormFieldChain(form, [
    "name",
    "start_date",
    "first_payment_date",
  ]);

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
    form.reset(emptyPayrollCalendar);
    sheetRef.current?.present();
  }, [form]);

  const handleSave = useValidatedSubmit(form, async (values) => {
    const selectedPayCycle =
      payCycles.find((cycle) => String(cycle.id) === values.pay_cycle_id) ||
      null;
    if (!selectedPayCycle) return;
    await createMutation.mutateAsync({
      name: values.name.trim(),
      pay_cycle: {
        id: selectedPayCycle.id,
        name: selectedPayCycle.name,
        code: selectedPayCycle.code,
      },
      start_date: values.start_date.trim(),
      first_payment_date: values.first_payment_date.trim(),
      default: rows.length === 0,
    });
  });

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

  return (
    <View style={{ flex: 1, backgroundColor: c.bg }}>
      <View style={styles.header}>
        <Text style={[styles.pageSub, { color: c.muted }]}>
          Pay cycles and payment schedules
        </Text>
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
        onDismiss={() => form.reset(emptyPayrollCalendar)}
        footer={
          <Button
            title={pending ? "Creating…" : "Create"}
            onPress={handleSave}
            loading={pending}
            disabled={pending}
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
          name="pay_cycle_id"
          render={({ field: { onChange, onBlur, value }, fieldState }) => (
            <>
              <MobileSelect
                label="Pay cycle"
                value={value}
                options={payCycleOptions}
                onChange={(id) => {
                  onChange(id);
                  onBlur();
                }}
                placeholder="Select pay cycle"
                emptyText={
                  payCyclesQuery.isLoading ? "Loading…" : "No pay cycles"
                }
                disabled={pending}
              />
              <FormFieldError message={fieldState.error?.message} />
            </>
          )}
        />
        <FormTextField
          control={form.control}
          name="start_date"
          label="Start date (YYYY-MM-DD)"
          inputType="bottomSheet"
          placeholder="2026-01-01"
          autoCapitalize="none"
          editable={!pending}
          {...fieldChainProps(chain, "start_date")}
        />
        <FormTextField
          control={form.control}
          name="first_payment_date"
          label="First payment date (YYYY-MM-DD)"
          inputType="bottomSheet"
          placeholder="2026-01-15"
          autoCapitalize="none"
          editable={!pending}
          {...fieldChainProps(chain, "first_payment_date")}
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
});
