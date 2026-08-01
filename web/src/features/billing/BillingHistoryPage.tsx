import { Link } from "react-router-dom";
import { useState } from "react";
import { useBillingHistory, useSyncSubscription } from "@mytask/hooks";
import { subscriptionApi } from "@mytask/api";
import { ROUTES } from "@mytask/constants";
import { getErrorMessage } from "@mytask/utils";
import type { BillingHistoryItem } from "@mytask/types";
import { Button } from "@/components/ui/Button";
import { Card, PageHeader } from "@/components/ui/Card";
import { EmptyState, ErrorState, LoadingState } from "@/components/ui/States";
import { useToastStore } from "@/store/toastStore";
import { Download, ExternalLink } from "lucide-react";

function formatMoney(cents: number, currency = "usd") {
  return new Intl.NumberFormat("en-US", {
    style: "currency",
    currency: currency.toUpperCase(),
  }).format(cents / 100);
}

async function downloadInvoicePdf(id: string | number) {
  const res = await subscriptionApi.downloadInvoicePdf(id);
  const blob = res.data as Blob;
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = `invoice-${id}.pdf`;
  document.body.appendChild(a);
  a.click();
  a.remove();
  URL.revokeObjectURL(url);
}

function InvoiceActions({
  row,
}: {
  row: BillingHistoryItem;
}) {
  const toast = useToastStore();
  const [downloading, setDownloading] = useState(false);

  return (
    <div className="flex flex-wrap gap-2">
      <button
        type="button"
        disabled={downloading}
        onClick={async () => {
          try {
            setDownloading(true);
            await downloadInvoicePdf(row.id);
            toast.success("Invoice PDF downloaded");
          } catch (err) {
            toast.error("Download failed", getErrorMessage(err));
          } finally {
            setDownloading(false);
          }
        }}
        className="inline-flex min-h-10 items-center gap-1 rounded-lg bg-primary px-2.5 py-1.5 text-xs font-semibold text-white disabled:opacity-60"
      >
        <Download size={12} /> {downloading ? "Downloading…" : "Download PDF"}
      </button>
      <Link
        to={ROUTES.billingInvoice(row.id)}
        className="inline-flex min-h-10 items-center gap-1 text-xs font-semibold text-primary"
      >
        View <ExternalLink size={12} />
      </Link>
    </div>
  );
}

export function BillingHistoryPage() {
  const toast = useToastStore();
  const sync = useSyncSubscription();
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
          <div className="flex w-full flex-wrap gap-2 sm:w-auto">
            <Button
              variant="ghost"
              className="min-h-11 flex-1 sm:flex-none"
              loading={sync.isPending}
              onClick={async () => {
                try {
                  await sync.mutateAsync();
                  toast.success("Invoices synced from Stripe");
                  void refetch();
                } catch (err) {
                  toast.error("Sync failed", getErrorMessage(err));
                }
              }}
            >
              Sync invoices
            </Button>
            <Link to={ROUTES.subscription} className="flex-1 sm:flex-none">
              <Button variant="secondary" className="min-h-11 w-full">
                Back to subscription
              </Button>
            </Link>
          </div>
        }
      />

      {!rows.length ? (
        <EmptyState
          title="No invoices yet"
          description="If you already paid, tap Sync invoices. New Pro payments appear here automatically."
          action={
            <Button
              loading={sync.isPending}
              onClick={async () => {
                try {
                  await sync.mutateAsync();
                  toast.success("Synced from Stripe");
                  void refetch();
                } catch (err) {
                  toast.error("Sync failed", getErrorMessage(err));
                }
              }}
            >
              Sync invoices
            </Button>
          }
        />
      ) : (
        <>
          <div className="flex flex-col gap-3 md:hidden">
            {rows.map((row) => (
              <Card key={String(row.id)} className="p-4">
                <div className="flex items-start justify-between gap-2">
                  <div className="min-w-0">
                    <p className="font-semibold text-[var(--mt-text)]">
                      {row.invoice_number || `INV-${row.id}`}
                    </p>
                    <p className="text-sm text-muted">{row.plan?.name || "Pro"}</p>
                  </div>
                  <span className="rounded-full bg-primary-muted px-2 py-0.5 text-xs font-semibold capitalize text-primary">
                    {row.status}
                  </span>
                </div>
                <dl className="mt-3 grid grid-cols-2 gap-2 text-sm">
                  <div>
                    <dt className="text-[11px] uppercase text-muted">Amount</dt>
                    <dd className="font-medium">
                      {formatMoney(row.amount_cents, row.currency)}
                    </dd>
                  </div>
                  <div>
                    <dt className="text-[11px] uppercase text-muted">Date</dt>
                    <dd>
                      {row.paid_at || row.created_at
                        ? new Date(
                            String(row.paid_at || row.created_at),
                          ).toLocaleDateString()
                        : "—"}
                    </dd>
                  </div>
                  <div className="col-span-2">
                    <dt className="text-[11px] uppercase text-muted">Payment</dt>
                    <dd>{row.payment_method || "Card"}</dd>
                  </div>
                </dl>
                <div className="mt-3">
                  <InvoiceActions row={row} />
                </div>
              </Card>
            ))}
          </div>
          <Card className="hidden overflow-x-auto p-0 md:block">
            <table className="w-full min-w-[760px] text-left text-sm">
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
                    <td className="px-4 py-3 text-muted">
                      {row.plan?.name || "Pro"}
                    </td>
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
                      {row.payment_method || "Card"}
                    </td>
                    <td className="px-4 py-3">
                      <InvoiceActions row={row} />
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </Card>
        </>
      )}
    </div>
  );
}
