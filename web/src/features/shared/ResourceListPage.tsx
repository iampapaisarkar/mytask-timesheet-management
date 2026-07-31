import type { ReactNode } from "react";
import { Link, useNavigate, useParams } from "react-router-dom";
import type { UseQueryResult } from "@tanstack/react-query";
import { getErrorMessage, listPagination, listRows } from "@mytask/utils";
import { EmptyState, ErrorState, LoadingState } from "@/components/ui/States";
import { PageHeader } from "@/components/ui/Card";
import { Button } from "@/components/ui/Button";

export type ColumnDef = {
  key: string;
  label: string;
  /** Dot-path or custom getter. Defaults to `key`. */
  accessor?: string | ((row: Row) => unknown);
};

export type Row = Record<string, unknown> & { id?: string | number };

function getByPath(row: Row, path: string): unknown {
  return path.split(".").reduce<unknown>((acc, part) => {
    if (acc == null || typeof acc !== "object") return undefined;
    return (acc as Record<string, unknown>)[part];
  }, row);
}

export function formatCell(value: unknown): string {
  if (value == null || value === "") return "—";
  if (
    typeof value === "string" ||
    typeof value === "number" ||
    typeof value === "boolean"
  ) {
    return String(value);
  }
  if (Array.isArray(value)) {
    return value.length ? value.map((v) => formatCell(v)).join(", ") : "—";
  }
  if (typeof value === "object") {
    const obj = value as Record<string, unknown>;
    if (typeof obj.name === "string") return obj.name;
    if (typeof obj.code === "string") return obj.code;
    if (typeof obj.label === "string") return obj.label;
    if (typeof obj.full_name === "string") return obj.full_name;
    if (typeof obj.period_range === "string") return obj.period_range;
    if (typeof obj.email === "string") return obj.email;
    return "—";
  }
  return String(value);
}

export function getRowId(row: Row, index: number): string | number {
  if (row.id != null) return row.id as string | number;
  const details = row.details as Row | undefined;
  if (details?.id != null) return details.id as string | number;
  return index;
}

function cellValue(row: Row, col: ColumnDef): string {
  const raw =
    typeof col.accessor === "function"
      ? col.accessor(row)
      : getByPath(row, col.accessor || col.key);
  return formatCell(raw);
}

