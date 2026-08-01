import { useState } from "react";
import {
  FlatList,
  StyleSheet,
  Text,
  TextInput,
  TouchableOpacity,
  View,
} from "react-native";
import type { NativeStackScreenProps } from "@react-navigation/native-stack";
import {
  useApproveTimesheet,
  useRejectTimesheet,
  useRevertTimesheet,
  useSubmitTimesheetManagement,
  useTimesheetManagementItem,
} from "@mytask/hooks";
import { can, getOrganisationAcl } from "@mytask/services";
import { spacing } from "@mytask/theme";
import { formatTimesheetLabel, getErrorMessage } from "@mytask/utils";
import type { ManageStackParamList } from "../navigation/types";
import { AccessDenied } from "../components/AccessDenied";
import { FullScreenSheet } from "../components/FullScreenSheet";
import { SkeletonDetail } from "../components/Skeleton";
import { useOrganisationStore } from "../store/organisationStore";
import { useThemeStore } from "../store/themeStore";
import { useToastStore } from "../store/toastStore";

type Props = NativeStackScreenProps<
  ManageStackParamList,
  "TimesheetManagementDetail"
>;

type TimesheetDay = {
  id?: number;
  date?: string;
  day_name?: string;
  total_hours?: number | string;
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
  const { id, orgCode } = route.params;
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
  const days = Array.isArray(data?.days) ? data.days : [];
  const perms = data?.permissions;
  const employeeName =
    data?.employee?.user?.full_name ||
    data?.employee?.details?.full_name ||
    "Employee";
  const employeeId = data?.employee?.details?.id ?? data?.employee?.id;

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
      <View style={[styles.center, { backgroundColor: c.bg }]}>
        <Text style={{ color: c.text }}>Failed to load timesheet</Text>
        <TouchableOpacity onPress={() => void query.refetch()}>
          <Text style={[styles.link, { color: c.primary }]}>Try again</Text>
        </TouchableOpacity>
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
        <Text style={[styles.title, { color: c.text }]}>
          {formatTimesheetLabel(
            { code: data?.code, id: data?.id ?? id },
            { prefix: true },
          )}
        </Text>
        <Text style={[styles.meta, { color: c.muted }]}>
          {employeeName}
          {data?.period_range
            ? ` · ${data.period_range}`
            : [data?.period_start_date, data?.period_end_date]
                .filter(Boolean)
                .join(" → ")
              ? ` · ${[data?.period_start_date, data?.period_end_date]
                  .filter(Boolean)
                  .join(" → ")}`
              : ""}
        </Text>
        <Text style={[styles.status, { color: c.primary }]}>
          {data?.status?.name || data?.status?.code || "—"}
        </Text>
        {Array.isArray(data?.jobs) && data.jobs.length ? (
          <Text style={{ color: c.muted, marginTop: 4, fontSize: 13 }}>
            {data.jobs.map((j) => j.name).filter(Boolean).join(", ")}
          </Text>
        ) : data?.job?.name ? (
          <Text style={{ color: c.muted, marginTop: 4, fontSize: 13 }}>
            {data.job.name}
          </Text>
        ) : null}

        {existingRemarks ? (
          <View
            style={[
              styles.remarksBox,
              { backgroundColor: c.surface, borderColor: c.border },
            ]}
          >
            <Text style={[styles.remarksLabel, { color: c.muted }]}>
              {existingRemarksLabel}
            </Text>
            <Text style={{ color: c.text }}>{existingRemarks}</Text>
          </View>
        ) : null}

        <View style={styles.actions}>
          {perms?.can_submit ? (
            <ActionBtn
              label="Submit"
              color={c.primary}
              onPress={() => openAction("submit")}
            />
          ) : null}
          {perms?.can_approve ? (
            <ActionBtn
              label="Approve"
              color={c.positive}
              onPress={() => openAction("approve")}
            />
          ) : null}
          {perms?.can_reject ? (
            <ActionBtn
              label="Reject"
              color={c.negative}
              onPress={() => openAction("reject")}
            />
          ) : null}
          {perms?.can_revert_to_draft ? (
            <ActionBtn
              label="Revert"
              color={c.warning}
              onPress={() => openAction("revert")}
            />
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
          <Text style={[styles.empty, { color: c.muted }]}>
            No days on this timesheet
          </Text>
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
              navigation.navigate("TimesheetDayDetail", {
                orgCode,
                timesheetId: id,
                dayId: String(item.id),
                mode: "management",
                employeeId:
                  employeeId != null ? String(employeeId) : undefined,
              });
            }}
          >
            <Text style={[styles.dayTitle, { color: c.text }]}>
              {item.date || "—"}
              {item.day_name ? ` · ${item.day_name}` : ""}
            </Text>
            <Text style={{ color: c.muted }}>
              {item.total_hours != null ? `${item.total_hours} hrs` : "—"}
            </Text>
          </TouchableOpacity>
        )}
      />

      <FullScreenSheet
        open={pendingAction != null}
        onClose={closeAction}
        title={actionTitle}
        footer={
          <View style={styles.footerRow}>
            <TouchableOpacity
              style={[styles.footerBtn, { borderColor: c.border }]}
              onPress={closeAction}
              disabled={actionPending}
            >
              <Text style={{ color: c.text, fontWeight: "700" }}>Cancel</Text>
            </TouchableOpacity>
            <TouchableOpacity
              style={[
                styles.footerBtn,
                styles.footerPrimary,
                {
                  backgroundColor: c.primary,
                  opacity: actionPending ? 0.7 : 1,
                },
              ]}
              disabled={actionPending}
              onPress={() => void confirmAction()}
            >
              <Text style={styles.submitText}>
                {actionPending ? "Working…" : "Confirm"}
              </Text>
            </TouchableOpacity>
          </View>
        }
      >
        <View style={{ padding: spacing.lg }}>
          <Text style={{ color: c.muted, marginBottom: spacing.sm }}>
            Remarks are required before this status change can proceed.
          </Text>
          <Text style={[styles.inputLabel, { color: c.text }]}>Remarks</Text>
          <TextInput
            value={remarks}
            onChangeText={(value) => {
              setRemarks(value);
              if (remarksError) setRemarksError(undefined);
            }}
            placeholder="Enter remarks"
            placeholderTextColor={c.muted}
            multiline
            style={[
              styles.input,
              {
                color: c.text,
                borderColor: remarksError ? c.negative : c.border,
                backgroundColor: c.surface,
              },
            ]}
          />
          {remarksError ? (
            <Text style={{ color: c.negative, marginTop: 8 }}>
              {remarksError}
            </Text>
          ) : null}
        </View>
      </FullScreenSheet>
    </View>
  );
}

