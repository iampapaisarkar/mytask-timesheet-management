import type { ReactNode } from "react";
import { Link, useParams } from "react-router-dom";
import type { UseQueryResult } from "@tanstack/react-query";
import { getErrorMessage } from "@mytask/utils";
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

export function ResourceListPage({
  title,
  query,
  columns,
  detailPath,
  createLabel,
  onCreate,
  onRowClick,
  rowActions,
}: {
  title: string;
  query: UseQueryResult<unknown>;
  columns: ColumnDef[];
  detailPath?: (orgCode: string, id: string | number) => string;
  createLabel?: string;
  onCreate?: () => void;
  onRowClick?: (row: Row) => void;
  rowActions?: (row: Row) => ReactNode;
}) {
  const { orgCode = "" } = useParams();
  const rows = (Array.isArray(query.data) ? query.data : []) as Row[];

  if (query.isLoading) return <LoadingState />;
  if (query.isError) {
    return (
      <ErrorState
        message={getErrorMessage(query.error, "Failed to load")}
        onRetry={() => query.refetch()}
      />
    );
  }

  return (
    <div className="mt-fade-in flex flex-col gap-4">
      <PageHeader
        title={title}
        actions={
          <div className="flex flex-wrap items-center gap-2">
            {createLabel ? (
              <Button type="button" onClick={onCreate} disabled={!onCreate}>
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
        <div className="mt-card overflow-x-auto">
          <table className="min-w-full text-left text-sm">
            <thead className="border-b border-border bg-[var(--mt-bg)] text-muted">
              <tr>
                {columns.map((col) => (
                  <th key={col.key} className="px-4 py-3 font-medium">
                    {col.label}
                  </th>
                ))}
                {rowActions ? (
                  <th className="px-4 py-3 font-medium">Actions</th>
                ) : null}
              </tr>
            </thead>
            <tbody>
              {rows.map((row, idx) => {
                const id = getRowId(row, idx);
                return (
                  <tr
                    key={String(id)}
                    className={`border-b border-border last:border-0 transition hover:bg-primary-muted/40 ${
                      onRowClick ? "cursor-pointer" : ""
                    }`}
                    onClick={
                      onRowClick
                        ? () => {
                            onRowClick(row);
                          }
                        : undefined
                    }
                  >
                    {columns.map((col, colIdx) => {
                      const raw =
                        typeof col.accessor === "function"
                          ? col.accessor(row)
                          : getByPath(row, col.accessor || col.key);
                      const text = formatCell(raw);
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
                    {rowActions ? (
                      <td
                        className="px-4 py-3"
                        onClick={(e) => e.stopPropagation()}
                      >
                        {rowActions(row)}
                      </td>
                    ) : null}
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}
