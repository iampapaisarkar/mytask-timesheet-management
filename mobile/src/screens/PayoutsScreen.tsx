import { useCallback, useRef, useState } from "react";
import {
  ActivityIndicator,
  Alert,
  FlatList,
  RefreshControl,
  Share,
  StyleSheet,
  Text,
  View,
} from "react-native";
import type { BottomSheetModal } from "@gorhom/bottom-sheet";
import type { NativeStackScreenProps } from "@react-navigation/native-stack";
import {
  useApprovePayout,
  useCancelPayout,
  useCreatePayout,
  useEligiblePayouts,
  useExportPayouts,
  useMarkPayoutPaid,
  usePayouts,
  useReleasePayout,
  useSubmitPayout,
} from "@mytask/hooks";
import { DEFAULT_LIST_PAGE_SIZE, formatMoney } from "@mytask/constants";
import { can, getOrganisationAcl } from "@mytask/services";
import { radii, spacing, typography } from "@mytask/theme";
import { getErrorMessage, listPagination, listRows } from "@mytask/utils";
import { AccessDenied } from "../components/AccessDenied";
import { ListPager } from "../components/ListPager";
import { SkeletonList } from "../components/Skeleton";
import type { MoreStackParamList } from "../navigation/types";
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
  StatusBadge,
  WalletIcon,
} from "../ui";

type Props = NativeStackScreenProps<MoreStackParamList, "Payouts">;

type StatusLike = string | { code?: string; name?: string } | null | undefined;

type EmployeeLike = {
  id?: number;
  details?: { full_name?: string };
  user?: { full_name?: string };
};

type TimesheetLike = {
  id?: number;
  code?: string;
  period_range?: string;
  period_start_date?: string;
  period_end_date?: string;
  employee?: EmployeeLike;
  status?: StatusLike;
};

type PayoutRow = {
  id?: number | string;
  payout_number?: string | null;
  amount?: number | string | null;
  net_amount?: number | string | null;
  currency?: string | null;
  status?: StatusLike;
  period_start_date?: string | null;
  period_end_date?: string | null;
  employee?: EmployeeLike;
};

function employeeName(employee?: EmployeeLike) {
  return (
    employee?.details?.full_name ||
    employee?.user?.full_name ||
    (employee?.id != null ? `#${employee.id}` : "—")
  );
}

function normalizeStatus(status?: string | null): string {
  if (!status) return "";
  if (status === "ELIGIBLE") return "READY_FOR_PAYOUT";
  if (status === "VOID") return "CANCELLED";
  return status;
}

function statusCode(status?: StatusLike): string {
  if (!status) return "";
  if (typeof status === "string") return normalizeStatus(status);
  return normalizeStatus(status.code || status.name || "");
}