function ActionBtn({
  label,
  color,
  onPress,
}: {
  label: string;
  color: string;
  onPress: () => void;
}) {
  return (
    <TouchableOpacity
      onPress={onPress}
      style={[styles.actionBtn, { backgroundColor: color }]}
    >
      <Text style={styles.submitText}>{label}</Text>
    </TouchableOpacity>
  );
}

const styles = StyleSheet.create({
  center: { flex: 1, alignItems: "center", justifyContent: "center" },
  header: { padding: spacing.lg, paddingBottom: spacing.sm },
  title: { fontSize: 22, fontWeight: "700" },
  meta: { marginTop: 4, fontSize: 13 },
  status: { marginTop: 8, fontWeight: "700", fontSize: 13 },
  remarksBox: {
    marginTop: spacing.md,
    borderWidth: 1,
    borderRadius: 14,
    padding: spacing.md,
  },
  remarksLabel: {
    fontSize: 11,
    fontWeight: "700",
    textTransform: "uppercase",
    marginBottom: 6,
  },
  actions: { flexDirection: "row", flexWrap: "wrap", gap: 8, marginTop: 12 },
  actionBtn: {
    borderRadius: 12,
    paddingHorizontal: 14,
    paddingVertical: 10,
  },
  submitText: { color: "#fff", fontWeight: "700" },
  section: {
    fontSize: 15,
    fontWeight: "700",
    marginBottom: spacing.sm,
  },
  card: {
    borderRadius: 16,
    padding: spacing.md,
    marginBottom: spacing.sm,
    borderWidth: 1,
  },
  dayTitle: { fontWeight: "700", marginBottom: 4 },
  empty: { textAlign: "center", marginTop: 24 },
  link: { fontWeight: "700", marginTop: 8 },
  inputLabel: { fontWeight: "600", marginBottom: 8 },
  input: {
    minHeight: 120,
    borderWidth: 1,
    borderRadius: 14,
    paddingHorizontal: 14,
    paddingVertical: 12,
    textAlignVertical: "top",
  },
  footerRow: { flexDirection: "row", gap: 10 },
  footerBtn: {
    flex: 1,
    borderRadius: 14,
    paddingVertical: 14,
    alignItems: "center",
    borderWidth: 1,
  },
  footerPrimary: { borderWidth: 0 },
});
