import { useMemo, useState } from "react";
import {
  useSystemLogsEmail,
  useSystemLogsExternal,
  useSystemLogsInternal,
  useSystemLogsSummary,
} from "@mytask/hooks";
import { systemLogsApi } from "@mytask/api";
import { DEFAULT_LIST_PAGE_SIZE } from "@mytask/constants";
import type { ListParams } from "@mytask/types";
import { Card, PageHeader } from "@/components/ui/Card";
import { Button } from "@/components/ui/Button";
import { ErrorState, LoadingState } from "@/components/ui/States";
import { getErrorMessage } from "@mytask/utils";
import {
  Activity,
  AlertTriangle,
  Clock3,
  Download,
  Mail,
  Search,
  ShieldAlert,
  X,
} from "lucide-react";
import { clsx } from "clsx";

type TabKey = "internal" | "external" | "email";

const PRESETS = [
  { value: "today", label: "Today" },
  { value: "yesterday", label: "Yesterday" },
  { value: "this_week", label: "This week" },
  { value: "this_month", label: "This month" },
  { value: "last_month", label: "Last month" },
] as const;

function StatusBadge({ success }: { success: boolean }) {
  return (
    <span
      className={clsx(
        "inline-flex items-center rounded-full px-2 py-0.5 text-xs font-semibold",
        success
          ? "bg-emerald-500/15 text-emerald-700 dark:text-emerald-300"
          : "bg-rose-500/15 text-rose-700 dark:text-rose-300",
      )}
    >
      {success ? "Success" : "Failed"}
    </span>
  );
}

function MetricCard({
  label,
  value,
  hint,
  tone = "default",
}: {
  label: string;
  value: string;
  hint: string;
  tone?: "default" | "danger" | "ok";
}) {
  return (
    <Card
      className={clsx(
        "flex flex-col gap-1",
        tone === "danger" && "border-rose-500/30",
        tone === "ok" && "border-emerald-500/30",
      )}
    >
      <p className="text-xs font-medium uppercase tracking-wide text-muted">
        {label}
      </p>
      <p className="text-2xl font-semibold text-[var(--mt-text)]">{value}</p>
      <p className="text-xs text-muted">{hint}</p>
    </Card>
  );
}

function DetailDrawer({
  open,
  onClose,
  row,
  tab,
}: {
  open: boolean;
  onClose: () => void;
  row: Record<string, unknown> | null;
  tab: TabKey;
}) {
  if (!open || !row) return null;
  const success = Boolean(row.success);
  return (
    <div className="fixed inset-0 z-50 flex justify-end bg-black/40">
      <button
        type="button"
        className="flex-1 cursor-default"
        aria-label="Close drawer"
        onClick={onClose}
      />
      <aside className="flex h-full w-full max-w-xl flex-col border-l border-[var(--mt-border)] bg-[var(--mt-surface)] shadow-xl">
        <div className="flex items-start justify-between gap-3 border-b border-[var(--mt-border)] p-4">
          <div>
            <p className="text-xs uppercase tracking-wide text-muted">
              {tab} log #{String(row.id)}
            </p>
            <h2 className="mt-1 text-lg font-semibold text-[var(--mt-text)]">
              {String(row.friendly_message || row.feature || "Log detail")}
            </h2>
            <div className="mt-2">
              <StatusBadge success={success} />
            </div>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="rounded-lg p-2 text-muted hover:bg-[var(--mt-bg)]"
          >
            <X size={18} />
          </button>
        </div>
        <div className="flex-1 space-y-4 overflow-y-auto p-4 text-sm">
          <section>
            <h3 className="mb-2 font-semibold text-[var(--mt-text)]">
              Friendly summary
            </h3>
            <p className="text-muted">
              {String(row.friendly_message || "No summary available.")}
            </p>
          </section>
          <section>
            <h3 className="mb-2 font-semibold text-[var(--mt-text)]">General</h3>
            <dl className="grid grid-cols-2 gap-2">
              {(tab === "email"
                ? [
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
                    [
                      "Request ID",
                      row.request_id || row.correlation_id,
                    ],
                    ["Correlation ID", row.correlation_id || row.request_id],
                    ["Retry count", row.retry_count],
                  ]
                : [
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
                  ]
              ).map(([k, v]) => (
                <div key={String(k)} className="rounded-lg bg-[var(--mt-bg)] p-2">
                  <dt className="text-[11px] uppercase text-muted">{String(k)}</dt>
                  <dd className="break-all font-medium text-[var(--mt-text)]">
                    {v == null || v === "" ? "—" : String(v)}
                  </dd>
                </div>
              ))}
            </dl>
          </section>
          <section>
            <h3 className="mb-2 font-semibold text-[var(--mt-text)]">
              Technical details
            </h3>
            <pre className="overflow-x-auto rounded-lg bg-[var(--mt-bg)] p-3 text-xs text-[var(--mt-text)]">
              {String(row.technical_message || "No technical error recorded.")}
            </pre>
          </section>
          <section>
            <h3 className="mb-2 font-semibold text-[var(--mt-text)]">Metadata</h3>
            <pre className="overflow-x-auto rounded-lg bg-[var(--mt-bg)] p-3 text-xs text-[var(--mt-text)]">
              {JSON.stringify(
                {
                  request_meta: row.request_meta,
                  response_meta: row.response_meta || row.provider_response,
                },
                null,
                2,
              )}
            </pre>
          </section>
        </div>
      </aside>
    </div>
  );
}

