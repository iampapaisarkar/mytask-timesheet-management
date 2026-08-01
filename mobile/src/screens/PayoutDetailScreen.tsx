import { useCallback } from "react";
import {
  ActivityIndicator,
  Alert,
  ScrollView,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
} from "react-native";
import type { NativeStackScreenProps } from "@react-navigation/native-stack";
import {
  useApprovePayout,
  useCancelPayout,
  useMarkPayoutPaid,
  usePayout,
  useReleasePayout,
  useSubmitPayout,
} from "@mytask/hooks";
import { formatMoney } from "@mytask/constants";
import { can, getOrganisationAcl } from "@mytask/services";
import { spacing } from "@mytask/theme";
import { getErrorMessage } from "@mytask/utils";
import type { RootStackParamList } from "../navigation/RootNavigator";
import { useOrganisationStore } from "../store/organisationStore";
import { useThemeStore } from "../store/themeStore";
import { useToastStore } from "../store/toastStore";

type Props = NativeStackScreenProps<RootStackParamList, "PayoutDetail">;

type StatusLike = string | { code?: string; name?: string } | null | undefined;

type EmployeeLike = {
  id?: number;
  details?: { full_name?: string };
  user?: { full_name?: string };
  wage?: { currency?: string };
};

type PayoutEvent = {
  id?: number;
  action?: string;
  previous_status?: string | null;
  new_status?: string | null;
  notes?: string | null;
  created_at?: string;
};

type PayoutDetail = {
  id?: number;
  payout_number?: string | null;
  amount?: number | string | null;
  net_amount?: number | string | null;
  gross_amount?: number | string | null;
  deductions?: number | string | null;
  bonuses?: number | string | null;
  adjustments?: number | string | null;
  tax_amount?: number | string | null;
  worked_hours?: number | string | null;
  overtime_hours?: number | string | null;
  hourly_rate?: number | string | null;
  currency?: string | null;
  status?: StatusLike;
  pay_date?: string | null;
  paid_at?: string | null;
  notes?: string | null;
  period_start_date?: string | null;
  period_end_date?: string | null;
  employee?: EmployeeLike;
  events?: PayoutEvent[];
};

function employeeName(employee?: EmployeeLike) {
  return (
    employee?.details?.full_name ||
    employee?.user?.full_name ||
    (employee?.id != null ? `#${employee.id}` : "—")
  );
}

function statusCode(status?: StatusLike): string {
  if (!status) return "";
  if (typeof status === "string") return status;
  return status.code || status.name || "";
}

function normalizeStatus(status?: string | null): string {
  if (!status) return "";
  if (status === "ELIGIBLE") return "READY_FOR_PAYOUT";
  if (status === "VOID") return "CANCELLED";
  return status;
}

function statusLabel(status?: StatusLike): string {
  const code = normalizeStatus(statusCode(status));
  const labels: Record<string, string> = {
    DRAFT: "Draft",
    PENDING_APPROVAL: "Pending approval",
    APPROVED: "Approved",
    READY_FOR_PAYOUT: "Ready for payout",
    PAID: "Paid",
    CANCELLED: "Cancelled",
  };
  return labels[code] || code || "—";
}

function formatAmount(
  amount: number | string | null | undefined,
  currency?: string | null,
) {
  if (amount == null || amount === "") return "—";
  return formatMoney(Number(amount), currency || "AUD");
}

function DetailRow({
  label,
  value,
  muted,
  text,
}: {
  label: string;
  value: string;
  muted: string;
  text: string;
}) {
  return (
    <View style={styles.detailRow}>
      <Text style={[styles.detailLabel, { color: muted }]}>{label}</Text>
      <Text style={[styles.detailValue, { color: text }]}>{value}</Text>
    </View>
  );
}