function statusLabel(status?: StatusLike): string {
  if (!status) return "—";
  if (typeof status === "object" && status.name) return status.name;
  const code = statusCode(status);
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

const STATUS_FILTERS = [
  { value: "", label: "All" },
  { value: "DRAFT", label: "Draft" },
  { value: "PENDING_APPROVAL", label: "Pending" },
  { value: "APPROVED", label: "Approved" },
  { value: "READY_FOR_PAYOUT", label: "Ready" },
  { value: "PAID", label: "Paid" },
  { value: "CANCELLED", label: "Cancelled" },
];

export function PayoutsScreen({ navigation, route }: Props) {
  const { orgCode } = route.params;
  const organisation = useOrganisationStore((s) => s.organisation);
  const role = organisation?.role || organisation?.role_code;
  const acl = getOrganisationAcl(role);
  const canList = can(acl, "payout", "list");
  const canCreate = can(acl, "payout", "create");
  const canEdit = can(acl, "payout", "edit");
  const [page, setPage] = useState(1);
  const [status, setStatus] = useState("");
  const c = useThemeStore((s) => s.colors);
  const toast = useToastStore();
  const createSheetRef = useRef<BottomSheetModal>(null);

  const listParams = {
    rows_per_page: DEFAULT_LIST_PAGE_SIZE,
    page_number: page,
    sort_by: "id",
    status: status || undefined,
  };

  const { data, isLoading, isError, isFetching, refetch } = usePayouts(
    listParams,
    canList,
  );
  const eligibleQuery = useEligiblePayouts(canCreate);
  const createMutation = useCreatePayout();
  const submitMutation = useSubmitPayout();
  const approveMutation = useApprovePayout();
  const releaseMutation = useReleasePayout();
  const markPaidMutation = useMarkPayoutPaid();
  const cancelMutation = useCancelPayout();
  const exportMutation = useExportPayouts();

  const rows = listRows<PayoutRow>(data);
  const pagination = listPagination(data);
  const totalPages = Math.max(1, Number(pagination?.total_pages) || 1);
  const currentPage = Number(pagination?.page_number) || page;
  const eligible = (Array.isArray(eligibleQuery.data)
    ? eligibleQuery.data
    : []) as TimesheetLike[];

  const actionPending =
    submitMutation.isPending ||
    approveMutation.isPending ||
    releaseMutation.isPending ||
    markPaidMutation.isPending ||
    cancelMutation.isPending ||
    createMutation.isPending ||
    exportMutation.isPending;

  const runAction = useCallback(
    async (label: string, fn: () => Promise<unknown>) => {
      try {
        await fn();
        toast.success(label);
      } catch (err) {
        toast.error(label, getErrorMessage(err));
      }
    },
    [toast],
  );

  function confirmCancel(id: number | string) {
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
              cancelMutation.mutateAsync({ id }),
            ),
        },
      ],
    );
  }

  function renderActions(row: PayoutRow) {
    if (!canEdit || row.id == null) return null;
    const s = statusCode(row.status);
    const id = row.id;
    return (
      <View style={styles.actions}>
        {s === "DRAFT" ? (
          <Button
            title="Submit"
            variant="soft"
            size="sm"
            fullWidth={false}
            disabled={actionPending}
            onPress={() =>
              void runAction("Submitted for approval", () =>
                submitMutation.mutateAsync({ id }),
              )
            }
          />
        ) : null}
        {s === "PENDING_APPROVAL" ? (
          <Button
            title="Approve"
            variant="soft"
            size="sm"
            fullWidth={false}
            disabled={actionPending}
            onPress={() =>
              void runAction("Payout approved", () =>
                approveMutation.mutateAsync({ id }),
              )
            }
          />
        ) : null}
        {s === "APPROVED" ? (
          <Button
            title="Release"
            variant="soft"
            size="sm"
            fullWidth={false}
            disabled={actionPending}
            onPress={() =>
              void runAction("Ready for payout", () =>
                releaseMutation.mutateAsync({ id }),
              )
            }
          />
        ) : null}
        {s === "READY_FOR_PAYOUT" || s === "ELIGIBLE" ? (
          <Button
            title="Mark paid"
            variant="soft"
            size="sm"
            fullWidth={false}
            disabled={actionPending}
            onPress={() =>
              void runAction("Marked as paid", () =>
                markPaidMutation.mutateAsync({ id }),
              )
            }
          />
        ) : null}
        {s !== "PAID" && s !== "CANCELLED" ? (
          <Button
            title="Cancel"
            variant="danger"
            size="sm"
            fullWidth={false}
            disabled={actionPending}
            onPress={() => confirmCancel(id)}
          />
        ) : null}
      </View>
    );
  }

  if (!canList) {
    return <AccessDenied />;
  }

  if (isError && !data) {
    return (
      <View style={[styles.flex, { backgroundColor: c.bg }]}>
        <ErrorState
          title="Failed to load payouts"
          description="Check your connection and try again."
          onRetry={() => void refetch()}
        />
      </View>
    );
  }

  return (
    <View style={{ flex: 1, backgroundColor: c.bg }}>
      <View style={styles.header}>
        <ScreenHeader title="Payouts" subtitle="Payroll payouts" />
        <View style={styles.toolbar}>
          {canCreate ? (
            <Button
              title="Create from eligible"
              size="sm"
              fullWidth={false}
              onPress={() => createSheetRef.current?.present()}
              style={styles.toolbarBtn}
            />
          ) : null}
          <Button
            title={exportMutation.isPending ? "Exporting…" : "Export CSV"}
            variant="outline"
            size="sm"
            fullWidth={false}
            loading={exportMutation.isPending}
            onPress={() => {
              void runAction("Export ready", async () => {
                const blob = await exportMutation.mutateAsync(listParams);
                const base64 = await new Response(blob as Blob).arrayBuffer().then(
                  (buf) => {
                    const bytes = new Uint8Array(buf);
                    let binary = "";
                    for (let i = 0; i < bytes.length; i += 1) {
                      binary += String.fromCharCode(bytes[i]!);
                    }
                    // Prefer Share with CSV text for RN without file FS.
                    return binary;
                  },
                );
                await Share.share({
                  title: "payouts.csv",
                  message: base64,
                });
              });
            }}
            style={styles.toolbarBtn}
          />
        </View>

        <FilterChips
          value={status}
          onChange={(next) => {
            setStatus(next);
            setPage(1);
          }}
          options={STATUS_FILTERS}
        />
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
              icon={<WalletIcon color={c.primary} size={28} />}
              title="No payouts found"
              description="Payouts you create or approve will appear here."
            />
          }
          ListFooterComponent={
            <ListPager
              currentPage={currentPage}
              totalPages={totalPages}
              isFetching={isFetching}
              hasRows={Boolean(rows.length || Number(pagination?.total_rows))}
              onPrev={() => setPage(Math.max(1, currentPage - 1))}
              onNext={() => setPage(Math.min(totalPages, currentPage + 1))}
            />
          }
          renderItem={({ item }) => {
            const amount = item.net_amount ?? item.amount;
            return (
              <Card
                style={styles.card}
                onPress={() => {
                  if (item.id == null) return;
                  navigation.navigate("PayoutDetail", {
                    orgCode,
                    id: String(item.id),
                  });
                }}
              >
                <View style={styles.cardTop}>
                  <Text style={[styles.id, { color: c.text }]} numberOfLines={1}>
                    {item.payout_number ||
                      (item.id != null ? `Payout #${item.id}` : "Payout")}
                  </Text>
                  <StatusBadge
                    status={statusCode(item.status)}
                    label={statusLabel(item.status)}
                  />
                </View>
                <Text style={{ color: c.muted }} numberOfLines={1}>
                  {employeeName(item.employee)}
                </Text>
                <Text style={[styles.amount, { color: c.text }]}>
                  {amount != null
                    ? formatMoney(Number(amount), item.currency || "AUD")
                    : "—"}
                </Text>
                {item.period_start_date && item.period_end_date ? (
                  <Text style={{ color: c.subtle, marginTop: 2, fontSize: 12 }}>
                    {item.period_start_date} → {item.period_end_date}
                  </Text>
                ) : null}
                {renderActions(item)}
              </Card>
            );
          }}
        />
      )}

      <AppBottomSheet
        ref={createSheetRef}
        title="Eligible timesheets"
        snapPoints={["55%", "90%"]}
      >
        {eligibleQuery.isLoading ? (
          <ActivityIndicator color={c.primary} style={{ marginTop: 24 }} />
        ) : eligible.length === 0 ? (
          <EmptyState
            title="No eligible timesheets"
            description="Approved timesheets waiting for payout will appear here."
          />
        ) : (
          eligible.map((row) => (
            <View
              key={String(row.id)}
              style={[
                styles.eligibleCard,
                { borderColor: c.border, backgroundColor: c.bg },
              ]}
            >
              <Text style={{ color: c.text, fontWeight: "700" }}>
                {row.code || `Timesheet #${row.id}`}
              </Text>
              <Text style={{ color: c.muted, marginTop: 4 }}>
                {employeeName(row.employee)}
              </Text>
              <Text style={{ color: c.muted, marginTop: 2, fontSize: 12 }}>
                {row.period_range ||
                  (row.period_start_date && row.period_end_date
                    ? `${row.period_start_date} → ${row.period_end_date}`
                    : "—")}
              </Text>
              <View style={styles.actions}>
                <Button
                  title="Save draft"
                  variant="outline"
                  size="sm"
                  fullWidth={false}
                  disabled={createMutation.isPending}
                  onPress={() => {
                    if (row.id == null) return;
                    void runAction("Draft payout created", () =>
                      createMutation.mutateAsync({
                        timesheet_id: row.id!,
                        as_draft: true,
                      }),
                    ).then(() => createSheetRef.current?.dismiss());
                  }}
                />
                <Button
                  title="Create payout"
                  size="sm"
                  fullWidth={false}
                  disabled={createMutation.isPending}
                  onPress={() => {
                    if (row.id == null) return;
                    void runAction("Payout created", () =>
                      createMutation.mutateAsync({ timesheet_id: row.id! }),
                    ).then(() => createSheetRef.current?.dismiss());
                  }}
                />
              </View>
            </View>
          ))
        )}
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
    marginBottom: 4,
  },
  id: {
    flex: 1,
    fontSize: typography.sizes.md,
    fontWeight: "700",
    letterSpacing: -0.2,
  },
  amount: { marginTop: 6, fontWeight: "700", fontSize: typography.sizes.lg },
  toolbar: {
    flexDirection: "row",
    gap: spacing.sm,
  },
  toolbarBtn: { flex: 1 },
  actions: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: 8,
    marginTop: spacing.sm,
  },
  eligibleCard: {
    borderRadius: radii.lg,
    borderWidth: 1,
    padding: spacing.md,
    marginBottom: spacing.sm,
  },
});
