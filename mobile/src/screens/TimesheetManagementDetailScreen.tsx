import { useEffect, useMemo, useState } from "react";
import { FlatList, StyleSheet, Text, View } from "react-native";
import type { NativeStackScreenProps } from "@react-navigation/native-stack";
import {
  useApproveTimesheet,
  useRejectTimesheet,
  useRevertTimesheet,
  useSubmitTimesheetManagement,
  useTimesheetManagementItem,
} from "@mytask/hooks";
import { can, getOrganisationAcl } from "@mytask/services";
import { spacing, typography } from "@mytask/theme";
import {
  formatTimesheetLabel,
  getErrorMessage,
  sumOpenAwareTaskHours,
} from "@mytask/utils";
import type { OrgStackParamList } from "../navigation/types";
import { useOrgNavigate } from "../navigation/useOrgNavigate";
import { AccessDenied } from "../components/AccessDenied";
import { FullScreenSheet } from "../components/FullScreenSheet";
import { SkeletonDetail } from "../components/Skeleton";
import { useLiveClock } from "../hooks/useLiveClock";
import { useLocalTrackingLive } from "../hooks/useLocalTrackingLive";
import { useOrganisationStore } from "../store/organisationStore";
import { useThemeStore } from "../store/themeStore";
import { useToastStore } from "../store/toastStore";
import {
  BriefcaseIcon,
  Button,
  Card,
  ChevronIcon,
  EmptyState,
  ErrorState,
  SheetsIcon,
  StatusBadge,
  TextField,
} from "../ui";

type Props = NativeStackScreenProps<
  OrgStackParamList,
  "TimesheetManagementDetail"
>;

type DayTask = {
  total_hours?: number | string;
  start_time?: string | null;
  end_time?: string | null;
  is_open?: boolean;
};

type TimesheetDay = {
  id?: number;
  date?: string;
  day_name?: string;
  total_hours?: number | string;
  tasks?: DayTask[];
};

type TimesheetDetail = {
  id?: number;
  code?: string;
  period_range?: string;
  period_start_date?: string;
  period_end_date?: string;
  status?: { name?: string; code?: string };
  job?: { id?: number; name?: string } | null;
  jobs?: Array<{ id?: number; name?: string }> | null;
  days?: TimesheetDay[];
  approval_reason?: string | null;
  reject_reason?: string | null;
  permissions?: {
    can_submit?: boolean;
    can_approve?: boolean;
    can_reject?: boolean;
    can_revert_to_draft?: boolean;
    can_save?: boolean;
  };
  employee?: {
    id?: number;
    details?: { id?: number; full_name?: string };
    user?: { full_name?: string };
  };
};

type StatusAction = "submit" | "approve" | "reject" | "revert";

