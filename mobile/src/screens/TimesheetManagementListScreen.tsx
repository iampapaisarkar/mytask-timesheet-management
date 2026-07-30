import { useMemo, useState } from "react";
import {
  ActivityIndicator,
  FlatList,
  Modal,
  ScrollView,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
} from "react-native";
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
import { useOrganisationStore } from "../store/organisationStore";
import { useThemeStore } from "../store/themeStore";

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

export function TimesheetManagementListScreen() {
  const organisation = useOrganisationStore((s) => s.organisation);
  const role = organisation?.role || organisation?.role_code;
  const acl = getOrganisationAcl(role);
  const canCreate = can(acl, "timesheetManagement", "create");

  const [createOpen, setCreateOpen] = useState(false);
  const [employeeId, setEmployeeId] = useState("");
  const [periodKey, setPeriodKey] = useState("");
  const [selectedJobIds, setSelectedJobIds] = useState<string[]>([]);
  const [formError, setFormError] = useState<string | null>(null);
  const [page, setPage] = useState(1);

  const { data, isLoading, isError, isFetching, refetch } =
    useTimesheetManagement({
      rows_per_page: DEFAULT_LIST_PAGE_SIZE,
      page_number: page,
      sort_by: "id",
    });
  const rows = listRows<ManagementRow>(data);
  const pagination = listPagination(data);
  const totalPages = Math.max(1, Number(pagination?.total_pages) || 1);
  const currentPage = Number(pagination?.page_number) || page;
  const c = useThemeStore((s) => s.colors);

  const employeesQuery = useEmployees({ rows_per_page: 200 }, createOpen);
  const jobsQuery = useJobs({ rows_per_page: 200 }, createOpen);
  const cyclesQuery = useEmployeePayrollCycles(
    employeeId ? Number(employeeId) : undefined,
  );
  const createMutation = useCreateTimesheetManagement();

  const employees = listRows<EmployeeRow>(employeesQuery.data);
  const periods = (Array.isArray(cyclesQuery.data)
    ? cyclesQuery.data
    : []) as Period[];
  const jobs = listRows<JobRow>(jobsQuery.data);

  const canSubmit = Boolean(
    employeeId && periodKey && selectedJobIds.length > 0,
  );

  const summary = useMemo(() => {
    const emp = employees.find(
      (e) => String(e.details?.id ?? e.id) === employeeId,
    );
    const period = periods.find(
      (p) => `${p.start_date}|${p.end_date}` === periodKey,
    );
    const selected = jobs.filter((j) =>
      selectedJobIds.includes(String(j.details?.id ?? j.id)),
    );
    return {
      employee:
        emp?.details?.full_name ||
        emp?.details?.email ||
        (employeeId ? `#${employeeId}` : ""),
      period: period?.label || "",
      jobs: selected
        .map((j) => j.details?.name || j.name)
        .filter(Boolean)
        .join(", "),
    };
  }, [employees, periods, jobs, employeeId, periodKey, selectedJobIds]);

  function resetForm() {
    setEmployeeId("");
    setPeriodKey("");
    setSelectedJobIds([]);
    setFormError(null);
  }

  function toggleJob(id: string) {
    setSelectedJobIds((prev) =>
      prev.includes(id) ? prev.filter((x) => x !== id) : [...prev, id],
    );
  }

  async function handleCreate() {
    const period = periods.find(
      (p) => `${p.start_date}|${p.end_date}` === periodKey,
    );
    if (!employeeId || !period || !selectedJobIds.length) {
      setFormError("Employee, period, and at least one job are required.");
      return;
    }
    setFormError(null);
    try {
      await createMutation.mutateAsync({
        employee: { id: Number(employeeId) },
        period: {
          start_date: period.start_date,
          end_date: period.end_date,
        },
        jobs: selectedJobIds.map((id) => ({ id: Number(id) })),
      });
      setCreateOpen(false);
      resetForm();
      void refetch();
    } catch (err) {
      setFormError(getErrorMessage(err, "Unable to create timesheet"));
    }
  }

  if (isLoading) {
    return (
      <View style={[styles.center, { backgroundColor: c.bg }]}>
        <ActivityIndicator color={c.primary} />
      </View>
    );
  }

  if (isError) {
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
      {canCreate ? (
        <TouchableOpacity
          style={[styles.createBtn, { backgroundColor: c.primary }]}
          onPress={() => {
            resetForm();
            setCreateOpen(true);
          }}
        >
          <Text style={styles.createBtnText}>Create timesheet</Text>
        </TouchableOpacity>
      ) : null}
      <FlatList
        contentContainerStyle={{ padding: spacing.md, paddingTop: spacing.sm }}
        data={rows}
        keyExtractor={(item, index) => String(item.id ?? index)}
        ListEmptyComponent={
          <Text style={[styles.empty, { color: c.muted }]}>
            No managed timesheets
          </Text>
        }
        ListFooterComponent={
          rows.length || Number(pagination?.total_rows) ? (
            <View style={styles.pager}>
              <Text style={{ color: c.muted, marginBottom: spacing.sm }}>
                Page {currentPage} of {totalPages}
              </Text>
              <View style={styles.pagerRow}>
                <TouchableOpacity
                  disabled={currentPage <= 1 || isFetching}
                  onPress={() => setPage(Math.max(1, currentPage - 1))}
                >
                  <Text
                    style={[
                      styles.link,
                      {
                        color: currentPage <= 1 ? c.muted : c.primary,
                        opacity: currentPage <= 1 ? 0.5 : 1,
                      },
                    ]}
                  >
                    Previous
                  </Text>
                </TouchableOpacity>
                <TouchableOpacity
                  disabled={currentPage >= totalPages || isFetching}
                  onPress={() =>
                    setPage(Math.min(totalPages, currentPage + 1))
                  }
                >
                  <Text
                    style={[
                      styles.link,
                      {
                        color:
                          currentPage >= totalPages ? c.muted : c.primary,
                        opacity: currentPage >= totalPages ? 0.5 : 1,
                      },
                    ]}
                  >
                    Next
                  </Text>
                </TouchableOpacity>
              </View>
            </View>
          ) : null
        }
        renderItem={({ item }) => (
          <View
            style={[
              styles.card,
              { backgroundColor: c.surface, borderColor: c.border },
            ]}
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
            <Text style={{ color: c.text, marginTop: 4, fontWeight: "600" }}>
              {jobNames(item)}
            </Text>
            <Text style={{ color: c.muted, marginTop: 2 }}>
              {statusLabel(item.status)}
            </Text>
          </View>
        )}
      />

      <Modal
        visible={createOpen}
        animationType="slide"
        onRequestClose={() => setCreateOpen(false)}
      >
        <View style={[styles.modal, { backgroundColor: c.bg }]}>
          <Text style={[styles.modalTitle, { color: c.text }]}>
            Create timesheet
          </Text>
          <Text style={{ color: c.muted, marginBottom: spacing.md }}>
            Employee → Period → Jobs (multi-select)
          </Text>
          <ScrollView>
            <Text style={[styles.label, { color: c.text }]}>1. Employee</Text>
            {employees.map((emp) => {
              const id = String(emp.details?.id ?? emp.id);
              const selected = employeeId === id;
              return (
                <TouchableOpacity
                  key={id}
                  style={[
                    styles.option,
                    {
                      borderColor: selected ? c.primary : c.border,
                      backgroundColor: c.surface,
                    },
                  ]}
                  onPress={() => {
                    setEmployeeId(id);
                    setPeriodKey("");
                    setSelectedJobIds([]);
                  }}
                >
                  <Text style={{ color: c.text }}>
                    {emp.details?.full_name ||
                      emp.details?.email ||
                      `Employee #${id}`}
                  </Text>
                </TouchableOpacity>
              );
            })}

            <Text style={[styles.label, { color: c.text }]}>2. Pay period</Text>
            {!employeeId ? (
              <Text style={{ color: c.muted }}>Select an employee first</Text>
            ) : cyclesQuery.isLoading ? (
              <ActivityIndicator color={c.primary} />
            ) : (
              periods.map((p) => {
                const key = `${p.start_date}|${p.end_date}`;
                const selected = periodKey === key;
                return (
                  <TouchableOpacity
                    key={key}
                    style={[
                      styles.option,
                      {
                        borderColor: selected ? c.primary : c.border,
                        backgroundColor: c.surface,
                      },
                    ]}
                    onPress={() => {
                      setPeriodKey(key);
                      setSelectedJobIds([]);
                    }}
                  >
                    <Text style={{ color: c.text }}>{p.label}</Text>
                  </TouchableOpacity>
                );
              })
            )}

            <Text style={[styles.label, { color: c.text }]}>
              3. Jobs (one or more)
            </Text>
            {!periodKey ? (
              <Text style={{ color: c.muted }}>Select a period first</Text>
            ) : (
              jobs.map((job) => {
                const id = String(job.details?.id ?? job.id);
                const selected = selectedJobIds.includes(id);
                return (
                  <TouchableOpacity
                    key={id}
                    style={[
                      styles.option,
                      {
                        borderColor: selected ? c.primary : c.border,
                        backgroundColor: c.surface,
                      },
                    ]}
                    onPress={() => toggleJob(id)}
                  >
                    <Text style={{ color: c.text }}>
                      {selected ? "✓ " : ""}
                      {job.details?.name || job.name || `Job #${id}`}
                    </Text>
                  </TouchableOpacity>
                );
              })
            )}

            {canSubmit ? (
              <View
                style={[
                  styles.summary,
                  { borderColor: c.border, backgroundColor: c.surface },
                ]}
              >
                <Text style={{ color: c.text }}>{summary.employee}</Text>
                <Text style={{ color: c.muted }}>{summary.period}</Text>
                <Text style={{ color: c.text, fontWeight: "700" }}>
                  {summary.jobs}
                </Text>
              </View>
            ) : null}

            {formError ? (
              <Text style={{ color: "#c0392b", marginTop: spacing.sm }}>
                {formError}
              </Text>
            ) : null}
          </ScrollView>

          <View style={styles.modalActions}>
            <TouchableOpacity
              style={[styles.secondaryBtn, { borderColor: c.border }]}
              onPress={() => {
                setCreateOpen(false);
                resetForm();
              }}
            >
              <Text style={{ color: c.text }}>Cancel</Text>
            </TouchableOpacity>
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
          </View>
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
  id: { fontWeight: "700", marginBottom: 4 },
  empty: { textAlign: "center", marginTop: 40 },
  link: { fontWeight: "700", marginTop: 8 },
  pager: { alignItems: "center", paddingVertical: spacing.md },
  pagerRow: {
    flexDirection: "row",
    gap: 24,
    justifyContent: "center",
  },
  createBtn: {
    marginHorizontal: spacing.md,
    marginTop: spacing.md,
    borderRadius: 12,
    paddingVertical: 12,
    alignItems: "center",
  },
  createBtnText: { color: "#fff", fontWeight: "700" },
  modal: { flex: 1, padding: spacing.md, paddingTop: 56 },
  modalTitle: { fontSize: 22, fontWeight: "700", marginBottom: 4 },
  label: { fontWeight: "700", marginTop: spacing.md, marginBottom: 8 },
  option: {
    borderWidth: 1,
    borderRadius: 12,
    padding: 12,
    marginBottom: 8,
  },
  summary: {
    marginTop: spacing.md,
    borderWidth: 1,
    borderRadius: 12,
    padding: 12,
  },
  modalActions: {
    flexDirection: "row",
    gap: 10,
    paddingTop: spacing.md,
  },
  secondaryBtn: {
    flex: 1,
    borderWidth: 1,
    borderRadius: 12,
    paddingVertical: 12,
    alignItems: "center",
  },
  primaryBtn: {
    flex: 1,
    borderRadius: 12,
    paddingVertical: 12,
    alignItems: "center",
  },
});
