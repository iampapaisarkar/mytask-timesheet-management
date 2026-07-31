import { Link } from "react-router-dom";
import {
  useBillingPortal,
  useCancelSubscription,
  useCurrentSubscription,
} from "@mytask/hooks";
import { ROUTES } from "@mytask/constants";
import { getErrorMessage } from "@mytask/utils";
import { Button } from "@/components/ui/Button";
import { Card, PageHeader } from "@/components/ui/Card";
import { ErrorState, LoadingState } from "@/components/ui/States";
import { useToastStore } from "@/store/toastStore";
import { useState } from "react";

export function SubscriptionPage() {
  const toast = useToastStore();
  const { data, isLoading, isError, error, refetch } = useCurrentSubscription();
  const portal = useBillingPortal();
  const cancelSub = useCancelSubscription();
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
          <Link to={ROUTES.pricing}>
            <Button variant="soft">View pricing</Button>
          </Link>
        }
      />

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
              Status: <span className="font-medium text-[var(--mt-text)]">{data.status}</span>
              {" · "}
              Payment: {data.payment_status}
              {data.billing_interval !== "none"
                ? ` · ${data.billing_interval}ly`
                : null}
            </p>
            {data.current_period_end ? (
              <p className="mt-1 text-sm text-muted">
                {data.cancel_at_period_end ? "Ends" : "Renews"}{" "}
                {new Date(data.current_period_end).toLocaleString()}
              </p>
            ) : null}
          </div>
          {data.is_pro ? (
            <span className="rounded-full bg-primary-muted px-3 py-1 text-xs font-semibold text-primary">
              Active Pro
            </span>
          ) : (
            <span className="rounded-full bg-[var(--mt-surface-2)] px-3 py-1 text-xs font-semibold text-muted">
              Free
            </span>
          )}
        </div>

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
                Billing information
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
              Cancel at period end? You keep Pro until then; Free limits apply afterwards.
            </p>
            <div className="mt-3 flex gap-2">
              <Button
                variant="danger"
                loading={cancelSub.isPending}
                onClick={async () => {
                  try {
                    await cancelSub.mutateAsync({ immediate: false });
                    toast.success("Cancellation scheduled");
                    setConfirmCancel(false);
                    void refetch();
                  } catch (err) {
                    toast.error("Cancel failed", getErrorMessage(err));
                  }
                }}
              >
                Confirm
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