export function TimesheetManagementDetailScreen({ navigation, route }: Props) {
  const { id, orgCode, timesheetCode: codeParam } = route.params;
  const navigateOrg = useOrgNavigate();
  const organisation = useOrganisationStore((s) => s.organisation);
  const role = organisation?.role || organisation?.role_code;
  const acl = getOrganisationAcl(role);
  const canView = can(acl, "timesheetManagement", "view");
  const query = useTimesheetManagementItem(id, canView);
  const submit = useSubmitTimesheetManagement();
  const approve = useApproveTimesheet();
  const reject = useRejectTimesheet();
  const revert = useRevertTimesheet();
  const toast = useToastStore();
  const c = useThemeStore((s) => s.colors);

  const [pendingAction, setPendingAction] = useState<StatusAction | null>(null);
  const [remarks, setRemarks] = useState("");
  const [remarksError, setRemarksError] = useState<string | undefined>();

  const data = query.data as TimesheetDetail | undefined;
  const trackingLive = useLocalTrackingLive();
  const hasOpenSession = useMemo(() => {
    const list = Array.isArray(data?.days) ? data.days : [];
    return list.some((day) =>
      (Array.isArray(day.tasks) ? day.tasks : []).some(
        (t) => t.is_open || (Boolean(t.start_time) && !t.end_time),
      ),
    );
  }, [data?.days]);
  const liveNow = useLiveClock(Boolean(trackingLive || hasOpenSession));
  const days = useMemo(() => {
    const list = Array.isArray(data?.days) ? data.days : [];
    return list.map((day) => {
      const tasks = Array.isArray(day.tasks) ? day.tasks : [];
      if (!tasks.length) return day;
      return {
        ...day,
        total_hours: Number(sumOpenAwareTaskHours(tasks, liveNow).toFixed(2)),
      };
    });
  }, [data?.days, liveNow]);
  const perms = data?.permissions;
  const employeeName =
    data?.employee?.user?.full_name ||
    data?.employee?.details?.full_name ||
    "Employee";
  const employeeId = data?.employee?.details?.id ?? data?.employee?.id;

  const headerCode =
    formatTimesheetLabel(
      { code: data?.code, id: data?.id ?? id },
      { prefix: true },
    ) ||
    codeParam ||
    formatTimesheetLabel({ id });

  useEffect(() => {
    navigation.setOptions({ title: headerCode });
  }, [headerCode, navigation]);

  useEffect(() => {
    if (!trackingLive) return;
    const id = globalThis.setInterval(() => {
      void query.refetch();
    }, 5_000);
    return () => globalThis.clearInterval(id);
  }, [trackingLive, query]);

  const jobsLabel =
    Array.isArray(data?.jobs) && data.jobs.length
      ? data.jobs.map((j) => j.name).filter(Boolean).join(", ")
      : data?.job?.name || "";

  const existingRemarks =
    (data?.reject_reason || data?.approval_reason || "").trim() || null;
  const existingRemarksLabel = data?.reject_reason
    ? "Reject remarks"
    : data?.approval_reason
      ? "Approval remarks"
      : "Remarks";

  const actionPending =
    submit.isPending ||
    approve.isPending ||
    reject.isPending ||
    revert.isPending;

  function openAction(action: StatusAction) {
    setPendingAction(action);
    setRemarks("");
    setRemarksError(undefined);
  }

  function closeAction() {
    setPendingAction(null);
    setRemarks("");
    setRemarksError(undefined);
  }

  async function confirmAction() {
    const trimmed = remarks.trim();
    if (!trimmed) {
      setRemarksError("Remarks are required.");
      return;
    }
    if (employeeId == null || !pendingAction) {
      toast.error("Missing employee", "Employee id required for this action");
      return;
    }
    try {
      if (pendingAction === "submit") {
        await submit.mutateAsync({ id, employeeId, remarks: trimmed });
        toast.success("Submitted");
      } else if (pendingAction === "approve") {
        await approve.mutateAsync({ id, employeeId, reason: trimmed });
        toast.success("Approved");
      } else if (pendingAction === "reject") {
        await reject.mutateAsync({ id, employeeId, reason: trimmed });
        toast.success("Rejected");
      } else if (pendingAction === "revert") {
        await revert.mutateAsync({ id, employeeId, remarks: trimmed });
        toast.success("Reverted", "Timesheet returned to draft");
      }
      closeAction();
      void query.refetch();
    } catch (err) {
      toast.error("Action failed", getErrorMessage(err));
    }
  }

  if (!canView) {
    return <AccessDenied />;
  }

  if (query.isLoading) {
    return (
      <View style={{ flex: 1, backgroundColor: c.bg }}>
        <SkeletonDetail />
      </View>
    );
  }

  if (query.isError) {
    return (
      <View style={[styles.flex, { backgroundColor: c.bg }]}>
        <ErrorState
          title="Failed to load timesheet"
          onRetry={() => void query.refetch()}
        />
      </View>
    );
  }

  const actionTitle =
    pendingAction === "approve"
      ? "Approve timesheet"
      : pendingAction === "reject"
        ? "Reject timesheet"
        : pendingAction === "revert"
          ? "Revert to draft"
          : "Submit timesheet";

  return (
    <View style={{ flex: 1, backgroundColor: c.bg }}>
      <View style={styles.header}>
        <Text style={[styles.pageSub, { color: c.muted }]}>
          {`${employeeName}${
            data?.period_range ? ` · ${data.period_range}` : ""
          }`}
        </Text>

        <View style={styles.metaRow}>
          <StatusBadge status={data?.status} size="md" />
          {jobsLabel ? (
            <View style={styles.jobRow}>
              <BriefcaseIcon color={c.subtle} size={14} />
              <Text style={[styles.jobText, { color: c.muted }]} numberOfLines={1}>
                {jobsLabel}
              </Text>
            </View>
          ) : null}
        </View>

        {existingRemarks ? (
          <Card style={styles.remarksCard}>
            <Text style={[styles.remarksLabel, { color: c.muted }]}>
              {existingRemarksLabel}
            </Text>
            <Text style={{ color: c.text }}>{existingRemarks}</Text>
          </Card>
        ) : null}

        <View style={styles.actions}>
          {perms?.can_submit ? (
            <View style={styles.actionItem}>
              <Button
                title="Submit"
                fullWidth={false}
                onPress={() => openAction("submit")}
              />
            </View>
          ) : null}
          {perms?.can_approve ? (
            <View style={styles.actionItem}>
              <Button
                title="Approve"
                fullWidth={false}
                style={{ backgroundColor: c.positive, borderColor: c.positive }}
                onPress={() => openAction("approve")}
              />
            </View>
          ) : null}
          {perms?.can_reject ? (
            <View style={styles.actionItem}>
              <Button
                title="Reject"
                variant="danger"
                fullWidth={false}
                onPress={() => openAction("reject")}
              />
            </View>
          ) : null}
          {perms?.can_revert_to_draft ? (
            <View style={styles.actionItem}>
              <Button
                title="Revert"
                variant="outline"
                fullWidth={false}
                style={{ borderColor: c.warning }}
                onPress={() => openAction("revert")}
              />
            </View>
          ) : null}
        </View>
      </View>

      <FlatList
        data={days}
        keyExtractor={(item, index) => String(item.id ?? item.date ?? index)}
        showsHorizontalScrollIndicator={false}
        contentContainerStyle={{ padding: spacing.md, paddingTop: 0 }}
        ListHeaderComponent={
          <Text style={[styles.section, { color: c.text }]}>Days</Text>
        }
        ListEmptyComponent={
          <EmptyState
            icon={<SheetsIcon color={c.primary} size={28} />}
            title="No days on this timesheet"
          />
        }
        renderItem={({ item }) => (
          <Card
            style={styles.dayCard}
            onPress={
              item.id == null
                ? undefined
                : () => {
                    navigateOrg("TimesheetDayDetail", {
                      orgCode,
                      timesheetId: id,
                      dayId: String(item.id),
                      mode: "management",
                      employeeId:
                        employeeId != null ? String(employeeId) : undefined,
                      timesheetCode: formatTimesheetLabel({
                        code: data?.code,
                        id: data?.id ?? id,
                      }),
                    });
                  }
            }
            accessibilityLabel={`Day ${item.date || ""}`}
          >
            <View style={styles.dayRow}>
              <View style={styles.dayTextCol}>
                <Text style={[styles.dayTitle, { color: c.text }]}>
                  {item.date || "—"}
                  {item.day_name ? ` · ${item.day_name}` : ""}
                </Text>
                <Text style={{ color: c.muted, marginTop: 2 }}>
                  {item.total_hours != null ? `${item.total_hours} hrs` : "—"}
                </Text>
              </View>
              {item.id != null ? <ChevronIcon color={c.subtle} /> : null}
            </View>
          </Card>
        )}
      />

      <FullScreenSheet
        open={pendingAction != null}
        onClose={closeAction}
        title={actionTitle}
        footer={
          <View style={styles.footerRow}>
            <View style={styles.footerHalf}>
              <Button
                title="Cancel"
                variant="outline"
                onPress={closeAction}
                disabled={actionPending}
              />
            </View>
            <View style={styles.footerHalf}>
              <Button
                title={actionPending ? "Working…" : "Confirm"}
                onPress={() => void confirmAction()}
                loading={actionPending}
              />
            </View>
          </View>
        }
      >
        <View style={{ padding: spacing.lg }}>
          <Text style={{ color: c.muted, marginBottom: spacing.md }}>
            Remarks are required before this status change can proceed.
          </Text>
          <TextField
            label="Remarks"
            value={remarks}
            onChangeText={(value) => {
              setRemarks(value);
              if (remarksError) setRemarksError(undefined);
            }}
            placeholder="Enter remarks"
            multiline
            numberOfLines={5}
            style={styles.textArea}
            error={remarksError}
          />
        </View>
      </FullScreenSheet>
    </View>
  );
}

