import { useEffect, useMemo, useRef, useState } from "react";
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
import { spacing } from "@mytask/theme";
import { ListPager } from "../components/ListPager";
import { MobileSelect } from "../components/MobileSelect";
import { SearchBar } from "../components/SearchBar";
import { SkeletonList } from "../components/Skeleton";
import { useDebouncedValue } from "../hooks/useDebouncedValue";
import type { ManageStackParamList } from "../navigation/types";
import { useOrganisationStore } from "../store/organisationStore";
import { useThemeStore } from "../store/themeStore";
import { useToastStore } from "../store/toastStore";
import { triggerHaptic } from "../utils/haptics";
import { AppBottomSheet } from "../ui";

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

function statusLabel(status: ManagementRow["status"]) {
  if (!status) return "—";
  if (typeof status === "string") return status;
  return status.name || status.code || "—";
}

function jobNames(item: ManagementRow) {
  if (Array.isArray(item.jobs) && item.jobs.length) {
    return item.jobs.map((j) => j.name).filter(Boolean).join(", ");
  }
  return item.job?.name || "No jobs";
}

export function TimesheetManagementListScreen({ navigation, route }: Props) {
  const { orgCode } = route.params;
  const organisation = useOrganisationStore((s) => s.organisation);
  const role = organisation?.role || organisation?.role_code;
  const acl = getOrganisationAcl(role);
  const canCreate = can(acl, "timesheetManagement", "create");

  const sheetRef = useRef<BottomSheetModal>(null);
  const [employeeId, setEmployeeId] = useState("");
  const [periodKey, setPeriodKey] = useState("");
  const [selectedJobIds, setSelectedJobIds] = useState<string[]>([]);
  const [page, setPage] = useState(1);
  const [search, setSearch] = useState("");
  const debouncedSearch = useDebouncedValue(search.trim(), 400);
  const toast = useToastStore();

  useEffect(() => {
    setPage(1);
  }, [debouncedSearch]);

  const { data, isLoading, isError, isFetching, refetch } =
    useTimesheetManagement({
      rows_per_page: DEFAULT_LIST_PAGE_SIZE,
      page_number: page,
      sort_by: "id",
      ...(debouncedSearch ? { search: debouncedSearch } : {}),
    });
  const rows = listRows<ManagementRow>(data);
  const pagination = listPagination(data);
  const totalPages = Math.max(1, Number(pagination?.total_pages) || 1);
  const currentPage = Number(pagination?.page_number) || page;
  const c = useThemeStore((s) => s.colors);

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

  if (isError && !data) {
    return (
      <View style={[styles.center, { backgroundColor: c.bg }]}>
        <Text style={{ color: c.text }}>Failed to load timesheets</Text>
        <TouchableOpacity onPress={() => void refetch()}>
          <Text style={[styles.link, { color: c.primary }]}>Try again</Text>
        </TouchableOpacity>
      </View>
    );
  }

  return (
    <View style={{ flex: 1, backgroundColor: c.bg }}>
      <View style={{ paddingHorizontal: spacing.md, paddingTop: spacing.md }}>
        <SearchBar
          value={search}
          onChangeText={setSearch}
          placeholder="Search by timesheet code"
        />
      </View>
      {canCreate ? (
        <TouchableOpacity
          style={[styles.createBtn, { backgroundColor: c.primary }]}
          onPress={openCreate}
        >
          <Text style={styles.createBtnText}>Create timesheet</Text>
        </TouchableOpacity>
      ) : null}
      {isLoading && !data ? (
        <SkeletonList rows={6} />
      ) : (
        <FlatList
          contentContainerStyle={{
            padding: spacing.md,
            paddingTop: spacing.sm,
          }}
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
            <Text style={[styles.empty, { color: c.muted }]}>
              {debouncedSearch
                ? "No timesheets match that code"
                : "No managed timesheets"}
            </Text>
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
            <TouchableOpacity
              style={[
                styles.card,
                { backgroundColor: c.surface, borderColor: c.border },
              ]}
              disabled={item.id == null}
              onPress={() => {
                if (item.id == null) return;
                navigation.navigate("TimesheetManagementDetail", {
                  orgCode,
                  id: String(item.id),
                });
              }}
            >
              <Text style={[styles.id, { color: c.text }]}>
                {formatTimesheetLabel({ code: item.code, id: item.id })}
                {item.employee?.user?.full_name
                  ? ` · ${item.employee.user.full_name}`
                  : ""}
              </Text>
              <Text style={{ color: c.muted }}>
                {item.period_range || "—"}
              </Text>
              <Text
                style={{ color: c.text, marginTop: 4, fontWeight: "600" }}
              >
                {jobNames(item)}
              </Text>
              <Text style={{ color: c.muted, marginTop: 2 }}>
                {statusLabel(item.status)}
              </Text>
            </TouchableOpacity>
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
          <TouchableOpacity
            style={[
              styles.primaryBtn,
              {
                backgroundColor: c.primary,
                opacity: canSubmit && !createMutation.isPending ? 1 : 0.5,
              },
            ]}
            disabled={!canSubmit || createMutation.isPending}
            onPress={() => void handleCreate()}
          >
            <Text style={styles.createBtnText}>
              {createMutation.isPending ? "Creating…" : "Create Timesheet"}
            </Text>
          </TouchableOpacity>
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
  center: { flex: 1, alignItems: "center", justifyContent: "center" },
  card: {
    borderRadius: 16,
    padding: spacing.md,
    marginBottom: spacing.sm,
    borderWidth: 1,
  },
  id: { fontWeight: "700", marginBottom: 4 },
  empty: { textAlign: "center", marginTop: 40 },
  link: { fontWeight: "700", marginTop: 8 },
  createBtn: {
    marginHorizontal: spacing.md,
    marginTop: spacing.md,
    borderRadius: 12,
    paddingVertical: 12,
    alignItems: "center",
  },
  createBtnText: { color: "#fff", fontWeight: "700" },
  hint: { marginBottom: spacing.md, fontSize: 13 },
  primaryBtn: {
    borderRadius: 12,
    paddingVertical: 14,
    alignItems: "center",
  },
});
