import { useEffect, useMemo, useRef, useState } from "react";
import {
  FlatList,
  RefreshControl,
  Share,
  StyleSheet,
  Text,
  View,
} from "react-native";
import type { BottomSheetModal } from "@gorhom/bottom-sheet";
import type { NativeStackScreenProps } from "@react-navigation/native-stack";
import { systemLogsApi } from "@mytask/api";
import {
  useSystemLogsEmail,
  useSystemLogsExternal,
  useSystemLogsInternal,
  useSystemLogsSummary,
} from "@mytask/hooks";
import { DEFAULT_LIST_PAGE_SIZE } from "@mytask/constants";
import { can, getOrganisationAcl } from "@mytask/services";
import { radii, spacing, typography } from "@mytask/theme";
import type { ListParams } from "@mytask/types";
import { formatDisplayDateTime, getErrorMessage } from "@mytask/utils";
import { AccessDenied } from "../components/AccessDenied";
import { ListPager } from "../components/ListPager";
import { MobileSelect } from "../components/MobileSelect";
import { SearchBar } from "../components/SearchBar";
import { SkeletonList } from "../components/Skeleton";
import { useDebouncedValue } from "../hooks/useDebouncedValue";
import type { OrgStackParamList } from "../navigation/types";
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
  LogIcon,
  SegmentedControl,
  StatCard,
  StatusBadge,
} from "../ui";

type Props = NativeStackScreenProps<OrgStackParamList, "SystemLogs">;
type LogKind = "internal" | "external" | "email";
type SuccessFilter = "all" | "true" | "false";
type DatePreset =
  | "today"
  | "yesterday"
  | "this_week"
  | "this_month"
  | "last_month";

const DATE_PRESETS: { value: DatePreset; label: string }[] = [
  { value: "today", label: "Today" },
  { value: "yesterday", label: "Yesterday" },
  { value: "this_week", label: "This week" },
  { value: "this_month", label: "This month" },
  { value: "last_month", label: "Last month" },
];

const SUCCESS_FILTERS: { value: SuccessFilter; label: string }[] = [
  { value: "all", label: "All statuses" },
  { value: "true", label: "Success only" },
  { value: "false", label: "Failed only" },
];

function display(value: unknown): string {
  if (value == null || value === "") return "—";
  return String(value);
}

function logWhen(row: Record<string, unknown>): string {
  const when =
    row.started_at || row.executed_at || row.sent_at || row.created_at;
  return when ? formatDisplayDateTime(String(when)) : "—";
}

function bytesToText(bytes: Uint8Array): string {
  let text = "";
  for (let i = 0; i < bytes.length; i += 1) {
    text += String.fromCharCode(bytes[i]!);
  }
  return text;
}

async function blobLikeToText(data: unknown): Promise<string> {
  if (typeof data === "string") return data;
  if (typeof Blob !== "undefined" && data instanceof Blob) {
    const buffer = await new Response(data).arrayBuffer();
    return bytesToText(new Uint8Array(buffer));
  }
  if (data instanceof ArrayBuffer) {
    return bytesToText(new Uint8Array(data));
  }
  if (data instanceof Uint8Array) {
    return bytesToText(data);
  }
  if (data && typeof data === "object" && "data" in (data as object)) {
    const nested = (data as { data?: unknown }).data;
    if (typeof nested === "string") return nested;
    if (nested instanceof Uint8Array) return bytesToText(nested);
    if (Array.isArray(nested)) return bytesToText(Uint8Array.from(nested));
  }
  throw new Error("Unsupported CSV response type");
}

function DetailField({ label, value }: { label: string; value: unknown }) {
  const c = useThemeStore((s) => s.colors);
  return (
    <View style={[styles.detailField, { backgroundColor: c.bg }]}>
      <Text style={[styles.detailFieldLabel, { color: c.muted }]}>{label}</Text>
      <Text style={[styles.detailFieldValue, { color: c.text }]}>
        {display(value)}
      </Text>
    </View>
  );
}