export function PayoutDetailScreen({ navigation, route }: Props) {
  const { orgCode, id } = route.params;
  const organisation = useOrganisationStore((s) => s.organisation);
  const role = organisation?.role || organisation?.role_code;
  const acl = getOrganisationAcl(role);
  const canEdit =
    can(acl, "payout", "edit") || can(acl, "payout", "list");
  const c = useThemeStore((s) => s.colors);
  const toast = useToastStore();

  const detailQuery = usePayout(id, true);
  const selected = detailQuery.data as PayoutDetail | undefined;

  const submitMutation = useSubmitPayout();
  const approveMutation = useApprovePayout();
  const releaseMutation = useReleasePayout();
  const markPaidMutation = useMarkPayoutPaid();
  const cancelMutation = useCancelPayout();

  const actionPending =
    submitMutation.isPending ||
    approveMutation.isPending ||
    releaseMutation.isPending ||
    markPaidMutation.isPending ||
    cancelMutation.isPending;

  const runAction = useCallback(
    async (label: string, fn: () => Promise<unknown>) => {
      try {
        await fn();
        toast.success(label);
        void detailQuery.refetch();
      } catch (err) {
        toast.error(label, getErrorMessage(err));
      }
    },
    [detailQuery, toast],
  );

  function confirmCancel(payoutId: number | string) {
    Alert.alert(
      "Cancel payout",
      "Are you sure you want to cancel this payout?",
      [
        { text: "Keep", style: "cancel" },
        {
          text: "Cancel payout",
          style: "destructive",
          onPress: () =>
            void runAction("Payout cancelled", () =>
              cancelMutation.mutateAsync({ id: payoutId }),
            ),
        },
      ],
    );
  }

  function renderActions(row: PayoutDetail) {
    if (!canEdit || row.id == null) return null;
    const s = normalizeStatus(statusCode(row.status));
    const payoutId = row.id;
    return (
      <View style={styles.actions}>
        {s === "DRAFT" ? (
          <TouchableOpacity
            style={[styles.actionBtn, { backgroundColor: c.primary + "22" }]}
            disabled={actionPending}
            onPress={() =>
              void runAction("Submitted for approval", () =>
                submitMutation.mutateAsync({ id: payoutId }),
              )
            }
          >
            <Text style={[styles.actionText, { color: c.primary }]}>Submit</Text>
          </TouchableOpacity>
        ) : null}
        {s === "PENDING_APPROVAL" ? (
          <TouchableOpacity
            style={[styles.actionBtn, { backgroundColor: c.primary + "22" }]}
            disabled={actionPending}
            onPress={() =>
              void runAction("Payout approved", () =>
                approveMutation.mutateAsync({ id: payoutId }),
              )
            }
          >
            <Text style={[styles.actionText, { color: c.primary }]}>
              Approve
            </Text>
          </TouchableOpacity>
        ) : null}
        {s === "APPROVED" ? (
          <TouchableOpacity
            style={[styles.actionBtn, { backgroundColor: c.primary + "22" }]}
            disabled={actionPending}
            onPress={() =>
              void runAction("Ready for payout", () =>
                releaseMutation.mutateAsync({ id: payoutId }),
              )
            }
          >
            <Text style={[styles.actionText, { color: c.primary }]}>
              Release
            </Text>
          </TouchableOpacity>
        ) : null}
        {s === "READY_FOR_PAYOUT" ? (
          <TouchableOpacity
            style={[styles.actionBtn, { backgroundColor: c.primary + "22" }]}
            disabled={actionPending}
            onPress={() =>
              void runAction("Marked as paid", () =>
                markPaidMutation.mutateAsync({ id: payoutId }),
              )
            }
          >
            <Text style={[styles.actionText, { color: c.primary }]}>
              Mark paid
            </Text>
          </TouchableOpacity>
        ) : null}
        {s !== "PAID" && s !== "CANCELLED" ? (
          <TouchableOpacity
            style={[styles.actionBtn, { backgroundColor: c.negative + "18" }]}
            disabled={actionPending}
            onPress={() => confirmCancel(payoutId)}
          >
            <Text style={[styles.actionText, { color: c.negative }]}>
              Cancel
            </Text>
          </TouchableOpacity>
        ) : null}
      </View>
    );
  }

  if (detailQuery.isLoading) {
    return (
      <View style={[styles.center, { backgroundColor: c.bg }]}>
        <ActivityIndicator color={c.primary} />
      </View>
    );
  }

  if (detailQuery.isError || !selected) {
    return (
      <View style={[styles.center, { backgroundColor: c.bg }]}>
        <Text style={{ color: c.text }}>
          {detailQuery.isError
            ? getErrorMessage(detailQuery.error)
            : "Payout not found"}
        </Text>
        <TouchableOpacity onPress={() => navigation.goBack()}>
          <Text style={{ color: c.primary, marginTop: 12, fontWeight: "700" }}>
            Back
          </Text>
        </TouchableOpacity>
      </View>
    );
  }

  const currency =
    selected.currency || selected.employee?.wage?.currency || "AUD";
  const period =
    selected.period_start_date && selected.period_end_date
      ? `${selected.period_start_date} → ${selected.period_end_date}`
      : "—";

  return (
    <ScrollView
      style={{ flex: 1, backgroundColor: c.bg }}
      contentContainerStyle={styles.container}
    >
      <Text style={[styles.title, { color: c.text }]}>Payout detail</Text>
      <Text style={[styles.sub, { color: c.muted }]}>
        Snapshot amounts, hours, and audit trail · {orgCode}
      </Text>

      <View
        style={[
          styles.card,
          { backgroundColor: c.surface, borderColor: c.border },
        ]}
      >
        <DetailRow
          label="Payout #"
          value={selected.payout_number || `#${selected.id}`}
          muted={c.muted}
          text={c.text}
        />
        <DetailRow
          label="Employee"
          value={employeeName(selected.employee)}
          muted={c.muted}
          text={c.text}
        />
        <DetailRow label="Period" value={period} muted={c.muted} text={c.text} />
        <DetailRow
          label="Status"
          value={statusLabel(selected.status)}
          muted={c.muted}
          text={c.text}
        />
        <DetailRow
          label="Pay date"
          value={selected.pay_date || selected.paid_at || "—"}
          muted={c.muted}
          text={c.text}
        />
        <DetailRow
          label="Worked / OT"
          value={`${selected.worked_hours ?? "—"}h / ${selected.overtime_hours ?? "—"}h`}
          muted={c.muted}
          text={c.text}
        />
        <DetailRow
          label="Hourly rate"
          value={formatAmount(selected.hourly_rate, currency)}
          muted={c.muted}
          text={c.text}
        />
        <DetailRow
          label="Gross"
          value={formatAmount(selected.gross_amount, currency)}
          muted={c.muted}
          text={c.text}
        />
        <DetailRow
          label="Deductions / Bonuses / Adj / Tax"
          value={`${formatAmount(selected.deductions, currency)} / ${formatAmount(selected.bonuses, currency)} / ${formatAmount(selected.adjustments, currency)} / ${formatAmount(selected.tax_amount, currency)}`}
          muted={c.muted}
          text={c.text}
        />
        <DetailRow
          label="Net"
          value={formatAmount(selected.net_amount ?? selected.amount, currency)}
          muted={c.muted}
          text={c.text}
        />
        <DetailRow
          label="Notes"
          value={selected.notes || "—"}
          muted={c.muted}
          text={c.text}
        />
        {renderActions(selected)}
      </View>

      <Text style={[styles.auditTitle, { color: c.text }]}>Audit trail</Text>
      {(selected.events || []).length === 0 ? (
        <Text style={{ color: c.muted }}>No events recorded yet</Text>
      ) : (
        (selected.events || []).map((ev) => (
          <View
            key={String(ev.id)}
            style={[
              styles.eventCard,
              { backgroundColor: c.surface, borderColor: c.border },
            ]}
          >
            <Text style={[styles.eventAction, { color: c.text }]}>
              {ev.action}
              {ev.previous_status || ev.new_status
                ? ` · ${ev.previous_status || "—"} → ${ev.new_status || "—"}`
                : ""}
            </Text>
            <Text style={{ color: c.muted, fontSize: 12, marginTop: 4 }}>
              {ev.created_at || ""}
              {ev.notes ? ` · ${ev.notes}` : ""}
            </Text>
          </View>
        ))
      )}
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
  },
  detailRow: {
    paddingVertical: 10,
    borderBottomWidth: StyleSheet.hairlineWidth,
    borderBottomColor: "rgba(128,128,128,0.25)",
  },
  detailLabel: {
    fontSize: 11,
    fontWeight: "700",
    textTransform: "uppercase",
    letterSpacing: 0.4,
    marginBottom: 4,
  },
  detailValue: { fontSize: 14, lineHeight: 20 },
  actions: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: 8,
    marginTop: spacing.md,
  },
  actionBtn: {
    borderRadius: 10,
    paddingHorizontal: 12,
    paddingVertical: 8,
  },
  actionText: { fontWeight: "700", fontSize: 12 },
  auditTitle: {
    fontSize: 16,
    fontWeight: "700",
    marginTop: spacing.lg,
    marginBottom: spacing.sm,
  },
  eventCard: {
    borderRadius: 12,
    borderWidth: 1,
    padding: spacing.md,
    marginBottom: spacing.sm,
  },
  eventAction: { fontWeight: "600", fontSize: 14 },
});
