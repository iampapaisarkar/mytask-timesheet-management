import { Link } from "react-router-dom";
import {
  useBillingPortal,
  useCancelSubscription,
  useCurrentSubscription,
  useSyncSubscription,
} from "@mytask/hooks";
import { ROUTES } from "@mytask/constants";
import { getErrorMessage } from "@mytask/utils";
import type { SubscriptionView } from "@mytask/types";
import { Button } from "@/components/ui/Button";
import { Card, PageHeader } from "@/components/ui/Card";
import { ErrorState, LoadingState } from "@/components/ui/States";
import { useToastStore } from "@/store/toastStore";
import { useState } from "react";

function formatDate(value?: string | null) {
  if (!value) return "—";
  const d = new Date(value);
  if (Number.isNaN(d.getTime())) return "—";
  return d.toLocaleString(undefined, {
    dateStyle: "medium",
    timeStyle: "short",
  });
}

function formatDateOnly(value?: string | null) {
  if (!value) return "—";
  const d = new Date(value);
  if (Number.isNaN(d.getTime())) return "—";
  return d.toLocaleDateString(undefined, {
    weekday: "short",
    year: "numeric",
    month: "short",
    day: "numeric",
  });
}

function statusLabel(status: string) {
  return status.replace(/_/g, " ");
}

export function SubscriptionPage() {
  const toast = useToastStore();
  const { data, isLoading, isError, error, refetch } = useCurrentSubscription();
  const portal = useBillingPortal();
  const cancelSub = useCancelSubscription();
  const sync = useSyncSubscription();
  const [confirmCancel, setConfirmCancel] = useState(false);

  if (isLoading) return <LoadingState label="Loading subscription…" />;
  if (isError || !data) {
    return (
      <ErrorState
        message={error instanceof Error ? error.message : "Failed to load subscription"}
        onRetry={() => refetch()}
      />
    );
  }

  const usage = data.usage?.usage;

  return (
    <div className="mx-auto flex w-full max-w-3xl flex-col gap-6">
      <PageHeader
        title="Subscription"
        description="Your personal plan — not shared with invited teammates."
        actions={
          <div className="flex flex-wrap gap-2">
            <Button
              variant="ghost"
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
              Sync from Stripe
            </Button>
            <Link to={ROUTES.pricing}>
              <Button variant="soft">View pricing</Button>
            </Link>
          </div>
        }
      />

      {data.cancel_at_period_end && data.access_ends_at ? (
        <Card className="border-amber-500/40 bg-amber-500/10">
          <h3 className="font-semibold text-[var(--mt-text)]">
            Cancellation scheduled
          </h3>
          <p className="mt-1 text-sm text-muted">
            Your Pro access continues until{" "}
            <span className="font-semibold text-[var(--mt-text)]">
              {formatDate(data.access_ends_at)}
            </span>
            {data.days_until_period_end != null
              ? ` (${data.days_until_period_end} day${data.days_until_period_end === 1 ? "" : "s"} left)`
              : null}
            . After that you move to Free. Your data is preserved.
          </p>
        </Card>
      ) : null}

      <Card className="flex flex-col gap-4">
        <div className="flex flex-wrap items-start justify-between gap-3">
          <div>
            <div className="text-xs font-semibold uppercase tracking-wide text-primary">
              Current plan
            </div>
            <h2 className="text-2xl font-bold text-[var(--mt-text)]">
              {data.plan.name}
            </h2>
            <p className="mt-1 text-sm text-muted">
              {data.price_label || "$0"}
              {data.billing_interval !== "none"
                ? ` / ${data.billing_interval === "month" ? "month" : "year"}`
                : " · forever"}
            </p>
          </div>
          {data.is_pro ? (
            <span className="rounded-full bg-primary-muted px-3 py-1 text-xs font-semibold text-primary">
              {data.cancel_at_period_end ? "Cancelling" : "Active Pro"}
            </span>
          ) : (
            <span className="rounded-full bg-[var(--mt-surface-2)] px-3 py-1 text-xs font-semibold text-muted">
              Free
            </span>
          )}
        </div>

        <BillingDetailsGrid data={data} />

        <div className="flex flex-wrap gap-2">
          {!data.is_pro ? (
            <Link to={ROUTES.pricing}>
              <Button>Upgrade plan</Button>
            </Link>
          ) : (
            <>
              <Button
                variant="secondary"
                loading={portal.isPending}
                onClick={async () => {
                  try {
                    const res = await portal.mutateAsync({
                      return_url: `${window.location.origin}${ROUTES.subscription}`,
                    });
                    if (res?.portal_url) window.location.href = res.portal_url;
                  } catch (err) {
                    toast.error(
                      "Portal unavailable",
                      getErrorMessage(err, "Could not open Stripe billing portal"),
                    );
                  }
                }}
              >
                Manage billing
              </Button>
              {!data.cancel_at_period_end ? (
                <Button variant="danger" onClick={() => setConfirmCancel(true)}>
                  Cancel subscription
                </Button>
              ) : null}
            </>
          )}
          <Link to={ROUTES.billingHistory}>
            <Button variant="ghost">Billing history</Button>
          </Link>
        </div>

        {confirmCancel ? (
          <div className="rounded-xl border border-negative/30 bg-negative/5 p-4">
            <p className="text-sm text-[var(--mt-text)]">
              Cancel at the end of this billing period
              {data.current_period_end
                ? ` (${formatDateOnly(data.current_period_end)})`
                : ""}
              ? You keep Pro until then; Free limits apply afterwards. No further
              charges after that date.
            </p>
            <div className="mt-3 flex gap-2">
              <Button
                variant="danger"
                loading={cancelSub.isPending}
                onClick={async () => {
                  try {
                    await cancelSub.mutateAsync({ immediate: false });
                    toast.success(
                      "Cancellation scheduled",
                      data.current_period_end
                        ? `Access until ${formatDateOnly(data.current_period_end)}`
                        : undefined,
                    );
                    setConfirmCancel(false);
                    void refetch();
                  } catch (err) {
                    toast.error("Cancel failed", getErrorMessage(err));
                  }
                }}
              >
                Confirm cancel
              </Button>
              <Button variant="secondary" onClick={() => setConfirmCancel(false)}>
                Keep Pro
              </Button>
            </div>
          </div>
        ) : null}
      </Card>

      <Card>
        <h3 className="mb-3 text-lg font-semibold text-[var(--mt-text)]">Usage</h3>
        <div className="grid gap-3 sm:grid-cols-2">
          <UsageTile
            label="Organisations"
            used={usage?.organisations?.used}
            limit={usage?.organisations?.limit}
            remaining={usage?.organisations?.remaining}
          />
          <UsageTile
            label="Reports today"
            used={usage?.reports_today?.used}
            limit={usage?.reports_today?.limit}
            remaining={usage?.reports_today?.remaining}
          />
        </div>
        <h4 className="mb-2 mt-6 text-sm font-semibold text-[var(--mt-text)]">
          Plan limits
        </h4>
        <ul className="grid gap-1 text-sm text-muted sm:grid-cols-2">
          {Object.entries(data.plan.features || {}).map(([k, v]) => (
            <li key={k}>
              <span className="capitalize">{k.replace(/_/g, " ")}</span>:{" "}
              <span className="font-medium text-[var(--mt-text)]">
                {typeof v === "boolean" ? (v ? "Yes" : "No") : String(v)}
              </span>
            </li>
          ))}
        </ul>
      </Card>
    </div>
  );
}

