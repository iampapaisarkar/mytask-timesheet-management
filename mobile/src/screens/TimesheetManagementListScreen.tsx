import { useEffect, useMemo, useRef, useState } from "react";
import {
  ActivityIndicator,
  FlatList,
  RefreshControl,
  StyleSheet,
  Text,
  View,
} from "react-native";
import type { BottomSheetModal } from "@gorhom/bottom-sheet";
import type { NativeStackScreenProps } from "@react-navigation/native-stack";
import {
  useCreateTimesheetManagement,
  useEmployeePayrollCycles,
  useEmployees,
  useJobs,
  useTimesheetManagement,
} from "@mytask/hooks";
import { DEFAULT_LIST_PAGE_SIZE } from "@mytask/constants";
import {
  formatTimesheetLabel,
  getErrorMessage,
  listPagination,
  listRows,
} from "@mytask/utils";
import { can, getOrganisationAcl } from "@mytask/services";
import { spacing, typography } from "@mytask/theme";
import { AccessDenied } from "../components/AccessDenied";
import { ListPager } from "../components/ListPager";
import { MobileSelect } from "../components/MobileSelect";
import { SearchBar } from "../components/SearchBar";
import { SkeletonList } from "../components/Skeleton";
import { useDebouncedValue } from "../hooks/useDebouncedValue";
import type { ManageStackParamList } from "../navigation/types";
import { useOrgNavigate } from "../navigation/useOrgNavigate";
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
  FilterChips,
  ScreenHeader,
  SheetsIcon,
  StatusBadge,
  TIMESHEET_STATUS_FILTER_OPTIONS,
  type TimesheetStatusFilter,
  timesheetStatusCodeParam,
} from "../ui";

type Props = NativeStackScreenProps<
  ManageStackParamList,
  "TimesheetManagementList"
>;

type ManagementRow = {
  id?: number | string;
  period_range?: string;
  code?: string;
  status?: { name?: string; code?: string } | string;
  employee?: { user?: { full_name?: string } };
  job?: { id?: number; name?: string } | null;
  jobs?: Array<{ id?: number; name?: string }> | null;
};

type EmployeeRow = {
  details?: { id?: number; full_name?: string; email?: string };
  id?: number;
};

type Period = {
  start_date: string;
  end_date: string;
  label: string;
};

type JobRow = {
  id?: number;
  name?: string;
  details?: { id?: number; name?: string };
};

function jobNames(item: ManagementRow) {
  if (Array.isArray(item.jobs) && item.jobs.length) {
    return item.jobs.map((j) => j.name).filter(Boolean).join(", ");
  }
  return item.job?.name || "No jobs";
}

