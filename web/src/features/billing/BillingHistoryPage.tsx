import { Link } from "react-router-dom";
import { useBillingHistory } from "@mytask/hooks";
import { ROUTES } from "@mytask/constants";
import { Button } from "@/components/ui/Button";
import { Card, PageHeader } from "@/components/ui/Card";
import { EmptyState, ErrorState, LoadingState } from "@/components/ui/States";
import { ExternalLink } from "lucide-react";

function formatMoney(cents: number, currency = "usd") {
  return new Intl.NumberFormat("en-US", {
    style: "currency",
    currency: currency.toUpperCase(),
  }).format(cents / 100);
}

export function BillingHistoryPage() {
  const { data, isLoading, isError, error, refetch } = useBillingHistory({
    rows_per_page: 50,
  });

  if (isLoading) return <LoadingState label="Loading billing history…" />;
  if (isError) {
    return (
      <ErrorState
        message={error instanceof Error ? error.message : "Failed to load billing"}
        onRetry={() => refetch()}
      />
    );
  }

  const rows = data?.data || [];

  return (
    <div className="mx-auto flex w-full max-w-4xl flex-col gap-6">
      <PageHeader
        title="Billing history"
        description="Invoices and payments for your myTask subscription."
        actions={
          <Link to={ROUTES.subscription}>
            <Button variant="secondary">Back to subscription</Button>
          </Link>
        }
      />

      {!rows.length ? (
        <EmptyState
          title="No invoices yet"
          description="When you upgrade to Pro, invoices will appear here."
          action={
            <Link to={ROUTES.pricing}>
              <Button>See pricing</Button>
            </Link>
          }
        />
      ) : (
        <Card className="overflow-x-auto p-0">
          <table className="w-full min-w-[720px] text-left text-sm">
            <thead>
              <tr className="border-b border-border bg-[var(--mt-bg)] text-muted">
                <th className="px-4 py-3 font-medium">Invoice</th>
                <th className="px-4 py-3 font-medium">Plan</th>
                <th className="px-4 py-3 font-medium">Amount</th>
                <th className="px-4 py-3 font-medium">Status</th>
                <th className="px-4 py-3 font-medium">Date</th>
                <th className="px-4 py-3 font-medium">Payment</th>
                <th className="px-4 py-3 font-medium">Actions</th>
              </tr>
            </thead>
            <tbody>
              {rows.map((row) => (
                <tr key={String(row.id)} className="border-b border-border/70">
                  <td className="px-4 py-3 font-medium text-[var(--mt-text)]">
                    {row.invoice_number || `INV-${row.id}`}
                  </td>
                  <td className="px-4 py-3 text-muted">{row.plan?.name || "—"}</td>
                  <td className="px-4 py-3 text-[var(--mt-text)]">
                    {formatMoney(row.amount_cents, row.currency)}
                  </td>
                  <td className="px-4 py-3">
                    <span className="rounded-full bg-primary-muted px-2 py-0.5 text-xs font-semibold capitalize text-primary">
                      {row.status}
                    </span>
                  </td>
                  <td className="px-4 py-3 text-muted">
                    {row.paid_at || row.created_at
                      ? new Date(
                          String(row.paid_at || row.created_at),
                        ).toLocaleDateString()
                      : "—"}
                  </td>
                  <td className="px-4 py-3 text-muted">
                    {row.payment_method || "—"}
                  </td>
                  <td className="px-4 py-3">
                    <div className="flex gap-2">
                      {row.hosted_invoice_url ? (
                        <a
                          href={row.hosted_invoice_url}
                          target="_blank"
                          rel="noreferrer"
                          className="inline-flex items-center gap-1 text-xs font-semibold text-primary"
                        >
                          View <ExternalLink size={12} />
                        </a>
                      ) : null}
                      {row.invoice_pdf_url ? (
                        <a
                          href={row.invoice_pdf_url}
                          target="_blank"
                          rel="noreferrer"
                          className="inline-flex items-center gap-1 text-xs font-semibold text-primary"
                        >
                          PDF <ExternalLink size={12} />
                        </a>
                      ) : null}
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </Card>
      )}
    </div>
  );
}
