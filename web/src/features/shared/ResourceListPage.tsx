import { Link, useParams } from "react-router-dom";
import type { UseQueryResult } from "@tanstack/react-query";
import { EmptyState, ErrorState, LoadingState } from "@/components/ui/States";

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
    <div className="flex flex-col gap-4">
      <div className="flex items-center justify-between gap-3">
        <h1 className="text-2xl font-semibold">{title}</h1>
        {createLabel ? (
          <button
            type="button"
            className="rounded-md bg-primary px-3 py-2 text-sm font-medium text-white"
          >
            {createLabel}
          </button>
        ) : null}
      </div>
      {!rows.length ? (
        <EmptyState title={`No ${title.toLowerCase()} found`} />
      ) : (
        <div className="overflow-x-auto rounded-lg border border-border bg-white">
          <table className="min-w-full text-left text-sm">
            <thead className="border-b border-border bg-page text-muted">
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
                    className="border-b border-border last:border-0 hover:bg-page/80"
                  >
                    {columns.map((col, colIdx) => {
                      const cell = (
                        <td key={col.key} className="px-4 py-3 text-dark">
                          {formatCell(row[col.key])}
                        </td>
                      );
                      if (detailPath && colIdx === 0) {
                        return (
                          <td key={col.key} className="px-4 py-3 text-dark">
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