export function ResourceListPage({
  title,
  query,
  columns,
  detailPath,
  createLabel,
  onCreate,
  onRowClick,
  rowActions,
  page = 1,
  onPageChange,
}: {
  title: string;
  query: UseQueryResult<unknown>;
  columns: ColumnDef[];
  detailPath?: (orgCode: string, id: string | number) => string;
  createLabel?: string;
  onCreate?: () => void;
  onRowClick?: (row: Row) => void;
  rowActions?: (row: Row) => ReactNode;
  page?: number;
  onPageChange?: (page: number) => void;
}) {
  const { orgCode = "" } = useParams();
  const navigate = useNavigate();
  const rows = listRows<Row>(query.data);
  const pagination = listPagination(query.data);
  const totalPages = Math.max(1, Number(pagination?.total_pages) || 1);
  const totalRows = Number(pagination?.total_rows) || rows.length;
  const currentPage = Number(pagination?.page_number) || page;

  if (query.isLoading) return <LoadingState />;
  if (query.isError) {
    return (
      <ErrorState
        message={getErrorMessage(query.error, "Failed to load")}
        onRetry={() => query.refetch()}
      />
    );
  }

  function handleRowActivate(row: Row, index: number) {
    if (onRowClick) {
      onRowClick(row);
      return;
    }
    if (detailPath) {
      navigate(detailPath(orgCode, getRowId(row, index)));
    }
  }

  const showActions = Boolean(rowActions || detailPath);

  return (
    <div className="mt-fade-in flex flex-col gap-4">
      <PageHeader
        title={title}
        actions={
          <div className="flex w-full flex-wrap items-center gap-2 sm:w-auto">
            {createLabel ? (
              <Button
                type="button"
                onClick={onCreate}
                disabled={!onCreate}
                className="min-h-11 w-full sm:w-auto"
              >
                {createLabel}
              </Button>
            ) : null}
          </div>
        }
      />
      {!rows.length ? (
        <EmptyState
          title={`No ${title.toLowerCase()} found`}
          description={
            createLabel && onCreate
              ? "Create your first entry to get started."
              : undefined
          }
          action={
            createLabel && onCreate ? (
              <Button type="button" onClick={onCreate}>
                {createLabel}
              </Button>
            ) : undefined
          }
        />
      ) : (
        <>
          {/* Mobile: stacked cards */}
          <div className="flex flex-col gap-3 md:hidden">
            {rows.map((row, idx) => {
              const id = getRowId(row, idx);
              const canOpen = Boolean(onRowClick || detailPath);
              const primary = columns[0] ? cellValue(row, columns[0]) : String(id);
              const rest = columns.slice(1);
              return (
                <div
                  key={String(id)}
                  role={canOpen ? "button" : undefined}
                  tabIndex={canOpen ? 0 : undefined}
                  onClick={
                    canOpen ? () => handleRowActivate(row, idx) : undefined
                  }
                  onKeyDown={(e) => {
                    if (!canOpen) return;
                    if (e.key === "Enter" || e.key === " ") {
                      e.preventDefault();
                      handleRowActivate(row, idx);
                    }
                  }}
                  className={`mt-card p-4 transition ${
                    canOpen
                      ? "cursor-pointer hover:border-primary/40 active:bg-primary-muted/30"
                      : ""
                  }`}
                >
                  <div className="flex items-start justify-between gap-3">
                    <div className="min-w-0 flex-1">
                      {detailPath ? (
                        <Link
                          to={detailPath(orgCode, id)}
                          className="block truncate text-base font-semibold text-primary hover:underline"
                          onClick={(e) => e.stopPropagation()}
                        >
                          {primary}
                        </Link>
                      ) : (
                        <p className="truncate text-base font-semibold text-[var(--mt-text)]">
                          {primary}
                        </p>
                      )}
                    </div>
                    {showActions ? (
                      <div
                        className="flex shrink-0 items-center gap-2"
                        onClick={(e) => e.stopPropagation()}
                      >
                        {rowActions ? rowActions(row) : null}
                        {detailPath ? (
                          <Link
                            to={detailPath(orgCode, id)}
                            className="inline-flex min-h-10 items-center rounded-xl px-2 text-sm font-medium text-primary hover:underline"
                          >
                            Open
                          </Link>
                        ) : null}
                      </div>
                    ) : null}
                  </div>
                  {rest.length ? (
                    <dl className="mt-3 grid grid-cols-1 gap-2 sm:grid-cols-2">
                      {rest.map((col) => (
                        <div key={col.key} className="min-w-0">
                          <dt className="text-[11px] font-medium uppercase tracking-wide text-muted">
                            {col.label}
                          </dt>
                          <dd className="mt-0.5 break-words text-sm text-[var(--mt-text)]">
                            {cellValue(row, col)}
                          </dd>
                        </div>
                      ))}
                    </dl>
                  ) : null}
                </div>
              );
            })}
          </div>

          {/* Desktop: table */}
          <div className="mt-card hidden overflow-x-auto md:block">
            <table className="min-w-full text-left text-sm">
              <thead className="border-b border-border bg-[var(--mt-bg)] text-muted">
                <tr>
                  {columns.map((col) => (
                    <th key={col.key} className="px-4 py-3 font-medium">
                      {col.label}
                    </th>
                  ))}
                  {showActions ? (
                    <th className="px-4 py-3 font-medium">Actions</th>
                  ) : null}
                </tr>
              </thead>
              <tbody>
                {rows.map((row, idx) => {
                  const id = getRowId(row, idx);
                  const canOpen = Boolean(onRowClick || detailPath);
                  return (
                    <tr
                      key={String(id)}
                      className={`border-b border-border last:border-0 transition hover:bg-primary-muted/40 ${
                        canOpen ? "cursor-pointer" : ""
                      }`}
                      onClick={
                        canOpen ? () => handleRowActivate(row, idx) : undefined
                      }
                    >
                      {columns.map((col, colIdx) => {
                        const text = cellValue(row, col);
                        if (detailPath && colIdx === 0) {
                          return (
                            <td key={col.key} className="px-4 py-3">
                              <Link
                                to={detailPath(orgCode, id)}
                                className="font-medium text-primary hover:underline"
                                onClick={(e) => e.stopPropagation()}
                              >
                                {text}
                              </Link>
                            </td>
                          );
                        }
                        return (
                          <td
                            key={col.key}
                            className="px-4 py-3 text-[var(--mt-text)]"
                          >
                            {text}
                          </td>
                        );
                      })}
                      {showActions ? (
                        <td
                          className="px-4 py-3"
                          onClick={(e) => e.stopPropagation()}
                        >
                          <div className="flex items-center gap-3">
                            {rowActions ? rowActions(row) : null}
                            {detailPath ? (
                              <Link
                                to={detailPath(orgCode, id)}
                                className="text-sm font-medium text-primary hover:underline"
                              >
                                Open
                              </Link>
                            ) : null}
                          </div>
                        </td>
                      ) : null}
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        </>
      )}
      {onPageChange && (rows.length > 0 || totalRows > 0) ? (
        <div className="flex flex-col gap-3 text-sm text-muted sm:flex-row sm:items-center sm:justify-between">
          <span className="text-center sm:text-left">
            {totalRows} total · page {currentPage} of {totalPages}
          </span>
          <div className="flex items-center justify-center gap-2 sm:justify-end">
            <Button
              type="button"
              variant="secondary"
              className="min-h-11 flex-1 sm:flex-none"
              disabled={currentPage <= 1 || query.isFetching}
              onClick={() => onPageChange(Math.max(1, currentPage - 1))}
            >
              Previous
            </Button>
            <Button
              type="button"
              variant="secondary"
              className="min-h-11 flex-1 sm:flex-none"
              disabled={currentPage >= totalPages || query.isFetching}
              onClick={() =>
                onPageChange(Math.min(totalPages, currentPage + 1))
              }
            >
              Next
            </Button>
          </div>
        </div>
      ) : null}
    </div>
  );
}
