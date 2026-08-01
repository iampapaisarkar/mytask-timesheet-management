import { useEffect, useState } from "react";
import {
  ActivityIndicator,
  ScrollView,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
} from "react-native";
import type { NativeStackScreenProps } from "@react-navigation/native-stack";
import { useMutation, useQuery } from "@tanstack/react-query";
import { reportsApi } from "@mytask/api";
import { formatHours, formatMoney } from "@mytask/constants";
import { can, getOrganisationAcl } from "@mytask/services";
import { spacing } from "@mytask/theme";
import {
  formatTimesheetLabel,
  getErrorMessage,
} from "@mytask/utils";
import type { RootStackParamList } from "../navigation/RootNavigator";
import { useOrganisationStore } from "../store/organisationStore";
import { useThemeStore } from "../store/themeStore";
import { useToastStore } from "../store/toastStore";

type Props = NativeStackScreenProps<RootStackParamList, "Reports">;

type EmpOption = {
  id: number;
  full_name?: string;
  email?: string | null;
  is_you?: boolean;
};

type TsOption = {
  id: number;
  code?: string;
  period_range?: string;
  status?: { name?: string; code?: string };
};

type ReportResult = {
  currency?: string;
  employee?: { name?: string; email?: string | null };
  timesheet?: { code?: string; period?: string | { start?: string; end?: string } };
  totals?: {
    working_hours?: number;
    break_hours?: number;
    travel_hours?: number;
    overtime_hours?: number;
    days_worked?: number;
    amount?: number;
  };
};

type ReportRequest = {
  id: number;
  status?: string;
  progress?: number | null;
  error_message?: string | null;
  result?: ReportResult | null;
};