function BillingDetailsGrid({ data }: { data: SubscriptionView }) {
  const rows: Array<{ label: string; value: string; emphasis?: boolean }> = [
    { label: "Plan", value: data.plan.name },
    {
      label: "Billing cycle",
      value: data.billing_interval_label || data.billing_interval,
    },
    {
      label: "Price",
      value:
        data.billing_interval === "none"
          ? `${data.price_label || "$0"} (free)`
          : `${data.price_label || "—"} / ${data.billing_interval === "month" ? "month" : "year"}`,
    },
    { label: "Subscription status", value: statusLabel(data.status) },
    { label: "Payment status", value: statusLabel(data.payment_status) },
    {
      label: "Current period starts",
      value: formatDate(data.current_period_start),
    },
    {
      label: "Current period ends",
      value: formatDate(data.current_period_end),
    },
  ];

  if (data.is_pro && !data.cancel_at_period_end) {
    rows.push({
      label: "Next billing date",
      value: formatDateOnly(data.next_billing_date || data.current_period_end),
      emphasis: true,
    });
    if (data.days_until_period_end != null) {
      rows.push({
        label: "Days until renewal",
        value: `${data.days_until_period_end} day${data.days_until_period_end === 1 ? "" : "s"}`,
      });
    }
  }

  if (data.cancel_at_period_end) {
    rows.push({
      label: "Cancels on",
      value: formatDateOnly(data.access_ends_at || data.current_period_end),
      emphasis: true,
    });
    rows.push({
      label: "Access until",
      value: formatDate(data.access_ends_at || data.current_period_end),
      emphasis: true,
    });
    if (data.days_until_period_end != null) {
      rows.push({
        label: "Days remaining on Pro",
        value: `${data.days_until_period_end} day${data.days_until_period_end === 1 ? "" : "s"}`,
      });
    }
    rows.push({
      label: "After cancellation",
      value: "Downgrade to Free (data kept)",
    });
  }

  if (data.canceled_at) {
    rows.push({ label: "Cancelled at", value: formatDate(data.canceled_at) });
  }
  if (data.ended_at) {
    rows.push({ label: "Ended at", value: formatDate(data.ended_at) });
  }
  if (data.trial_end) {
    rows.push({ label: "Trial ends", value: formatDate(data.trial_end) });
  }
  if (data.stripe_subscription_id) {
    rows.push({
      label: "Stripe subscription",
      value: data.stripe_subscription_id,
    });
  }

  return (
    <div className="grid gap-3 rounded-xl border border-border bg-[var(--mt-bg)] p-4 sm:grid-cols-2">
      {rows.map((row) => (
        <div key={row.label} className="min-w-0">
          <div className="text-xs font-semibold uppercase tracking-wide text-muted">
            {row.label}
          </div>
          <div
            className={`mt-1 break-words text-sm ${
              row.emphasis
                ? "font-semibold text-primary"
                : "font-medium text-[var(--mt-text)]"
            }`}
          >
            {row.value}
          </div>
        </div>
      ))}
    </div>
  );
}

function UsageTile({
  label,
  used,
  limit,
  remaining,
}: {
  label: string;
  used?: number;
  limit?: number | null;
  remaining?: number | null;
}) {
  return (
    <div className="rounded-xl border border-border bg-[var(--mt-bg)] p-4">
      <div className="text-xs font-semibold uppercase tracking-wide text-muted">
        {label}
      </div>
      <div className="mt-1 text-2xl font-bold text-[var(--mt-text)]">
        {used ?? 0}
        <span className="text-base font-medium text-muted">
          {" "}
          / {limit ?? "∞"}
        </span>
      </div>
      {remaining != null ? (
        <div className="mt-1 text-xs text-muted">{remaining} remaining</div>
      ) : null}
    </div>
  );
}