export function SystemLogsPage() {
  const [tab, setTab] = useState<TabKey>("internal");
  const [search, setSearch] = useState("");
  const [preset, setPreset] = useState("today");
  const [successFilter, setSuccessFilter] = useState<string>("");
  const [page, setPage] = useState(1);
  const [selected, setSelected] = useState<Record<string, unknown> | null>(
    null,
  );

  const filters: ListParams = useMemo(
    () => ({
      date_preset: preset,
      search: search || undefined,
      success: successFilter || undefined,
      page_number: page,
      rows_per_page: DEFAULT_LIST_PAGE_SIZE,
    }),
    [preset, search, successFilter, page],
  );

  const summaryQuery = useSystemLogsSummary({ date_preset: preset });
  const internalQuery = useSystemLogsInternal(filters, tab === "internal");
  const externalQuery = useSystemLogsExternal(filters, tab === "external");
  const emailQuery = useSystemLogsEmail(filters, tab === "email");

  const activeQuery =
    tab === "external"
      ? externalQuery
      : tab === "email"
        ? emailQuery
        : internalQuery;

  const summary = summaryQuery.data || {};
  const internal = (summary.internal || {}) as Record<string, number>;
  const external = (summary.external || {}) as Record<string, number>;
  const email = (summary.email || {}) as Record<string, number>;

  async function onExport() {
    const res = await systemLogsApi.exportCsv({ ...filters, type: tab });
    const blob = res.data as Blob;
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `system-logs-${tab}.csv`;
    a.click();
    URL.revokeObjectURL(url);
  }

  const rows = activeQuery.data?.rows || [];
  const pagination = (activeQuery.data?.pagination || {}) as {
    total_pages?: number;
    page_number?: number;
    total_rows?: number;
  };

  return (
    <div className="mt-fade-in flex flex-col gap-5">
      <PageHeader
        title="System Logs"
        description="Organisation audit trail for APIs, integrations, and email delivery"
      />

      {summaryQuery.isLoading ? (
        <LoadingState label="Loading summary…" />
      ) : summaryQuery.isError ? (
        <ErrorState
          message={getErrorMessage(summaryQuery.error, "Unable to load summary")}
          onRetry={() => void summaryQuery.refetch()}
        />
      ) : (
        <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-5">
          <MetricCard
            label="Internal success"
            value={`${internal.success_pct ?? 100}%`}
            hint={`${internal.total ?? 0} requests`}
            tone="ok"
          />
          <MetricCard
            label="External success"
            value={`${external.success_pct ?? 100}%`}
            hint={`${external.total ?? 0} calls`}
            tone="ok"
          />
          <MetricCard
            label="Email success"
            value={`${email.success_pct ?? 100}%`}
            hint={`${email.total ?? 0} messages`}
          />
          <MetricCard
            label="Failed requests"
            value={String(
              (internal.failed || 0) + (external.failed || 0) + (email.failed || 0),
            )}
            hint="In selected range"
            tone="danger"
          />
          <MetricCard
            label="Auth failures"
            value={String(summary.authentication_failures ?? 0)}
            hint="401 / session issues"
            tone="danger"
          />
        </div>
      )}

      <Card className="flex flex-col gap-4">
        <div className="flex flex-wrap items-center gap-2">
          {(
            [
              { key: "internal", label: "Internal API", icon: Activity },
              { key: "external", label: "External API", icon: ShieldAlert },
              { key: "email", label: "Email", icon: Mail },
            ] as const
          ).map((item) => {
            const Icon = item.icon;
            return (
              <button
                key={item.key}
                type="button"
                onClick={() => {
                  setTab(item.key);
                  setPage(1);
                  setSelected(null);
                }}
                className={clsx(
                  "inline-flex items-center gap-2 rounded-xl px-3 py-2 text-sm font-semibold transition",
                  tab === item.key
                    ? "bg-primary text-white"
                    : "bg-[var(--mt-bg)] text-[var(--mt-text)] hover:bg-primary/10",
                )}
              >
                <Icon size={16} />
                {item.label}
              </button>
            );
          })}
          <div className="ml-auto flex flex-wrap items-center gap-2">
            <Button variant="secondary" onClick={() => void onExport()}>
              <Download size={16} />
              Export CSV
            </Button>
          </div>
        </div>

        <div className="grid gap-2 md:grid-cols-4">
          <label className="relative md:col-span-2">
            <Search
              size={16}
              className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-muted"
            />
            <input
              value={search}
              onChange={(e) => {
                setSearch(e.target.value);
                setPage(1);
              }}
              placeholder="Search feature, endpoint, message…"
              className="w-full rounded-xl border border-[var(--mt-border)] bg-[var(--mt-bg)] py-2 pl-9 pr-3 text-sm text-[var(--mt-text)] outline-none focus:border-primary"
            />
          </label>
          <select
            value={preset}
            onChange={(e) => {
              setPreset(e.target.value);
              setPage(1);
            }}
            className="rounded-xl border border-[var(--mt-border)] bg-[var(--mt-bg)] px-3 py-2 text-sm text-[var(--mt-text)]"
          >
            {PRESETS.map((p) => (
              <option key={p.value} value={p.value}>
                {p.label}
              </option>
            ))}
          </select>
          <select
            value={successFilter}
            onChange={(e) => {
              setSuccessFilter(e.target.value);
              setPage(1);
            }}
            className="rounded-xl border border-[var(--mt-border)] bg-[var(--mt-bg)] px-3 py-2 text-sm text-[var(--mt-text)]"
          >
            <option value="">All statuses</option>
            <option value="true">Success only</option>
            <option value="false">Failed only</option>
          </select>
        </div>

        {activeQuery.isLoading ? (
          <LoadingState label="Loading logs…" />
        ) : activeQuery.isError ? (
          <ErrorState
            message={getErrorMessage(activeQuery.error, "Unable to load logs")}
            onRetry={() => void activeQuery.refetch()}
          />
        ) : rows.length === 0 ? (
          <div className="flex flex-col items-center gap-2 py-12 text-center text-muted">
            <Clock3 size={28} />
            <p>No logs found for this filter.</p>
          </div>
        ) : (
          <div className="overflow-auto rounded-xl border border-[var(--mt-border)]">
            <table className="min-w-full text-left text-sm">
              <thead className="sticky top-0 bg-[var(--mt-bg)] text-xs uppercase tracking-wide text-muted">
                <tr>
                  <th className="px-3 py-2">When</th>
                  <th className="px-3 py-2">Feature</th>
                  <th className="px-3 py-2">
                    {tab === "email" ? "Recipient" : "Endpoint"}
                  </th>
                  <th className="px-3 py-2">Status</th>
                  <th className="px-3 py-2">Message</th>
                  <th className="px-3 py-2">Duration</th>
                </tr>
              </thead>
              <tbody>
                {rows.map((row) => {
                  const when =
                    row.started_at || row.executed_at || row.sent_at || row.created_at;
                  return (
                    <tr
                      key={String(row.id)}
                      className="cursor-pointer border-t border-[var(--mt-border)] hover:bg-primary/5"
                      onClick={() => setSelected(row)}
                    >
                      <td className="whitespace-nowrap px-3 py-2 text-[var(--mt-text)]">
                        {when ? new Date(String(when)).toLocaleString() : "—"}
                      </td>
                      <td className="px-3 py-2 text-[var(--mt-text)]">
                        {String(row.feature || "—")}
                      </td>
                      <td className="max-w-[240px] truncate px-3 py-2 text-[var(--mt-text)]">
                        {tab === "email"
                          ? String(row.recipient || "—")
                          : String(row.endpoint || row.api_name || "—")}
                      </td>
                      <td className="px-3 py-2">
                        <StatusBadge success={Boolean(row.success)} />
                      </td>
                      <td className="max-w-[280px] truncate px-3 py-2 text-muted">
                        {Boolean(row.success) ? (
                          String(row.friendly_message || "OK")
                        ) : (
                          <span className="inline-flex items-center gap-1 text-rose-600 dark:text-rose-300">
                            <AlertTriangle size={14} />
                            {String(row.friendly_message || "Failed")}
                          </span>
                        )}
                      </td>
                      <td className="px-3 py-2 text-muted">
                        {row.duration_ms != null ? `${row.duration_ms} ms` : "—"}
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}

        <div className="flex items-center justify-between text-sm text-muted">
          <span>{pagination.total_rows ?? 0} rows</span>
          <div className="flex items-center gap-2">
            <Button
              variant="secondary"
              disabled={page <= 1}
              onClick={() => setPage((p) => Math.max(1, p - 1))}
            >
              Previous
            </Button>
            <span>
              Page {pagination.page_number ?? page} / {pagination.total_pages ?? 1}
            </span>
            <Button
              variant="secondary"
              disabled={page >= (pagination.total_pages || 1)}
              onClick={() => setPage((p) => p + 1)}
            >
              Next
            </Button>
          </div>
        </div>
      </Card>

      <DetailDrawer
        open={Boolean(selected)}
        onClose={() => setSelected(null)}
        row={selected}
        tab={tab}
      />
    </div>
  );
}