function LogDetailContent({
  row,
  tab,
}: {
  row: Record<string, unknown>;
  tab: LogKind;
}) {
  const c = useThemeStore((s) => s.colors);
  const success = Boolean(row.success);
  const generalFields =
    tab === "email"
      ? ([
          ["Feature", row.feature],
          ["Method", String(row.provider || "smtp").toUpperCase()],
          ["Template", row.template],
          ["Recipient", row.recipient],
          ["Subject", row.subject],
          ["Status", row.status_code || row.status],
          [
            "Duration",
            row.duration_ms != null ? `${row.duration_ms} ms` : "—",
          ],
          ["Provider", row.provider],
          ["Message ID", row.provider_message_id],
          ["Request ID", row.request_id || row.correlation_id],
          ["Correlation ID", row.correlation_id || row.request_id],
          ["Retry count", row.retry_count],
        ] as const)
      : ([
          ["Feature", row.feature],
          ["Method", row.method],
          ["Endpoint", row.endpoint || row.api_name],
          ["API Name", row.api_name],
          ["Status", row.status_code || row.status],
          [
            "Duration",
            row.duration_ms != null ? `${row.duration_ms} ms` : "—",
          ],
          ["Correlation ID", row.correlation_id || row.request_id],
          ["Request ID", row.request_id || row.correlation_id],
          ["Role", row.role_code],
          ["Platform", row.platform || row.client_channel],
        ] as const);

  return (
    <View style={styles.detailBody}>
      <View style={styles.detailHeader}>
        <Text style={[styles.detailEyebrow, { color: c.muted }]}>
          {tab} log #{display(row.id)}
        </Text>
        <Text style={[styles.detailTitle, { color: c.text }]}>
          {display(row.friendly_message || row.feature || "Log detail")}
        </Text>
        <StatusBadge
          status={success ? "success" : "failed"}
          label={success ? "Success" : "Failed"}
        />
      </View>

      <Text style={[styles.sectionTitle, { color: c.text }]}>
        Friendly summary
      </Text>
      <Text style={{ color: c.muted, lineHeight: 20 }}>
        {display(row.friendly_message || "No summary available.")}
      </Text>

      <Text style={[styles.sectionTitle, { color: c.text }]}>General</Text>
      <View style={styles.detailGrid}>
        {generalFields.map(([label, value]) => (
          <DetailField key={label} label={label} value={value} />
        ))}
      </View>

      <Text style={[styles.sectionTitle, { color: c.text }]}>
        Technical details
      </Text>
      <View style={[styles.codeBlock, { backgroundColor: c.bg }]}>
        <Text style={[styles.codeText, { color: c.text }]}>
          {display(row.technical_message || "No technical error recorded.")}
        </Text>
      </View>

      <Text style={[styles.sectionTitle, { color: c.text }]}>Metadata</Text>
      <View style={[styles.codeBlock, { backgroundColor: c.bg }]}>
        <Text style={[styles.codeText, { color: c.text }]}>
          {JSON.stringify(
            {
              request_meta: row.request_meta,
              response_meta: row.response_meta || row.provider_response,
            },
            null,
            2,
          )}
        </Text>
      </View>
    </View>
  );
}