const styles = StyleSheet.create({
  flex: { flex: 1 },
  header: { padding: spacing.lg, paddingBottom: spacing.sm },
  pageSub: {
    fontSize: typography.sizes.sm,
    fontWeight: "500",
    marginBottom: 4,
  },
  metaRow: {
    flexDirection: "row",
    alignItems: "center",
    flexWrap: "wrap",
    gap: spacing.sm,
    marginTop: 4,
  },
  jobRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
    flexShrink: 1,
  },
  jobText: {
    fontSize: typography.sizes.sm,
    fontWeight: "500",
  },
  remarksCard: { marginTop: spacing.md },
  remarksLabel: {
    fontSize: 11,
    fontWeight: "700",
    textTransform: "uppercase",
    letterSpacing: 0.4,
    marginBottom: 6,
  },
  actions: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: spacing.sm,
    marginTop: spacing.md,
  },
  actionItem: {},
  section: {
    fontSize: 15,
    fontWeight: "700",
    marginBottom: spacing.sm,
  },
  dayCard: { marginBottom: spacing.sm },
  dayRow: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    gap: spacing.sm,
  },
  dayTextCol: { flex: 1, minWidth: 0 },
  dayTitle: { fontWeight: "700" },
  footerRow: { flexDirection: "row", gap: spacing.sm },
  footerHalf: { flex: 1 },
  textArea: { minHeight: 120, textAlignVertical: "top", paddingTop: 12 },
});