export function ReportsScreen({}: Props) {
  const organisation = useOrganisationStore((s) => s.organisation);
  const role = organisation?.role || organisation?.role_code;
  const acl = getOrganisationAcl(role);
  const canView = can(acl, "report", "view");
  const canCreate = can(acl, "report", "create");
  const c = useThemeStore((s) => s.colors);
  const toast = useToastStore();

  const [employeeId, setEmployeeId] = useState("");
  const [timesheetId, setTimesheetId] = useState("");
  const [activeRequestId, setActiveRequestId] = useState<string | null>(null);

  const employeesQuery = useQuery({
    queryKey: ["reports", "employees"],
    queryFn: async () => {
      const res = await reportsApi.listEmployees();
      return (res.data as { data: EmpOption[] }).data;
    },
    enabled: canView,
  });

  const employees = employeesQuery.data || [];

  const timesheetsQuery = useQuery({
    queryKey: ["reports", "timesheets", employeeId] as const,
    queryFn: async () => {
      const res = await reportsApi.listTimesheets({
        employee_id: employeeId,
        rows_per_page: 200,
      });
      return (res.data as { data: TsOption[] }).data;
    },
    enabled: canView && Boolean(employeeId),
  });

  const timesheets = timesheetsQuery.data || [];

  const activeStatus = useQuery({
    queryKey: ["reports", "request", activeRequestId],
    queryFn: async () => {
      const res = await reportsApi.getRequest(activeRequestId!);
      return (res.data as { data: ReportRequest }).data;
    },
    enabled: Boolean(activeRequestId),
    refetchInterval: (q) => {
      const st = q.state.data?.status;
      if (!st || ["completed", "failed"].includes(st)) return false;
      return 2000;
    },
  });

  const resultQuery = useQuery({
    queryKey: ["reports", "result", activeRequestId],
    queryFn: async () => {
      const res = await reportsApi.getResult(activeRequestId!);
      return (res.data as { data: ReportRequest }).data;
    },
    enabled:
      Boolean(activeRequestId) && activeStatus.data?.status === "completed",
  });

  const result =
    resultQuery.data?.result ||
    (activeStatus.data?.status === "completed"
      ? activeStatus.data.result
      : null);

  useEffect(() => {
    if (employees.length === 1 && !employeeId) {
      setEmployeeId(String(employees[0].id));
    }
  }, [employees, employeeId]);

  const createMutation = useMutation({
    mutationFn: (payload: Record<string, unknown>) =>
      reportsApi.createRequest(payload),
    onSuccess: (res) => {
      const data = (res.data as { data: ReportRequest }).data;
      setActiveRequestId(String(data.id));
      toast.success("Report queued", "Generating in the background…");
    },
    onError: (err) =>
      toast.error("Generate failed", getErrorMessage(err)),
  });

  function handleGenerate() {
    if (!canCreate) {
      toast.warning("You do not have permission to generate reports");
      return;
    }
    if (!employeeId) {
      toast.warning("Select an employee");
      return;
    }
    if (!timesheetId) {
      toast.warning("Select an approved timesheet");
      return;
    }
    createMutation.mutate({
      employee_id: Number(employeeId),
      timesheet_id: Number(timesheetId),
    });
  }

  if (!canView) {
    return (
      <View style={[styles.center, { backgroundColor: c.bg }]}>
        <Text style={{ color: c.text }}>
          You do not have permission to view reports.
        </Text>
      </View>
    );
  }

  const processing =
    activeStatus.data &&
    !["completed", "failed"].includes(activeStatus.data.status || "");

  const currency = result?.currency || "AUD";

  return (
    <ScrollView
      style={{ flex: 1, backgroundColor: c.bg }}
      contentContainerStyle={styles.container}
    >
      <Text style={[styles.title, { color: c.text }]}>Pay report</Text>
      <Text style={[styles.sub, { color: c.muted }]}>
        Pick an employee and approved timesheet, then generate totals.
      </Text>

      <Text style={[styles.label, { color: c.text }]}>Employee</Text>
      {employeesQuery.isLoading ? (
        <ActivityIndicator color={c.primary} />
      ) : (
        employees.map((emp) => {
          const id = String(emp.id);
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
                setTimesheetId("");
                setActiveRequestId(null);
              }}
            >
              <Text style={{ color: c.text }}>
                {emp.full_name || emp.email || `Employee #${id}`}
              </Text>
            </TouchableOpacity>
          );
        })
      )}

      <Text style={[styles.label, { color: c.text }]}>Approved timesheet</Text>
      {!employeeId ? (
        <Text style={{ color: c.muted }}>Select an employee first</Text>
      ) : timesheetsQuery.isLoading ? (
        <ActivityIndicator color={c.primary} />
      ) : timesheets.length === 0 ? (
        <Text style={{ color: c.muted }}>No approved timesheets</Text>
      ) : (
        timesheets.map((ts) => {
          const id = String(ts.id);
          const selected = timesheetId === id;
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
                setTimesheetId(id);
                setActiveRequestId(null);
              }}
            >
              <Text style={{ color: c.text }}>
                {formatTimesheetLabel({ code: ts.code, id: ts.id })}
                {ts.period_range ? ` · ${ts.period_range}` : ""}
              </Text>
            </TouchableOpacity>
          );
        })
      )}

      {canCreate ? (
        <TouchableOpacity
          style={[
            styles.button,
            {
              backgroundColor: c.primary,
              opacity:
                createMutation.isPending || !employeeId || !timesheetId
                  ? 0.5
                  : 1,
            },
          ]}
          disabled={
            createMutation.isPending || !employeeId || !timesheetId
          }
          onPress={handleGenerate}
        >
          {createMutation.isPending ? (
            <ActivityIndicator color="#fff" />
          ) : (
            <Text style={styles.buttonText}>Generate report</Text>
          )}
        </TouchableOpacity>
      ) : null}

      {processing ? (
        <View style={styles.statusRow}>
          <ActivityIndicator color={c.primary} />
          <Text style={{ color: c.muted, marginLeft: 10 }}>
            Generating… {activeStatus.data?.progress != null
              ? `${activeStatus.data.progress}%`
              : ""}
          </Text>
        </View>
      ) : null}

      {activeStatus.data?.status === "failed" ? (
        <Text style={{ color: c.negative, marginTop: spacing.md }}>
          {activeStatus.data.error_message || "Report generation failed"}
        </Text>
      ) : null}

      {result?.totals ? (
        <View
          style={[
            styles.totalsCard,
            { backgroundColor: c.surface, borderColor: c.border },
          ]}
        >
          <Text style={[styles.totalsTitle, { color: c.text }]}>Totals</Text>
          {result.employee?.name ? (
            <Text style={{ color: c.muted, marginBottom: 4 }}>
              {result.employee.name}
            </Text>
          ) : null}
          <Text style={[styles.totalRow, { color: c.text }]}>
            Working: {formatHours(result.totals.working_hours ?? 0)}
          </Text>
          <Text style={[styles.totalRow, { color: c.text }]}>
            Break: {formatHours(result.totals.break_hours ?? 0)}
          </Text>
          <Text style={[styles.totalRow, { color: c.text }]}>
            Travel: {formatHours(result.totals.travel_hours ?? 0)}
          </Text>
          <Text style={[styles.totalRow, { color: c.text }]}>
            Overtime: {formatHours(result.totals.overtime_hours ?? 0)}
          </Text>
          <Text style={[styles.totalRow, { color: c.text }]}>
            Days worked: {result.totals.days_worked ?? 0}
          </Text>
          <Text style={[styles.amount, { color: c.primary }]}>
            {formatMoney(result.totals.amount ?? 0, currency)}
          </Text>
        </View>
      ) : null}
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: { padding: spacing.lg, paddingBottom: spacing.xxl },
  center: { flex: 1, alignItems: "center", justifyContent: "center", padding: spacing.lg },
  title: { fontSize: 22, fontWeight: "700" },
  sub: { marginTop: 4, marginBottom: spacing.lg, fontSize: 13 },
  label: { fontWeight: "700", marginTop: spacing.md, marginBottom: 8 },
  option: {
    borderWidth: 1,
    borderRadius: 12,
    padding: 12,
    marginBottom: 8,
  },
  button: {
    borderRadius: 14,
    paddingVertical: 15,
    alignItems: "center",
    marginTop: spacing.lg,
  },
  buttonText: { color: "#fff", fontWeight: "700", fontSize: 15 },
  statusRow: {
    flexDirection: "row",
    alignItems: "center",
    marginTop: spacing.md,
  },
  totalsCard: {
    marginTop: spacing.lg,
    borderRadius: 16,
    borderWidth: 1,
    padding: spacing.md,
  },
  totalsTitle: { fontSize: 16, fontWeight: "700", marginBottom: spacing.sm },
  totalRow: { fontSize: 14, marginBottom: 4 },
  amount: { fontSize: 22, fontWeight: "700", marginTop: spacing.sm },
});