export function TimesheetManagementListScreen({ route }: Props) {
  const { orgCode } = route.params;
  const navigateOrg = useOrgNavigate();
  const organisation = useOrganisationStore((s) => s.organisation);
  const role = organisation?.role || organisation?.role_code;
  const acl = getOrganisationAcl(role);
  const canList = can(acl, "timesheetManagement", "list");
  const canCreate = can(acl, "timesheetManagement", "create");

  const sheetRef = useRef<BottomSheetModal>(null);
  const [employeeId, setEmployeeId] = useState("");
  const [periodKey, setPeriodKey] = useState("");
  const [selectedJobIds, setSelectedJobIds] = useState<string[]>([]);
  const [page, setPage] = useState(1);
  const [search, setSearch] = useState("");
  const [filter, setFilter] = useState<TimesheetStatusFilter>("all");
  const debouncedSearch = useDebouncedValue(search.trim(), 400);
  const toast = useToastStore();
  const c = useThemeStore((s) => s.colors);
  const statusCode = timesheetStatusCodeParam(filter);

  useEffect(() => {
    setPage(1);
  }, [debouncedSearch, filter]);

  const { data, isLoading, isError, isFetching, refetch } =
    useTimesheetManagement(
      {
        rows_per_page: DEFAULT_LIST_PAGE_SIZE,
        page_number: page,
        sort_by: "id",
        ...(debouncedSearch ? { search: debouncedSearch } : {}),
        ...(statusCode ? { status_code: statusCode } : {}),
      },
      canList,
    );
  const rows = listRows<ManagementRow>(data);
  const pagination = listPagination(data);
  const totalPages = Math.max(1, Number(pagination?.total_pages) || 1);
  const currentPage = Number(pagination?.page_number) || page;

  const [sheetReady, setSheetReady] = useState(false);
  const employeesQuery = useEmployees({ rows_per_page: 200 }, sheetReady);
  const jobsQuery = useJobs({ rows_per_page: 200 }, sheetReady);
  const cyclesQuery = useEmployeePayrollCycles(
    employeeId ? Number(employeeId) : undefined,
  );
  const createMutation = useCreateTimesheetManagement();

  const employees = listRows<EmployeeRow>(employeesQuery.data);
  const periods = (Array.isArray(cyclesQuery.data)
    ? cyclesQuery.data
    : []) as Period[];
  const jobs = listRows<JobRow>(jobsQuery.data);

  const employeeOptions = useMemo(
    () =>
      employees.map((emp) => {
        const id = String(emp.details?.id ?? emp.id);
        return {
          value: id,
          label:
            emp.details?.full_name ||
            emp.details?.email ||
            `Employee #${id}`,
          hint: emp.details?.email,
        };
      }),
    [employees],
  );

  const periodOptions = useMemo(
    () =>
      periods.map((p) => ({
        value: `${p.start_date}|${p.end_date}`,
        label: p.label,
      })),
    [periods],
  );

  const jobOptions = useMemo(
    () =>
      jobs.map((job) => {
        const id = String(job.details?.id ?? job.id);
        return {
          value: id,
          label: job.details?.name || job.name || `Job #${id}`,
        };
      }),
    [jobs],
  );

  const canSubmit = Boolean(
    employeeId && periodKey && selectedJobIds.length > 0,
  );

  function resetForm() {
    setEmployeeId("");
    setPeriodKey("");
    setSelectedJobIds([]);
  }

  function openCreate() {
    resetForm();
    setSheetReady(true);
    sheetRef.current?.present();
  }

  async function handleCreate() {
    const period = periods.find(
      (p) => `${p.start_date}|${p.end_date}` === periodKey,
    );
    if (!employeeId || !period || !selectedJobIds.length) {
      void triggerHaptic("error");
      toast.warning("Employee, period, and at least one job are required.");
      return;
    }
    try {
      await createMutation.mutateAsync({
        employee: { id: Number(employeeId) },
        period: {
          start_date: period.start_date,
          end_date: period.end_date,
        },
        jobs: selectedJobIds.map((id) => ({ id: Number(id) })),
      });
      void triggerHaptic("success");
      toast.success("Timesheet created");
      sheetRef.current?.dismiss();
      resetForm();
      void refetch();
    } catch (err) {
      void triggerHaptic("error");
      toast.error(getErrorMessage(err, "Unable to create timesheet"));
    }
  }

  if (!canList) {
    return <AccessDenied />;
  }

  if (isError && !data) {
    return (
      <View style={[styles.flex, { backgroundColor: c.bg }]}>
        <ErrorState
          title="Failed to load timesheets"
          onRetry={() => void refetch()}
        />
      </View>
    );
  }

  return (
    <View style={{ flex: 1, backgroundColor: c.bg }}>
      <View style={styles.header}>
        <ScreenHeader
          title="Manage timesheets"
          subtitle="Review, submit, and action employee timesheets"
        />
        <SearchBar
          value={search}
          onChangeText={setSearch}
          placeholder="Search by timesheet code"
        />
        <FilterChips
          value={filter}
          onChange={setFilter}
          options={[...TIMESHEET_STATUS_FILTER_OPTIONS]}
        />
        {canCreate ? (
          <Button
            title="Create timesheet"
            onPress={openCreate}
            size="md"
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
              icon={<SheetsIcon color={c.primary} size={28} />}
              title={
                debouncedSearch || filter !== "all"
                  ? "No matching timesheets"
                  : "No managed timesheets"
              }
              description={
                debouncedSearch || filter !== "all"
                  ? "Try a different search or clear filters."
                  : "Timesheets you create or manage will appear here."
              }
            />
          }
          ListFooterComponent={
            <ListPager
              currentPage={currentPage}
              totalPages={totalPages}
              isFetching={isFetching}
              hasRows={Boolean(
                rows.length || Number(pagination?.total_rows),
              )}
              onPrev={() => setPage(Math.max(1, currentPage - 1))}
              onNext={() => setPage(Math.min(totalPages, currentPage + 1))}
            />
          }
          renderItem={({ item }) => (
            <Card
              style={styles.card}
              accessibilityLabel={`Timesheet ${formatTimesheetLabel({
                code: item.code,
                id: item.id,
              })}`}
              onPress={
                item.id == null
                  ? undefined
                  : () => {
                      void triggerHaptic("selection");
                      navigateOrg("TimesheetManagementDetail", {
                        orgCode,
                        id: String(item.id),
                        timesheetCode: formatTimesheetLabel({
                          code: item.code,
                          id: item.id,
                        }),
                      });
                    }
              }
            >
              <View style={styles.cardTop}>
                <Text style={[styles.id, { color: c.text }]} numberOfLines={1}>
                  {formatTimesheetLabel({ code: item.code, id: item.id })}
                </Text>
                <StatusBadge status={item.status} />
              </View>
              {item.employee?.user?.full_name ? (
                <Text style={[styles.employee, { color: c.text }]} numberOfLines={1}>
                  {item.employee.user.full_name}
                </Text>
              ) : null}
              <Text style={[styles.period, { color: c.muted }]}>
                {item.period_range || "—"}
              </Text>
              <Text style={[styles.jobs, { color: c.muted }]} numberOfLines={1}>
                {jobNames(item)}
              </Text>
            </Card>
          )}
        />
      )}

      <AppBottomSheet
        ref={sheetRef}
        title="Create timesheet"
        snapPoints={["75%", "92%"]}
        onDismiss={() => {
          setSheetReady(false);
          resetForm();
        }}
        footer={
          <Button
            title={createMutation.isPending ? "Creating…" : "Create Timesheet"}
            onPress={() => void handleCreate()}
            disabled={!canSubmit || createMutation.isPending}
            loading={createMutation.isPending}
          />
        }
      >
        <Text style={[styles.hint, { color: c.muted }]}>
          Employee → Period → Jobs
        </Text>

        <MobileSelect
          label="Employee"
          value={employeeId}
          options={employeeOptions}
          onChange={(id) => {
            setEmployeeId(id);
            setPeriodKey("");
            setSelectedJobIds([]);
          }}
          placeholder="Select employee"
          emptyText="No employees"
        />

        {!employeeId ? (
          <Text style={{ color: c.muted, marginBottom: spacing.md }}>
            Select an employee to load pay periods
          </Text>
        ) : cyclesQuery.isLoading ? (
          <ActivityIndicator
            color={c.primary}
            style={{ marginBottom: spacing.md }}
          />
        ) : (
          <MobileSelect
            label="Pay period"
            value={periodKey}
            options={periodOptions}
            onChange={(key) => {
              setPeriodKey(key);
              setSelectedJobIds([]);
            }}
            placeholder="Select period"
            searchable={false}
            emptyText="No periods available"
          />
        )}

        <MobileSelect
          label="Jobs"
          multiple
          values={selectedJobIds}
          options={jobOptions}
          onChange={setSelectedJobIds}
          placeholder="Select one or more jobs"
          disabled={!periodKey}
          emptyText="No jobs"
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
    marginBottom: 6,
  },
  id: {
    flex: 1,
    fontSize: typography.sizes.md,
    fontWeight: "700",
    letterSpacing: -0.2,
  },
  employee: {
    fontSize: typography.sizes.sm,
    fontWeight: "600",
    marginBottom: 2,
  },
  period: {
    fontSize: typography.sizes.sm,
    fontWeight: "500",
  },
  jobs: {
    marginTop: 6,
    fontSize: typography.sizes.xs,
    fontWeight: "500",
  },
  hint: { marginBottom: spacing.md, fontSize: 13 },
});
