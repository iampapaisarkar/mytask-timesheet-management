import { useEffect, useState } from "react";
import {
  ActivityIndicator,
  Platform,
  ScrollView,
  Share,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
} from "react-native";
import type { NativeStackScreenProps } from "@react-navigation/native-stack";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { reportsApi } from "@mytask/api";
import { formatHours, formatMoney } from "@mytask/constants";
import { can, getOrganisationAcl } from "@mytask/services";
import { spacing } from "@mytask/theme";
import {
  formatDisplayTime,
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
  jobs?: Array<{ id: number; name?: string }>;
};

type DayRow = {
  date?: string;
  day_name?: string | null;
  clock_in?: string | null;
  clock_out?: string | null;
  working_hours?: number;
  break_hours?: number;
  travel_hours?: number;
  amount?: number;
  is_public_holiday?: boolean;
};

type ReportResult = {
  currency?: string;
  employee?: { name?: string; email?: string | null };
  timesheet?: {
    timesheet_id?: number;
    code?: string;
    period_start_date?: string;
    period_end_date?: string;
    period?: string | { start?: string; end?: string };
    jobs?: Array<{ id: number; name?: string }>;
  };
  days?: DayRow[];
  totals?: {
    working_hours?: number;
    break_hours?: number;
    travel_hours?: number;
    overtime_hours?: number;
    days_worked?: number;
    amount?: number;
  };
  pay_cycle?: {
    total_amount?: number;
    currency?: string;
    is_paid?: boolean;
    paid_label?: string;
  };
};

type ReportRequest = {
  id: number;
  name?: string;
  status?: string;
  progress?: number | null;
  error_message?: string | null;
  created_at?: string;
  result?: ReportResult | null;
};

const REQUESTS_PAGE_SIZE = 5;

function bytesToBase64(bytes: Uint8Array): string {
  const chars =
    "ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789+/";
  let result = "";
  const len = bytes.length;
  for (let i = 0; i < len; i += 3) {
    const a = bytes[i];
    const b = i + 1 < len ? bytes[i + 1] : 0;
    const c = i + 2 < len ? bytes[i + 2] : 0;
    result += chars[a >> 2];
    result += chars[((a & 3) << 4) | (b >> 4)];
    result += i + 1 < len ? chars[((b & 15) << 2) | (c >> 6)] : "=";
    result += i + 2 < len ? chars[c & 63] : "=";
  }
  return result;
}

async function blobLikeToBase64(data: unknown): Promise<string> {
  if (data instanceof ArrayBuffer) {
    return bytesToBase64(new Uint8Array(data));
  }
  if (typeof Blob !== "undefined" && data instanceof Blob) {
    const buffer = await new Response(data).arrayBuffer();
    return bytesToBase64(new Uint8Array(buffer));
  }
  if (data && typeof data === "object" && "data" in (data as object)) {
    const nested = (data as { data?: unknown }).data;
    if (nested instanceof Uint8Array) return bytesToBase64(nested);
    if (Array.isArray(nested)) return bytesToBase64(Uint8Array.from(nested));
  }
  if (data instanceof Uint8Array) return bytesToBase64(data);
  throw new Error("Unsupported PDF response type");
}

