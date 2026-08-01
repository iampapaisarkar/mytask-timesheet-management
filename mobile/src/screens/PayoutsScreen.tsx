import { useCallback, useRef, useState } from "react";
import {
  ActivityIndicator,
  Alert,
  FlatList,
  RefreshControl,
  ScrollView,
  Share,
  StyleSheet,
  Text,
  TouchableOpacity,
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
import { spacing } from "@mytask/theme";
import { getErrorMessage, listPagination, listRows } from "@mytask/utils";
import { AccessDenied } from "../components/AccessDenied";
import { ListPager } from "../components/ListPager";
import { SkeletonList } from "../components/Skeleton";
import type { MoreStackParamList } from "../navigation/types";
import { useOrganisationStore } from "../store/organisationStore";
import { useThemeStore } from "../store/themeStore";
import { useToastStore } from "../store/toastStore";
import { triggerHaptic } from "../utils/haptics";
import { AppBottomSheet } from "../ui";

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
          <TouchableOpacity
            style={[styles.actionBtn, { backgroundColor: c.primary + "22" }]}
            disabled={actionPending}
            onPress={() =>
              void runAction("Submitted for approval", () =>
                submitMutation.mutateAsync({ id }),
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
                approveMutation.mutateAsync({ id }),
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
                releaseMutation.mutateAsync({ id }),
              )
            }
          >
            <Text style={[styles.actionText, { color: c.primary }]}>
              Release
            </Text>
          </TouchableOpacity>
        ) : null}
        {s === "READY_FOR_PAYOUT" || s === "ELIGIBLE" ? (
          <TouchableOpacity
            style={[styles.actionBtn, { backgroundColor: c.primary + "22" }]}
            disabled={actionPending}
            onPress={() =>
              void runAction("Marked as paid", () =>
                markPaidMutation.mutateAsync({ id }),
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
            onPress={() => confirmCancel(id)}
          >
            <Text style={[styles.actionText, { color: c.negative }]}>
              Cancel
            </Text>
          </TouchableOpacity>
        ) : null}
      </View>
    );
  }

  if (!canList) {
    return <AccessDenied />;
  }

  if (isError && !data) {
    return (
      <View style={[styles.center, { backgroundColor: c.bg }]}>
        <Text style={{ color: c.text }}>Failed to load payouts</Text>
        <TouchableOpacity onPress={() => void refetch()}>
          <Text style={[styles.link, { color: c.primary }]}>Try again</Text>
        </TouchableOpacity>
      </View>
    );
  }

  return (
    <View style={{ flex: 1, backgroundColor: c.bg }}>
      <View style={styles.toolbar}>
        {canCreate ? (
          <TouchableOpacity
            style={[styles.createBtn, { backgroundColor: c.primary }]}
            onPress={() => createSheetRef.current?.present()}
          >
            <Text style={styles.createBtnText}>Create from eligible</Text>
          </TouchableOpacity>
        ) : null}
        <TouchableOpacity
          style={[styles.exportBtn, { borderColor: c.primary }]}
          disabled={exportMutation.isPending}
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
        >
          <Text style={[styles.exportBtnText, { color: c.primary }]}>
            {exportMutation.isPending ? "Exporting…" : "Export CSV"}
          </Text>
        </TouchableOpacity>
      </View>

      <View style={styles.filters}>
        {STATUS_FILTERS.map((item) => {
          const selected = status === item.value;
          return (
            <TouchableOpacity
              key={item.value || "all"}
              style={[
                styles.filterChip,
                {
                  borderColor: selected ? c.primary : c.border,
                  backgroundColor: selected ? c.primary + "18" : c.surface,
                },
              ]}
              onPress={() => {
                setStatus(item.value);
                setPage(1);
              }}
            >
              <Text
                style={{
                  color: selected ? c.primary : c.text,
                  fontWeight: "600",
                  fontSize: 12,
                }}
              >
                {item.label}
              </Text>
            </TouchableOpacity>
          );
        })}
      </View>

      {isLoading && !data ? (
        <SkeletonList rows={6} />
      ) : (
        <FlatList
          contentContainerStyle={{ padding: spacing.md, paddingTop: canCreate ? 0 : spacing.md }}
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
              No payouts found
            </Text>
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
              <View
                style={[
                  styles.card,
                  { backgroundColor: c.surface, borderColor: c.border },
                ]}
              >
                <TouchableOpacity
                  activeOpacity={0.85}
                  onPress={() => {
                    if (item.id == null) return;
                    navigation.navigate("PayoutDetail", {
                      orgCode,
                      id: String(item.id),
                    });
                  }}
                >
                  <Text style={[styles.id, { color: c.text }]}>
                    {item.payout_number ||
                      (item.id != null ? `Payout #${item.id}` : "Payout")}
                  </Text>
                  <Text style={{ color: c.muted }}>
                    {employeeName(item.employee)}
                  </Text>
                  <Text
                    style={{ color: c.text, marginTop: 4, fontWeight: "600" }}
                  >
                    {amount != null
                      ? formatMoney(Number(amount), item.currency || "AUD")
                      : "—"}
                  </Text>
                  <Text style={{ color: c.muted, marginTop: 2 }}>
                    {statusLabel(item.status)}
                    {item.period_start_date && item.period_end_date
                      ? ` · ${item.period_start_date} → ${item.period_end_date}`
                      : ""}
                  </Text>
                  <Text
                    style={{
                      color: c.primary,
                      marginTop: 8,
                      fontWeight: "700",
                      fontSize: 12,
                    }}
                  >
                    View detail
                  </Text>
                </TouchableOpacity>
                {renderActions(item)}
              </View>
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
          <Text style={{ color: c.muted, marginTop: 12 }}>
            No approved timesheets waiting for payout
          </Text>
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
                <TouchableOpacity
                  style={[styles.actionBtn, { borderColor: c.border, borderWidth: 1 }]}
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
                >
                  <Text style={[styles.actionText, { color: c.text }]}>
                    Save draft
                  </Text>
                </TouchableOpacity>
                <TouchableOpacity
                  style={[styles.actionBtn, { backgroundColor: c.primary }]}
                  disabled={createMutation.isPending}
                  onPress={() => {
                    if (row.id == null) return;
                    void runAction("Payout created", () =>
                      createMutation.mutateAsync({ timesheet_id: row.id! }),
                    ).then(() => createSheetRef.current?.dismiss());
                  }}
                >
                  <Text style={[styles.actionText, { color: "#fff" }]}>
                    Create payout
                  </Text>
                </TouchableOpacity>
              </View>
            </View>
          ))
        )}
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
    flex: 1,
    borderRadius: 12,
    paddingVertical: 12,
    alignItems: "center",
  },
  createBtnText: { color: "#fff", fontWeight: "700" },
  toolbar: {
    flexDirection: "row",
    gap: 8,
    paddingHorizontal: spacing.md,
    paddingTop: spacing.md,
    marginBottom: spacing.sm,
  },
  exportBtn: {
    borderWidth: 1.5,
    borderRadius: 12,
    paddingHorizontal: 14,
    paddingVertical: 12,
    alignItems: "center",
    justifyContent: "center",
  },
  exportBtnText: { fontWeight: "700", fontSize: 13 },
  filters: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: 8,
    paddingHorizontal: spacing.md,
    paddingBottom: spacing.sm,
  },
  filterChip: {
    borderWidth: 1,
    borderRadius: 12,
    paddingHorizontal: 14,
    paddingVertical: 10,
    minHeight: 40,
    alignItems: "center",
    justifyContent: "center",
  },
  actions: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: 8,
    marginTop: spacing.sm,
  },
  actionBtn: {
    borderRadius: 10,
    paddingHorizontal: 12,
    paddingVertical: 8,
  },
  actionText: { fontWeight: "700", fontSize: 12 },
  eligibleCard: {
    borderRadius: 14,
    borderWidth: 1,
    padding: spacing.md,
    marginBottom: spacing.sm,
  },
});
