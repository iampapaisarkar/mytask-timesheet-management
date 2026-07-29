import { Link, useParams } from "react-router-dom";
import type { UseQueryResult } from "@tanstack/react-query";
import { EmptyState, ErrorState, LoadingState } from "@/components/ui/States";
import { PageHeader } from "@/components/ui/Card";
import { Button } from "@/components/ui/Button";

type Row = Record<string, unknown> & { id?: string | number };

export function ResourceListPage({
  title,
  query,
  columns,
  detailPath,
  createLabel,
}: {
  title: string;
  query: UseQueryResult<unknown>;
  columns: { key: string; label: string }[];
  detailPath?: (orgCode: string, id: string | number) => string;
  createLabel?: string;
}) {
  const { orgCode = "" } = useParams();
  const rows = (Array.isArray(query.data) ? query.data : []) as Row[];

  if (query.isLoading) return <LoadingState />;
  if (query.isError) {
    return (
      <ErrorState
        message={query.error instanceof Error ? query.error.message : "Failed to load"}
        onRetry={() => query.refetch()}
      />
    );
  }

  return (
    <div className="mt-fade-in flex flex-col gap-4">
      <PageHeader
        title={title}
        actions={
          createLabel ? (
            <Button type="button">{createLabel}</Button>
          ) : undefined
        }
      />
      {!rows.length ? (
        <EmptyState title={`No ${title.toLowerCase()} found`} />
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
              </tr>
            </thead>
            <tbody>
              {rows.map((row, idx) => {
                const id = (row.id ?? idx) as string | number;
                return (
                  <tr
                    key={String(id)}
                    className="border-b border-border last:border-0 transition hover:bg-primary-muted/40"
                  >
                    {columns.map((col, colIdx) => {
                      const cell = (
                        <td key={col.key} className="px-4 py-3 text-[var(--mt-text)]">
                          {formatCell(row[col.key])}
                        </td>
                      );
                      if (detailPath && colIdx === 0) {
                        return (
                          <td key={col.key} className="px-4 py-3">
                            <Link
                              to={detailPath(orgCode, id)}
                              className="font-medium text-primary hover:underline"
                            >
                              {formatCell(row[col.key])}
                            </Link>
                          </td>
                        );
                      }
                      return cell;
                    })}
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

function formatCell(value: unknown): string {
  if (value == null) return "—";
  if (typeof value === "object") return JSON.stringify(value);
  return String(value);
}