export function ReportsScreen({}: Props) {
  const organisation = useOrganisationStore((s) => s.organisation);
  const role = organisation?.role || organisation?.role_code;
  const acl = getOrganisationAcl(role);
  const canView = can(acl, "report", "view");
  const canCreate = can(acl, "report", "create");
  const roleCode =
    role && typeof role === "object" && "code" in role
      ? String((role as { code?: string }).code || "")
      : String(role || "");
  const isStaff = roleCode === "staff";
  const c = useThemeStore((s) => s.colors);
  const toast = useToastStore();
  const qc = useQueryClient();

  const [employeeId, setEmployeeId] = useState("");
  const [timesheetId, setTimesheetId] = useState("");
  const [activeRequestId, setActiveRequestId] = useState<string | null>(null);
  const [requestsPage, setRequestsPage] = useState(1);
  const [requestItems, setRequestItems] = useState<ReportRequest[]>([]);
  const [requestsHasMore, setRequestsHasMore] = useState(false);

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

  const historyQuery = useQuery({
    queryKey: ["reports", "requests", requestsPage, REQUESTS_PAGE_SIZE] as const,
    queryFn: async () => {
      const res = await reportsApi.listRequests({
        rows_per_page: REQUESTS_PAGE_SIZE,
        page_number: requestsPage,
      });
      const body = res.data as {
        data?: ReportRequest[];
        pagination?: {
          total_rows?: number;
          has_more?: boolean;
        };
        info?: {
          pagination?: {
            total_rows?: number;
            has_more?: boolean;
          } | null;
        };
      };
      const pagination = body.pagination || body.info?.pagination || undefined;
      const rows = Array.isArray(body.data) ? body.data : [];
      return { data: rows, pagination };
    },
    enabled: canView,
  });

  useEffect(() => {
    const payload = historyQuery.data;
    if (!payload) return;
    const pageRows = Array.isArray(payload.data) ? payload.data : [];
    setRequestItems((prev) => {
      if (requestsPage <= 1) return pageRows;
      const seen = new Set(prev.map((r) => r.id));
      const next = pageRows.filter((r) => !seen.has(r.id));
      return next.length ? [...prev, ...next] : prev;
    });
    const hasMore =
      Boolean(payload.pagination?.has_more) ||
      (payload.pagination?.total_rows != null
        ? requestsPage * REQUESTS_PAGE_SIZE <
          Number(payload.pagination.total_rows)
        : pageRows.length >= REQUESTS_PAGE_SIZE);
    setRequestsHasMore(hasMore);
  }, [historyQuery.data, requestsPage]);

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
    if ((isStaff || employees.length === 1) && employees.length === 1 && !employeeId) {
      setEmployeeId(String(employees[0].id));
    }
  }, [employees, employeeId, isStaff]);

  const createMutation = useMutation({
    mutationFn: (payload: Record<string, unknown>) =>
      reportsApi.createRequest(payload),
    onSuccess: (res) => {
      const data = (res.data as { data: ReportRequest }).data;
      setActiveRequestId(String(data.id));
      toast.success("Report queued", "Generating in the background…");
      setRequestsPage(1);
      void qc.invalidateQueries({ queryKey: ["reports", "requests"] });
    },
    onError: (err) => toast.error("Generate failed", getErrorMessage(err)),
  });

  const emailMutation = useMutation({
    mutationFn: () => reportsApi.emailPdf(activeRequestId!),
    onSuccess: (res) => {
      const msg =
        (res.data as { message?: string })?.message ||
        "Report and PDF emailed successfully";
      toast.success("Email sent", msg);
    },
    onError: (err) => toast.error("Email failed", getErrorMessage(err)),
  });

  const downloadMutation = useMutation({
    mutationFn: async () => {
      if (!activeRequestId) throw new Error("No report selected");
      const res = await reportsApi.downloadPdf(activeRequestId);
      const base64 = await blobLikeToBase64(res.data);
      const url = `data:application/pdf;base64,${base64}`;
      await Share.share(
        Platform.OS === "ios"
          ? {
              url,
              title: `report-${activeRequestId}.pdf`,
            }
          : {
              message: `Report PDF ready (request #${activeRequestId}). If the share sheet cannot open the file, use Email Report.`,
              title: `report-${activeRequestId}.pdf`,
              url,
            },
      );
    },
    onSuccess: () => toast.success("Share opened", "PDF ready to save or share"),
    onError: (err) => toast.error("Download failed", getErrorMessage(err)),
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

  const currency = result?.currency || result?.pay_cycle?.currency || "AUD";

  return (
    <ScrollView
      style={{ flex: 1, backgroundColor: c.bg }}
      contentContainerStyle={styles.container}
    >
      <Text style={[styles.title, { color: c.text }]}>Reports</Text>
      <Text style={[styles.sub, { color: c.muted }]}>
        Generate a pay report for one approved timesheet, then download or email
        the PDF.
      </Text>

      <View
        style={[
          styles.card,
          { backgroundColor: c.surface, borderColor: c.border },
        ]}
      >
        <Text style={[styles.cardTitle, { color: c.text }]}>Generate report</Text>

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
                disabled={isStaff && employees.length === 1}
                style={[
                  styles.option,
                  {
                    borderColor: selected ? c.primary : c.border,
                    backgroundColor: c.bg,
                    opacity: isStaff && employees.length === 1 ? 0.75 : 1,
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
                  {emp.is_you ? " (You)" : ""}
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
          <Text style={{ color: c.muted }}>
            No approved timesheets for this employee. Only approved timesheets
            can generate a report.
          </Text>
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
                    backgroundColor: c.bg,
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
                  {ts.jobs?.length
                    ? ` · ${ts.jobs
                        .map((j) => j.name)
                        .filter(Boolean)
                        .join(", ")}`
                    : ""}
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

        {activeStatus.data ? (
          <Text style={{ color: c.muted, marginTop: spacing.sm }}>
            Status: {activeStatus.data.status}
            {activeStatus.data.progress != null
              ? ` · ${activeStatus.data.progress}%`
              : ""}
          </Text>
        ) : null}
      </View>

      {processing ? (
        <View style={styles.statusRow}>
          <ActivityIndicator color={c.primary} />
          <Text style={{ color: c.muted, marginLeft: 10 }}>
            Generating report in the background…
          </Text>
        </View>
      ) : null}

      {activeStatus.data?.status === "failed" ? (
        <Text style={{ color: c.negative, marginTop: spacing.md }}>
          {activeStatus.data.error_message || "Report generation failed"}
        </Text>
      ) : null}

      {result ? (
        <View
          style={[
            styles.card,
            { backgroundColor: c.surface, borderColor: c.border },
          ]}
        >
          <Text style={[styles.cardTitle, { color: c.text }]}>
            {result.employee?.name || "Employee"}
          </Text>
          <Text style={{ color: c.muted, marginBottom: spacing.sm }}>
            {formatTimesheetLabel(
              {
                code: result.timesheet?.code,
                id: result.timesheet?.timesheet_id,
              },
              { prefix: true },
            )}
            {result.timesheet?.period_start_date
              ? ` · ${result.timesheet.period_start_date} → ${result.timesheet.period_end_date}`
              : ""}
          </Text>

          <View style={styles.actionRow}>
            <TouchableOpacity
              style={[styles.secondaryBtn, { borderColor: c.primary }]}
              disabled={downloadMutation.isPending || !activeRequestId}
              onPress={() => downloadMutation.mutate()}
            >
              {downloadMutation.isPending ? (
                <ActivityIndicator color={c.primary} />
              ) : (
                <Text style={[styles.secondaryBtnText, { color: c.primary }]}>
                  Download PDF
                </Text>
              )}
            </TouchableOpacity>
            <TouchableOpacity
              style={[styles.secondaryBtn, { borderColor: c.primary }]}
              disabled={emailMutation.isPending || !activeRequestId}
              onPress={() => emailMutation.mutate()}
            >
              {emailMutation.isPending ? (
                <ActivityIndicator color={c.primary} />
              ) : (
                <Text style={[styles.secondaryBtnText, { color: c.primary }]}>
                  Email Report
                </Text>
              )}
            </TouchableOpacity>
          </View>

          <View style={styles.totalsGrid}>
            <View style={[styles.stat, { borderColor: c.border }]}>
              <Text style={{ color: c.muted, fontSize: 11 }}>Working</Text>
              <Text style={[styles.statValue, { color: c.text }]}>
                {formatHours(result.totals?.working_hours ?? 0)}
              </Text>
            </View>
            <View style={[styles.stat, { borderColor: c.border }]}>
              <Text style={{ color: c.muted, fontSize: 11 }}>Break</Text>
              <Text style={[styles.statValue, { color: c.text }]}>
                {formatHours(result.totals?.break_hours ?? 0)}
              </Text>
            </View>
            <View style={[styles.stat, { borderColor: c.border }]}>
              <Text style={{ color: c.muted, fontSize: 11 }}>Travel</Text>
              <Text style={[styles.statValue, { color: c.text }]}>
                {formatHours(result.totals?.travel_hours ?? 0)}
              </Text>
            </View>
            <View style={[styles.stat, { borderColor: c.border }]}>
              <Text style={{ color: c.muted, fontSize: 11 }}>Pay cycle</Text>
              <Text style={[styles.statValue, { color: c.primary }]}>
                {formatMoney(
                  result.pay_cycle?.total_amount ?? result.totals?.amount,
                  currency,
                )}
              </Text>
            </View>
            <View style={[styles.stat, { borderColor: c.border }]}>
              <Text style={{ color: c.muted, fontSize: 11 }}>Payment</Text>
              <Text style={[styles.statValue, { color: c.text }]}>
                {result.pay_cycle?.paid_label ||
                  (result.pay_cycle?.is_paid ? "Paid" : "Not paid")}
              </Text>
            </View>
          </View>

          <Text style={[styles.cardTitle, { color: c.text, marginTop: spacing.md }]}>
            Daily breakdown
          </Text>
          {(result.days || []).length === 0 ? (
            <Text style={{ color: c.muted }}>No day rows</Text>
          ) : (
            (result.days || []).map((d) => (
              <View
                key={String(d.date)}
                style={[styles.dayRow, { borderColor: c.border }]}
              >
                <Text style={[styles.dayTitle, { color: c.text }]}>
                  {d.date}
                  {d.day_name ? ` · ${d.day_name}` : ""}
                  {d.is_public_holiday ? " · PH" : ""}
                </Text>
                <Text style={{ color: c.muted, fontSize: 12 }}>
                  In {formatDisplayTime(d.clock_in)} · Out{" "}
                  {formatDisplayTime(d.clock_out)}
                </Text>
                <Text style={{ color: c.text, fontSize: 13, marginTop: 4 }}>
                  Work {formatHours(d.working_hours ?? 0)} · Break{" "}
                  {formatHours(d.break_hours ?? 0)} · Travel{" "}
                  {formatHours(d.travel_hours ?? 0)}
                </Text>
                <Text style={{ color: c.primary, fontWeight: "700", marginTop: 4 }}>
                  {formatMoney(d.amount, currency)}
                </Text>
              </View>
            ))
          )}
        </View>
      ) : null}

      <View
        style={[
          styles.card,
          { backgroundColor: c.surface, borderColor: c.border },
        ]}
      >
        <Text style={[styles.cardTitle, { color: c.text }]}>History</Text>
        {historyQuery.isLoading && requestItems.length === 0 ? (
          <ActivityIndicator color={c.primary} />
        ) : requestItems.length === 0 ? (
          <Text style={{ color: c.muted }}>No previous reports</Text>
        ) : (
          requestItems.map((item) => {
            const selected = String(item.id) === activeRequestId;
            return (
              <TouchableOpacity
                key={item.id}
                style={[
                  styles.historyItem,
                  {
                    borderColor: selected ? c.primary : c.border,
                    backgroundColor: c.bg,
                  },
                ]}
                onPress={() => setActiveRequestId(String(item.id))}
              >
                <Text style={{ color: c.text, fontWeight: "700" }}>
                  {item.name || `Request #${item.id}`}
                </Text>
                <Text style={{ color: c.muted, marginTop: 2, fontSize: 12 }}>
                  {item.status || "—"}
                  {item.created_at ? ` · ${item.created_at}` : ""}
                </Text>
              </TouchableOpacity>
            );
          })
        )}
        {requestsHasMore ? (
          <TouchableOpacity
            style={{ marginTop: spacing.sm }}
            disabled={historyQuery.isFetching}
            onPress={() => setRequestsPage((p) => p + 1)}
          >
            <Text style={{ color: c.primary, fontWeight: "700" }}>
              {historyQuery.isFetching ? "Loading…" : "Load more"}
            </Text>
          </TouchableOpacity>
        ) : null}
      </View>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: { padding: spacing.lg, paddingBottom: spacing.xxl },
  center: {
    flex: 1,
    alignItems: "center",
    justifyContent: "center",
    padding: spacing.lg,
  },
  title: { fontSize: 22, fontWeight: "700" },
  sub: { marginTop: 4, marginBottom: spacing.lg, fontSize: 13 },
  card: {
    borderRadius: 16,
    borderWidth: 1,
    padding: spacing.md,
    marginBottom: spacing.md,
  },
  cardTitle: { fontSize: 16, fontWeight: "700", marginBottom: spacing.sm },
  label: { fontWeight: "700", marginTop: spacing.sm, marginBottom: 8 },
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
    marginTop: spacing.md,
  },
  buttonText: { color: "#fff", fontWeight: "700", fontSize: 15 },
  statusRow: {
    flexDirection: "row",
    alignItems: "center",
    marginBottom: spacing.md,
  },
  actionRow: { flexDirection: "row", flexWrap: "wrap", gap: 8, marginBottom: spacing.md },
  secondaryBtn: {
    borderWidth: 1.5,
    borderRadius: 12,
    paddingHorizontal: 14,
    paddingVertical: 10,
    minWidth: 120,
    alignItems: "center",
  },
  secondaryBtnText: { fontWeight: "700", fontSize: 13 },
  totalsGrid: { flexDirection: "row", flexWrap: "wrap", gap: 8 },
  stat: {
    borderWidth: 1,
    borderRadius: 12,
    padding: 10,
    minWidth: "45%",
    flexGrow: 1,
  },
  statValue: { marginTop: 4, fontSize: 16, fontWeight: "700" },
  dayRow: {
    borderTopWidth: StyleSheet.hairlineWidth,
    paddingVertical: 10,
  },
  dayTitle: { fontWeight: "700", marginBottom: 2 },
  historyItem: {
    borderWidth: 1,
    borderRadius: 12,
    padding: 12,
    marginBottom: 8,
  },
});
