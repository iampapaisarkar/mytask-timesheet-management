import { Link, useParams } from "react-router-dom";
import { useQuery } from "@tanstack/react-query";
import { subscriptionApi } from "@mytask/api";
import { ROUTES } from "@mytask/constants";
import { getErrorMessage } from "@mytask/utils";
import type { BillingHistoryItem } from "@mytask/types";
import { Button } from "@/components/ui/Button";
import { Card, PageHeader } from "@/components/ui/Card";
import { ErrorState, LoadingState } from "@/components/ui/States";
import { useToastStore } from "@/store/toastStore";
import { Download } from "lucide-react";

function formatMoney(cents: number, currency = "usd") {
  return new Intl.NumberFormat("en-US", {
    style: "currency",
    currency: (currency || "usd").toUpperCase(),
  }).format(cents / 100);
}

function formatDate(iso?: string | null) {
  if (!iso) return "—";
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) return "—";
  return d.toLocaleDateString(undefined, {
    day: "2-digit",
    month: "short",
    year: "numeric",
  });
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

/** Same content model as the myTask PDF / HTML invoice (not Stripe). */
export function BillingInvoicePage() {
  const { id } = useParams<{ id: string }>();
  const toast = useToastStore();
  const { data, isLoading, isError, error, refetch } = useQuery({
    queryKey: ["subscription", "invoice", id],
    queryFn: async ({ signal }) => {
      const res = await subscriptionApi.getInvoice(id!, { signal });
      return res.data.data as BillingHistoryItem;
    },
    enabled: Boolean(id),
  });

  if (isLoading) return <LoadingState label="Loading invoice…" />;
  if (isError || !data) {
    return (
      <ErrorState
        message={
          error instanceof Error ? error.message : "Failed to load invoice"
        }
        onRetry={() => void refetch()}
      />
    );
  }

  const invoiceNo = data.invoice_number || `INV-${data.id}`;
  const amount = formatMoney(data.amount_cents, data.currency);
  const description =
    data.line_description ||
    `${data.plan?.name || "Pro"} subscription`;

  return (
    <div className="mx-auto flex w-full max-w-2xl flex-col gap-6">
      <PageHeader
        title={invoiceNo}
        description="myTask subscription invoice"
        actions={
          <div className="flex w-full flex-wrap gap-2 sm:w-auto">
            <Button
              variant="secondary"
              className="min-h-11 flex-1 sm:flex-none"
              onClick={async () => {
                try {
                  await downloadInvoicePdf(data.id);
                  toast.success("Invoice PDF downloaded");
                } catch (err) {
                  toast.error("Download failed", getErrorMessage(err));
                }
              }}
            >
              <Download size={14} className="mr-1.5" />
              Download PDF
            </Button>
            <Link to={ROUTES.billingHistory} className="flex-1 sm:flex-none">
              <Button variant="ghost" className="min-h-11 w-full">
                Back to history
              </Button>
            </Link>
          </div>
        }
      />

      <Card className="overflow-hidden p-0">
        <div className="flex flex-wrap items-start justify-between gap-4 bg-primary px-5 py-5 text-white">
          <div>
            <h2 className="text-xl font-bold">myTask</h2>
            <p className="mt-1 text-sm text-white/90">Subscription invoice</p>
          </div>
          <div className="text-right">
            <p className="text-lg font-bold">{invoiceNo}</p>
            <span className="mt-2 inline-block rounded-full bg-white/20 px-2.5 py-1 text-xs font-semibold capitalize">
              {String(data.status || "").replace(/_/g, " ")}
            </span>
          </div>
        </div>

        <div className="grid gap-4 p-5 sm:grid-cols-2">
          <div>
            <p className="text-[11px] font-bold uppercase tracking-wide text-muted">
              Bill to
            </p>
            <p className="mt-1 font-semibold text-[var(--mt-text)]">
              {data.bill_to_name || "—"}
            </p>
            <p className="mt-0.5 text-sm text-muted">
              {data.bill_to_email || "—"}
            </p>
          </div>
          <div>
            <p className="text-[11px] font-bold uppercase tracking-wide text-muted">
              Paid on
            </p>
            <p className="mt-1 font-semibold text-[var(--mt-text)]">
              {formatDate(data.paid_at || data.created_at)}
            </p>
            <p className="mt-3 text-[11px] font-bold uppercase tracking-wide text-muted">
              Period
            </p>
            <p className="mt-1 font-semibold text-[var(--mt-text)]">
              {formatDate(data.period_start)} → {formatDate(data.period_end)}
            </p>
          </div>
          <div>
            <p className="text-[11px] font-bold uppercase tracking-wide text-muted">
              Plan
            </p>
            <p className="mt-1 font-semibold text-[var(--mt-text)]">
              {data.plan?.name || "Pro"}
              {data.billing_cycle ? ` · ${data.billing_cycle}` : ""}
            </p>
          </div>
          <div>
            <p className="text-[11px] font-bold uppercase tracking-wide text-muted">
              Payment
            </p>
            <p className="mt-1 font-semibold text-[var(--mt-text)]">
              {data.payment_method || "Card"}
            </p>
          </div>
        </div>

        <div className="border-t border-border">
          <div className="grid grid-cols-[1fr_auto] bg-primary-muted px-5 py-2.5 text-[11px] font-bold uppercase tracking-wide text-primary">
            <span>Description</span>
            <span>Amount</span>
          </div>
          <div className="grid grid-cols-[1fr_auto] gap-3 border-b border-border px-5 py-3.5 text-sm">
            <span className="text-[var(--mt-text)]">{description}</span>
            <span className="font-semibold text-[var(--mt-text)]">{amount}</span>
          </div>
          <div className="px-5 py-4 text-right text-lg font-bold text-primary">
            Total paid {amount}
          </div>
          <p className="px-5 pb-5 text-xs text-muted">
            Generated by myTask. Card payments are processed by Stripe; this is
            your myTask billing record.
          </p>
        </div>
      </Card>
    </div>
  );
}
