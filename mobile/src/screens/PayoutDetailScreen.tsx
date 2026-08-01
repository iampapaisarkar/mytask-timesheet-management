import { useCallback, useState } from "react";
import { ScrollView, StyleSheet, Text, View } from "react-native";
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
import { spacing, typography } from "@mytask/theme";
import { getErrorMessage } from "@mytask/utils";
import type { OrgStackParamList } from "../navigation/types";
import { AccessDenied } from "../components/AccessDenied";
import { SkeletonDetail } from "../components/Skeleton";
import { useOrganisationStore } from "../store/organisationStore";
import { useThemeStore } from "../store/themeStore";
import { useToastStore } from "../store/toastStore";
import {
  Button,
  Card,
  Dialog,
  Divider,
  ErrorState,
  ScreenHeader,
  StatCard,
  StatusBadge,
} from "../ui";

type Props = NativeStackScreenProps<OrgStackParamList, "PayoutDetail">;

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
  const canView =
    can(acl, "payout", "view") || can(acl, "payout", "list");
  const canEdit = can(acl, "payout", "edit");
  const c = useThemeStore((s) => s.colors);
  const toast = useToastStore();

  const [cancelTarget, setCancelTarget] = useState<number | string | null>(
    null,
  );

  const detailQuery = usePayout(id, canView);
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

  async function confirmCancel() {
    if (cancelTarget == null) return;
    await runAction("Payout cancelled", () =>
      cancelMutation.mutateAsync({ id: cancelTarget }),
    );
    setCancelTarget(null);
  }

  function renderActions(row: PayoutDetail) {
    if (!canEdit || row.id == null) return null;
    const s = normalizeStatus(statusCode(row.status));
    const payoutId = row.id;
    return (
      <View style={styles.actions}>
        {s === "DRAFT" ? (
          <Button
            title="Submit"
            variant="soft"
            fullWidth={false}
            disabled={actionPending}
            onPress={() =>
              void runAction("Submitted for approval", () =>
                submitMutation.mutateAsync({ id: payoutId }),
              )
            }
          />
        ) : null}
        {s === "PENDING_APPROVAL" ? (
          <Button
            title="Approve"
            variant="soft"
            fullWidth={false}
            disabled={actionPending}
            onPress={() =>
              void runAction("Payout approved", () =>
                approveMutation.mutateAsync({ id: payoutId }),
              )
            }
          />
        ) : null}
        {s === "APPROVED" ? (
          <Button
            title="Release"
            variant="soft"
            fullWidth={false}
            disabled={actionPending}
            onPress={() =>
              void runAction("Ready for payout", () =>
                releaseMutation.mutateAsync({ id: payoutId }),
              )
            }
          />
        ) : null}
        {s === "READY_FOR_PAYOUT" ? (
          <Button
            title="Mark paid"
            variant="soft"
            fullWidth={false}
            disabled={actionPending}
            onPress={() =>
              void runAction("Marked as paid", () =>
                markPaidMutation.mutateAsync({ id: payoutId }),
              )
            }
          />
        ) : null}
        {s !== "PAID" && s !== "CANCELLED" ? (
          <Button
            title="Cancel"
            variant="danger"
            fullWidth={false}
            disabled={actionPending}
            onPress={() => setCancelTarget(payoutId)}
          />
        ) : null}
      </View>
    );
  }

  if (!canView) {
    return <AccessDenied />;
  }

  if (detailQuery.isLoading) {
    return (
      <View style={{ flex: 1, backgroundColor: c.bg }}>
        <SkeletonDetail />
      </View>
    );
  }

  if (detailQuery.isError || !selected) {
    return (
      <View style={[styles.flex, { backgroundColor: c.bg }]}>
        <ErrorState
          title={detailQuery.isError ? "Failed to load payout" : "Payout not found"}
          description={
            detailQuery.isError ? getErrorMessage(detailQuery.error) : undefined
          }
          onRetry={() => navigation.goBack()}
          retryLabel="Back"
        />
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
      <ScreenHeader
        title="Payout detail"
        subtitle={`Snapshot amounts, hours, and audit trail · ${orgCode}`}
      />

      <Card style={styles.summaryCard}>
        <View style={styles.summaryTop}>
          <View style={{ flex: 1, minWidth: 0 }}>
            <Text style={[styles.payoutNumber, { color: c.text }]} numberOfLines={1}>
              {selected.payout_number || `#${selected.id}`}
            </Text>
            <Text style={{ color: c.muted, marginTop: 2 }} numberOfLines={1}>
              {employeeName(selected.employee)}
            </Text>
          </View>
          <StatusBadge
            status={normalizeStatus(statusCode(selected.status))}
            label={statusLabel(selected.status)}
            size="md"
          />
        </View>
        <Text style={[styles.netAmount, { color: c.primary }]}>
          {formatAmount(selected.net_amount ?? selected.amount, currency)}
        </Text>
        <Text style={{ color: c.muted, fontSize: typography.sizes.xs }}>
          {period} · Pay date {selected.pay_date || selected.paid_at || "—"}
        </Text>
        {renderActions(selected)}
      </Card>

      <View style={styles.statsGrid}>
        <StatCard label="Worked hours" value={`${selected.worked_hours ?? "—"}h`} />
        <StatCard label="Overtime" value={`${selected.overtime_hours ?? "—"}h`} />
        <StatCard
          label="Hourly rate"
          value={formatAmount(selected.hourly_rate, currency)}
        />
        <StatCard label="Gross" value={formatAmount(selected.gross_amount, currency)} />
      </View>

      <Card style={styles.card}>
        <DetailRow
          label="Deductions"
          value={formatAmount(selected.deductions, currency)}
          muted={c.muted}
          text={c.text}
        />
        <Divider />
        <DetailRow
          label="Bonuses"
          value={formatAmount(selected.bonuses, currency)}
          muted={c.muted}
          text={c.text}
        />
        <Divider />
        <DetailRow
          label="Adjustments"
          value={formatAmount(selected.adjustments, currency)}
          muted={c.muted}
          text={c.text}
        />
        <Divider />
        <DetailRow
          label="Tax"
          value={formatAmount(selected.tax_amount, currency)}
          muted={c.muted}
          text={c.text}
        />
        <Divider />
        <DetailRow
          label="Notes"
          value={selected.notes || "—"}
          muted={c.muted}
          text={c.text}
        />
      </Card>

      <Text style={[styles.auditTitle, { color: c.text }]}>Audit trail</Text>
      {(selected.events || []).length === 0 ? (
        <Text style={{ color: c.muted }}>No events recorded yet</Text>
      ) : (
        (selected.events || []).map((ev) => (
          <Card key={String(ev.id)} style={styles.eventCard}>
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
          </Card>
        ))
      )}

      <Dialog
        visible={cancelTarget != null}
        title="Cancel payout"
        message="Are you sure you want to cancel this payout?"
        confirmLabel="Cancel payout"
        cancelLabel="Keep"
        destructive
        loading={cancelMutation.isPending}
        onConfirm={() => void confirmCancel()}
        onCancel={() => setCancelTarget(null)}
      />
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  flex: { flex: 1 },
  container: { padding: spacing.lg, paddingBottom: spacing.xxl },
  summaryCard: { marginBottom: spacing.md },
  summaryTop: {
    flexDirection: "row",
    alignItems: "flex-start",
    justifyContent: "space-between",
    gap: spacing.sm,
  },
  payoutNumber: { fontSize: typography.sizes.lg, fontWeight: "700" },
  netAmount: {
    fontSize: 30,
    fontWeight: "800",
    letterSpacing: -0.5,
    marginTop: spacing.sm,
  },
  actions: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: spacing.sm,
    marginTop: spacing.md,
  },
  statsGrid: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: spacing.sm,
    marginBottom: spacing.md,
  },
  card: { marginBottom: spacing.md },
  detailRow: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    paddingVertical: 10,
    gap: spacing.sm,
  },
  detailLabel: {
    fontSize: 11,
    fontWeight: "700",
    textTransform: "uppercase",
    letterSpacing: 0.4,
  },
  detailValue: { fontSize: 14, lineHeight: 20, flexShrink: 1, textAlign: "right" },
  auditTitle: {
    fontSize: 16,
    fontWeight: "700",
    marginTop: spacing.sm,
    marginBottom: spacing.sm,
  },
  eventCard: { marginBottom: spacing.sm },
  eventAction: { fontWeight: "600", fontSize: 14 },
});