export function SystemLogsScreen({}: Props) {
  const organisation = useOrganisationStore((s) => s.organisation);
  const role = organisation?.role || organisation?.role_code;
  const acl = getOrganisationAcl(role);
  const canList = can(acl, "systemLog", "list");
  const c = useThemeStore((s) => s.colors);
  const toast = useToastStore();
  const detailRef = useRef<BottomSheetModal>(null);

  const [kind, setKind] = useState<LogKind>("internal");
  const [search, setSearch] = useState("");
  const [preset, setPreset] = useState<DatePreset>("today");
  const [successFilter, setSuccessFilter] = useState<SuccessFilter>("all");
  const [page, setPage] = useState(1);
  const [selected, setSelected] = useState<Record<string, unknown> | null>(
    null,
  );
  const [exporting, setExporting] = useState(false);

  const debouncedSearch = useDebouncedValue(search.trim(), 400);

  useEffect(() => {
    setPage(1);
  }, [kind, debouncedSearch, preset, successFilter]);

  const filters: ListParams = useMemo(
    () => ({
      date_preset: preset,
      ...(debouncedSearch ? { search: debouncedSearch } : {}),
      ...(successFilter !== "all" ? { success: successFilter } : {}),
      page_number: page,
      rows_per_page: DEFAULT_LIST_PAGE_SIZE,
    }),
    [preset, debouncedSearch, successFilter, page],
  );

  const summaryQuery = useSystemLogsSummary(
    { date_preset: preset },
    canList,
  );
  const internalQuery = useSystemLogsInternal(
    filters,
    canList && kind === "internal",
  );
  const externalQuery = useSystemLogsExternal(
    filters,
    canList && kind === "external",
  );
  const emailQuery = useSystemLogsEmail(filters, canList && kind === "email");

  const query =
    kind === "internal"
      ? internalQuery
      : kind === "external"
        ? externalQuery
        : emailQuery;

  const rows = (query.data?.rows ?? []) as Record<string, unknown>[];
  const pagination = query.data?.pagination ?? null;
  const totalPages = Math.max(1, Number(pagination?.total_pages) || 1);
  const currentPage = Number(pagination?.page_number) || page;

  const summary = (summaryQuery.data || {}) as Record<string, unknown>;
  const internal = (summary.internal || {}) as Record<string, number>;
  const external = (summary.external || {}) as Record<string, number>;
  const email = (summary.email || {}) as Record<string, number>;
  const failedTotal =
    (internal.failed || 0) + (external.failed || 0) + (email.failed || 0);

  const hasFilters = Boolean(
    debouncedSearch || successFilter !== "all" || preset !== "today",
  );

  function openDetail(row: Record<string, unknown>) {
    void triggerHaptic("selection");
    setSelected(row);
    detailRef.current?.present();
  }

  async function onExport() {
    setExporting(true);
    try {
      const res = await systemLogsApi.exportCsv({ ...filters, type: kind });
      const csv = await blobLikeToText(res.data);
      await Share.share({
        title: `system-logs-${kind}.csv`,
        message: csv,
      });
      toast.success("Export ready", "CSV shared");
    } catch (err) {
      toast.error("Export failed", getErrorMessage(err));
    } finally {
      setExporting(false);
    }
  }

  if (!canList) {
    return <AccessDenied />;
  }

  if (query.isError && !query.data) {
    return (
      <View style={[styles.flex, { backgroundColor: c.bg }]}>
        <ErrorState
          title="Failed to load logs"
          description="Check your connection and try again."
          onRetry={() => void query.refetch()}
        />
      </View>
    );
  }

  return (
    <View style={[styles.flex, { backgroundColor: c.bg }]}>
      {query.isLoading && !query.data ? (
        <View style={styles.flex}>
          <View style={styles.header}>
            <SegmentedControl
              value={kind}
              onChange={(next) => {
                setKind(next);
                setSelected(null);
                detailRef.current?.dismiss();
              }}
              options={[
                { value: "internal", label: "Internal" },
                { value: "external", label: "External" },
                { value: "email", label: "Email" },
              ]}
            />
          </View>
          <SkeletonList rows={6} />
        </View>
      ) : (
        <FlatList
          data={rows}
          keyExtractor={(item, index) => String(item.id ?? index)}
          showsHorizontalScrollIndicator={false}
          contentContainerStyle={styles.list}
          ListHeaderComponent={
            <View style={styles.header}>
              <SegmentedControl
                value={kind}
                onChange={(next) => {
                  setKind(next);
                  setSelected(null);
                  detailRef.current?.dismiss();
                }}
                options={[
                  { value: "internal", label: "Internal" },
                  { value: "external", label: "External" },
                  { value: "email", label: "Email" },
                ]}
              />

              <Button
                title={exporting ? "Exporting…" : "Export CSV"}
                variant="outline"
                size="sm"
                fullWidth={false}
                loading={exporting}
                disabled={exporting}
                onPress={() => void onExport()}
                style={styles.exportBtn}
              />

              {summaryQuery.isLoading && !summaryQuery.data ? (
                <Text style={{ color: c.muted, fontSize: 13 }}>
                  Loading summary…
                </Text>
              ) : summaryQuery.isError ? (
                <View style={styles.summaryError}>
                  <Text
                    style={{ color: c.negativeText, fontSize: 13, flex: 1 }}
                  >
                    {getErrorMessage(
                      summaryQuery.error,
                      "Unable to load summary",
                    )}
                  </Text>
                  <Button
                    title="Retry"
                    variant="soft"
                    size="sm"
                    fullWidth={false}
                    onPress={() => void summaryQuery.refetch()}
                  />
                </View>
              ) : (
                <View style={styles.metrics}>
                  <StatCard
                    label="Internal success"
                    value={`${internal.success_pct ?? 100}%`}
                    hint={`${internal.total ?? 0} requests`}
                    accent={c.positive}
                  />
                  <StatCard
                    label="External success"
                    value={`${external.success_pct ?? 100}%`}
                    hint={`${external.total ?? 0} calls`}
                    accent={c.positive}
                  />
                  <StatCard
                    label="Email success"
                    value={`${email.success_pct ?? 100}%`}
                    hint={`${email.total ?? 0} messages`}
                    accent={c.primary}
                  />
                  <StatCard
                    label="Failed requests"
                    value={String(failedTotal)}
                    hint="In selected range"
                    accent={c.negative}
                  />
                  <StatCard
                    label="Auth failures"
                    value={String(summary.authentication_failures ?? 0)}
                    hint="401 / session issues"
                    accent={c.negative}
                  />
                </View>
              )}

              <SearchBar
                value={search}
                onChangeText={setSearch}
                placeholder="Search feature, endpoint, message…"
              />
              <MobileSelect
                label="Date range"
                value={preset}
                onChange={setPreset}
                options={DATE_PRESETS}
                searchable={false}
                placeholder="Select range"
              />
              <FilterChips
                value={successFilter}
                onChange={setSuccessFilter}
                options={SUCCESS_FILTERS}
              />
            </View>
          }
          refreshControl={
            <RefreshControl
              refreshing={query.isFetching && !query.isLoading}
              onRefresh={() => {
                void triggerHaptic("light");
                void query.refetch();
                void summaryQuery.refetch();
              }}
              tintColor={c.primary}
            />
          }
          ListEmptyComponent={
            <EmptyState
              icon={<LogIcon color={c.primary} size={28} />}
              title={hasFilters ? "No matching logs" : "No logs"}
              description={
                hasFilters
                  ? "Try a different search or clear filters."
                  : "Activity for this category will show up here."
              }
            />
          }
          ListFooterComponent={
            <ListPager
              currentPage={currentPage}
              totalPages={totalPages}
              isFetching={query.isFetching}
              hasRows={Boolean(rows.length || Number(pagination?.total_rows))}
              onPrev={() => setPage(Math.max(1, currentPage - 1))}
              onNext={() => setPage(Math.min(totalPages, currentPage + 1))}
            />
          }
          renderItem={({ item }) => {
            const success = Boolean(item.success);
            return (
              <Card
                style={styles.card}
                accessibilityLabel={`Log ${display(item.feature || item.id)}`}
                onPress={() => openDetail(item)}
              >
                <View style={styles.cardTop}>
                  <Text
                    style={[styles.title, { color: c.text }]}
                    numberOfLines={2}
                  >
                    {display(item.feature || `Log #${item.id}`)}
                  </Text>
                  <StatusBadge
                    status={success ? "success" : "failed"}
                    label={success ? "Success" : "Failed"}
                  />
                </View>
                <Text
                  style={{ color: c.muted, marginTop: 4, fontSize: 13 }}
                  numberOfLines={1}
                >
                  {kind === "email"
                    ? display(item.recipient)
                    : display(item.endpoint || item.api_name)}
                </Text>
                <Text
                  style={{ color: c.muted, marginTop: 4, fontSize: 12 }}
                  numberOfLines={2}
                >
                  {display(
                    item.friendly_message || (success ? "OK" : "Failed"),
                  )}
                </Text>
                <Text style={{ color: c.subtle, marginTop: 8, fontSize: 12 }}>
                  {logWhen(item)}
                  {item.duration_ms != null ? ` · ${item.duration_ms} ms` : ""}
                </Text>
              </Card>
            );
          }}
        />
      )}

      <AppBottomSheet
        ref={detailRef}
        title="Log detail"
        snapPoints={["70%", "92%"]}
        onDismiss={() => setSelected(null)}
      >
        {selected ? <LogDetailContent row={selected} tab={kind} /> : null}
      </AppBottomSheet>
    </View>
  );
}

