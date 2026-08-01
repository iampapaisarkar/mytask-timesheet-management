import { useEffect, useState } from "react";
import {
  ActivityIndicator,
  Platform,
  Share,
  StyleSheet,
  Text,
  View,
} from "react-native";
import type { NativeStackScreenProps } from "@react-navigation/native-stack";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { reportsApi } from "@mytask/api";
import { formatHours, formatMoney } from "@mytask/constants";
import { can, getOrganisationAcl } from "@mytask/services";
import { spacing, typography } from "@mytask/theme";
import {
  formatDisplayTime,
  formatTimesheetLabel,
  getErrorMessage,
} from "@mytask/utils";
import type { MoreStackParamList } from "../navigation/types";
import { AccessDenied } from "../components/AccessDenied";
import { SkeletonList } from "../components/Skeleton";
import { MobileSelect } from "../components/MobileSelect";
import { FormKeyboardScroll } from "../components/FormKeyboardScroll";
import { useOrganisationStore } from "../store/organisationStore";
import { useThemeStore } from "../store/themeStore";
import { useToastStore } from "../store/toastStore";
import {
  Button,
  Card,
  Divider,
  ScreenHeader,
  SectionHeader,
  StatCard,
} from "../ui";

type Props = NativeStackScreenProps<MoreStackParamList, "Reports">;

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
    return <AccessDenied />;
  }

  const processing =
    activeStatus.data &&
    !["completed", "failed"].includes(activeStatus.data.status || "");

  const currency = result?.currency || result?.pay_cycle?.currency || "AUD";

  return (
    <FormKeyboardScroll contentContainerStyle={styles.container}>
      <ScreenHeader
        title="Reports"
        subtitle="Generate a pay report for one approved timesheet, then download or email the PDF."
      />

      <Card style={styles.card}>
        <SectionHeader title="Generate report" />

        {employeesQuery.isLoading ? (
          <SkeletonList rows={2} />
        ) : (
          <MobileSelect
            label="Employee"
            value={employeeId}
            options={employees.map((emp) => ({
              value: String(emp.id),
              label: `${emp.full_name || emp.email || `Employee #${emp.id}`}${
                emp.is_you ? " (You)" : ""
              }`,
              hint: emp.email || undefined,
            }))}
            onChange={(id) => {
              setEmployeeId(id);
              setTimesheetId("");
              setActiveRequestId(null);
            }}
            disabled={isStaff && employees.length === 1}
            placeholder="Select employee"
          />
        )}

        {!employeeId ? (
          <Text style={{ color: c.muted, marginBottom: spacing.md }}>
            Select an employee first
          </Text>
        ) : timesheetsQuery.isLoading ? (
          <SkeletonList rows={2} />
        ) : timesheets.length === 0 ? (
          <Text style={{ color: c.muted, marginBottom: spacing.md }}>
            No approved timesheets for this employee. Only approved timesheets
            can generate a report.
          </Text>
        ) : (
          <MobileSelect
            label="Approved timesheet"
            value={timesheetId}
            options={timesheets.map((ts) => ({
              value: String(ts.id),
              label: formatTimesheetLabel({ code: ts.code, id: ts.id }),
              hint: [
                ts.period_range,
                ts.jobs?.length
                  ? ts.jobs.map((j) => j.name).filter(Boolean).join(", ")
                  : null,
              ]
                .filter(Boolean)
                .join(" · "),
            }))}
            onChange={(id) => {
              setTimesheetId(id);
              setActiveRequestId(null);
            }}
            placeholder="Select timesheet"
          />
        )}

        {canCreate ? (
          <Button
            title="Generate report"
            onPress={handleGenerate}
            loading={createMutation.isPending}
            disabled={
              createMutation.isPending || !employeeId || !timesheetId
            }
            style={styles.generateBtn}
          />
        ) : null}

        {activeStatus.data ? (
          <Text style={{ color: c.muted, marginTop: spacing.sm }}>
            Status: {activeStatus.data.status}
            {activeStatus.data.progress != null
              ? ` · ${activeStatus.data.progress}%`
              : ""}
          </Text>
        ) : null}
      </Card>

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
        <Card style={styles.card}>
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
            <Button
              title="Download PDF"
              variant="outline"
              fullWidth={false}
              loading={downloadMutation.isPending}
              disabled={!activeRequestId}
              onPress={() => downloadMutation.mutate()}
            />
            <Button
              title="Email Report"
              variant="outline"
              fullWidth={false}
              loading={emailMutation.isPending}
              disabled={!activeRequestId}
              onPress={() => emailMutation.mutate()}
            />
          </View>

          <View style={styles.totalsGrid}>
            <StatCard
              label="Working"
              value={formatHours(result.totals?.working_hours ?? 0)}
            />
            <StatCard
              label="Break"
              value={formatHours(result.totals?.break_hours ?? 0)}
            />
            <StatCard
              label="Travel"
              value={formatHours(result.totals?.travel_hours ?? 0)}
            />
            <StatCard
              label="Pay cycle"
              value={formatMoney(
                result.pay_cycle?.total_amount ?? result.totals?.amount,
                currency,
              )}
              accent={c.primary}
            />
            <StatCard
              label="Payment"
              value={
                result.pay_cycle?.paid_label ||
                (result.pay_cycle?.is_paid ? "Paid" : "Not paid")
              }
            />
          </View>

          <SectionHeader title="Daily breakdown" />
          {(result.days || []).length === 0 ? (
            <Text style={{ color: c.muted }}>No day rows</Text>
          ) : (
            (result.days || []).map((d, idx) => (
              <View key={String(d.date)}>
                {idx > 0 ? <Divider /> : null}
                <View style={styles.dayRow}>
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
                  <Text
                    style={{ color: c.primary, fontWeight: "700", marginTop: 4 }}
                  >
                    {formatMoney(d.amount, currency)}
                  </Text>
                </View>
              </View>
            ))
          )}
        </Card>
      ) : null}

      <Card style={styles.card}>
        <SectionHeader title="History" />
        {historyQuery.isLoading && requestItems.length === 0 ? (
          <SkeletonList rows={3} />
        ) : requestItems.length === 0 ? (
          <Text style={{ color: c.muted }}>No previous reports</Text>
        ) : (
          requestItems.map((item) => {
            const selected = String(item.id) === activeRequestId;
            return (
              <Card
                key={item.id}
                style={[
                  styles.historyItem,
                  selected ? { borderColor: c.primary } : null,
                ]}
                accentBorder={selected ? c.primary : undefined}
                onPress={() => setActiveRequestId(String(item.id))}
              >
                <Text style={{ color: c.text, fontWeight: "700" }}>
                  {item.name || `Request #${item.id}`}
                </Text>
                <Text style={{ color: c.muted, marginTop: 2, fontSize: 12 }}>
                  {item.status || "—"}
                  {item.created_at ? ` · ${item.created_at}` : ""}
                </Text>
              </Card>
            );
          })
        )}
        {requestsHasMore ? (
          <Button
            title={historyQuery.isFetching ? "Loading…" : "Load more"}
            variant="ghost"
            disabled={historyQuery.isFetching}
            onPress={() => setRequestsPage((p) => p + 1)}
            style={styles.loadMoreBtn}
          />
        ) : null}
      </Card>
    </FormKeyboardScroll>
  );
}

const styles = StyleSheet.create({
  container: { padding: spacing.lg, paddingBottom: spacing.xxl },
  card: { marginBottom: spacing.md },
  cardTitle: {
    fontSize: typography.sizes.md,
    fontWeight: "700",
    marginBottom: spacing.sm,
  },
  generateBtn: { marginTop: spacing.md },
  statusRow: {
    flexDirection: "row",
    alignItems: "center",
    marginBottom: spacing.md,
  },
  actionRow: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: spacing.sm,
    marginBottom: spacing.md,
  },
  totalsGrid: { flexDirection: "row", flexWrap: "wrap", gap: spacing.sm },
  dayRow: { paddingVertical: 10 },
  dayTitle: { fontWeight: "700", marginBottom: 2 },
  historyItem: { marginBottom: spacing.sm },
  loadMoreBtn: { marginTop: spacing.sm },
});