const styles = StyleSheet.create({
  flex: { flex: 1 },
  list: {
    paddingBottom: spacing.xxl,
    flexGrow: 1,
  },
  header: {
    paddingHorizontal: spacing.md,
    paddingTop: spacing.md,
    paddingBottom: spacing.sm,
    gap: spacing.sm,
  },
  exportBtn: { alignSelf: "flex-start" },
  summaryError: {
    flexDirection: "row",
    alignItems: "center",
    gap: spacing.sm,
  },
  metrics: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: spacing.sm,
  },
  card: {
    marginBottom: spacing.sm,
    marginHorizontal: spacing.md,
  },
  cardTop: {
    flexDirection: "row",
    alignItems: "flex-start",
    justifyContent: "space-between",
    gap: spacing.sm,
  },
  title: { flex: 1, fontSize: 15, fontWeight: "700" },
  detailBody: { gap: spacing.sm, paddingBottom: spacing.lg },
  detailHeader: { gap: spacing.xs, marginBottom: spacing.sm },
  detailEyebrow: {
    fontSize: typography.sizes.xs,
    fontWeight: "600",
    textTransform: "uppercase",
    letterSpacing: 0.4,
  },
  detailTitle: {
    fontSize: typography.sizes.lg,
    fontWeight: "700",
  },
  sectionTitle: {
    marginTop: spacing.md,
    fontSize: typography.sizes.sm,
    fontWeight: "700",
  },
  detailGrid: { gap: spacing.sm },
  detailField: {
    borderRadius: radii.lg,
    padding: spacing.sm,
  },
  detailFieldLabel: {
    fontSize: 11,
    fontWeight: "600",
    textTransform: "uppercase",
    letterSpacing: 0.3,
    marginBottom: 2,
  },
  detailFieldValue: {
    fontSize: typography.sizes.sm,
    fontWeight: "600",
  },
  codeBlock: {
    borderRadius: radii.lg,
    padding: spacing.sm,
  },
  codeText: {
    fontSize: 12,
    fontFamily: "Menlo",
    lineHeight: 18,
  },
});
