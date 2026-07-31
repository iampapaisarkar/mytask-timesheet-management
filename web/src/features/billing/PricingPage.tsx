import { useMemo, useState } from "react";
import { Link, useNavigate, useSearchParams } from "react-router-dom";
import {
  useCancelSubscription,
  useCreateCheckout,
  usePlansCatalogue,
} from "@mytask/hooks";
import { ROUTES } from "@mytask/constants";
import { getErrorMessage } from "@mytask/utils";
import type { PlanSummary } from "@mytask/types";
import { useAuthStore } from "@/store/authStore";
import { useToastStore } from "@/store/toastStore";
import { Button } from "@/components/ui/Button";
import { Card, PageHeader } from "@/components/ui/Card";
import { EmptyState, ErrorState, LoadingState } from "@/components/ui/States";
import { Check, Sparkles, X } from "lucide-react";

const FEATURE_ROWS: Array<{ key: string; label: string }> = [
  { key: "organisations", label: "Organisations" },
  { key: "employees_per_org", label: "Employees per organisation" },
  { key: "customers", label: "Customers" },
  { key: "jobs_per_customer", label: "Jobs per customer" },
  { key: "timesheets_per_employee_month", label: "Timesheets / employee / month" },
  { key: "reports_per_day", label: "Reports per day" },
  { key: "email_notifications", label: "Email notifications" },
  { key: "system_logs", label: "System logs" },
];

function formatMoney(cents: number, currency = "usd") {
  return new Intl.NumberFormat("en-US", {
    style: "currency",
    currency: currency.toUpperCase(),
  }).format(cents / 100);
}

function formatFeature(value: number | boolean | undefined) {
  if (typeof value === "boolean") return value ? "Included" : "—";
  if (typeof value === "number") return String(value);
  return "—";
}

export function PricingPage() {
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const token = useAuthStore((s) => s.token);
  const toast = useToastStore();
  const [interval, setInterval] = useState<"month" | "year">("month");
  const [confirmCancel, setConfirmCancel] = useState(false);

  const { data, isLoading, isError, error, refetch } = usePlansCatalogue();
  const checkout = useCreateCheckout();
  const cancelSub = useCancelSubscription();

  const plans = data?.plans || [];
  const current = data?.current_subscription || null;
  const freePlan = plans.find((p) => p.code === "free");
  const proPlan = plans.find((p) => p.code === "pro");

  const proPrice = useMemo(() => {
    if (!proPlan) return null;
    return (
      proPlan.prices.find((p) => p.billing_interval === interval) || null
    );
  }, [proPlan, interval]);

  const checkoutCancelled = searchParams.get("checkout") === "cancelled";

  async function requireAuthThen(path: string) {
    if (!token) {
      navigate(
        `${ROUTES.login}?redirect=${encodeURIComponent(path || ROUTES.pricing)}`,
      );
      return false;
    }
    return true;
  }

  async function onUpgrade() {
    if (!(await requireAuthThen(ROUTES.pricing))) return;
    try {
      const origin = window.location.origin;
      const session = await checkout.mutateAsync({
        billing_interval: interval,
        success_url: `${origin}${ROUTES.billingSuccess}?session_id={CHECKOUT_SESSION_ID}`,
        cancel_url: `${origin}${ROUTES.pricing}?checkout=cancelled`,
      });
      if (session?.checkout_url) {
        window.location.href = session.checkout_url;
      }
    } catch (err) {
      toast.error("Checkout failed", getErrorMessage(err, "Unable to start checkout"));
    }
  }

  async function onCancel() {
    try {
      await cancelSub.mutateAsync({ immediate: false });
      toast.success("Cancellation scheduled", "Pro remains active until period end");
      setConfirmCancel(false);
      void refetch();
    } catch (err) {
      toast.error("Cancel failed", getErrorMessage(err));
    }
  }

  if (isLoading) return <LoadingState label="Loading pricing…" />;
  if (isError) {
    return (
      <ErrorState
        message={error instanceof Error ? error.message : "Failed to load pricing"}
        onRetry={() => refetch()}
      />
    );
  }

  return (
    <div className="mx-auto flex w-full max-w-5xl flex-col gap-8">
      <PageHeader
        title="Pricing"
        description="Simple plans for growing timesheet teams. Subscriptions are per user — never shared."
      />

      {checkoutCancelled ? (
        <Card className="border-amber-500/30 bg-amber-500/5 text-sm">
          Checkout was cancelled. You can try again whenever you are ready.
        </Card>
      ) : null}

      {current ? (
        <Card className="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
          <div>
            <div className="text-xs font-semibold uppercase tracking-wide text-primary">
              Current plan
            </div>
            <div className="text-lg font-bold text-[var(--mt-text)]">
              {current.plan?.name || "Free"}
              {current.is_pro ? (
                <span className="ml-2 rounded-full bg-primary-muted px-2 py-0.5 text-xs font-semibold text-primary">
                  Active
                </span>
              ) : null}
            </div>
            {current.current_period_end ? (
              <p className="mt-1 text-sm text-muted">
                {current.cancel_at_period_end ? "Ends" : "Renews"}{" "}
                {new Date(current.current_period_end).toLocaleDateString()}
                {current.billing_interval !== "none"
                  ? ` · billed ${current.billing_interval}ly`
                  : null}
              </p>
            ) : (
              <p className="mt-1 text-sm text-muted">No payment required</p>
            )}
          </div>
          <div className="flex flex-wrap gap-2">
            <Link to={ROUTES.subscription}>
              <Button variant="secondary">Manage subscription</Button>
            </Link>
            <Link to={ROUTES.billingHistory}>
              <Button variant="ghost">Billing history</Button>
            </Link>
          </div>
        </Card>
      ) : null}

      <div className="flex justify-center">
        <div className="inline-flex rounded-2xl border border-border bg-[var(--mt-surface)] p-1">
          <button
            type="button"
            className={`rounded-xl px-4 py-2 text-sm font-semibold transition ${
              interval === "month"
                ? "bg-primary text-white"
                : "text-muted hover:text-[var(--mt-text)]"
            }`}
            onClick={() => setInterval("month")}
          >
            Monthly
          </button>
          <button
            type="button"
            className={`rounded-xl px-4 py-2 text-sm font-semibold transition ${
              interval === "year"
                ? "bg-primary text-white"
                : "text-muted hover:text-[var(--mt-text)]"
            }`}
            onClick={() => setInterval("year")}
          >
            Yearly
            <span className="ml-1 text-xs opacity-80">save ~17%</span>
          </button>
        </div>
      </div>

      <div className="grid gap-6 md:grid-cols-2">
        <PlanCard
          plan={freePlan}
          badge={current && !current.is_pro ? "Current plan" : null}
          ctaLabel={current?.is_pro ? "Included after Pro ends" : "Your plan"}
          ctaDisabled
          priceLabel="$0"
          priceHint="Forever free"
        />
        <PlanCard
          plan={proPlan}
          highlight
          badge={current?.is_pro ? "Active subscription" : "Most popular"}
          priceLabel={
            proPrice
              ? formatMoney(proPrice.amount_cents, proPrice.currency)
              : interval === "month"
                ? "$9.99"
                : "$99.99"
          }
          priceHint={interval === "month" ? "per month" : "per year"}
          ctaLabel={
            current?.is_pro
              ? current.cancel_at_period_end
                ? "Cancellation pending"
                : "Cancel subscription"
              : "Upgrade to Pro"
          }
          ctaDisabled={Boolean(current?.is_pro && current.cancel_at_period_end)}
          ctaLoading={checkout.isPending || cancelSub.isPending}
          onCta={() => {
            if (current?.is_pro) setConfirmCancel(true);
            else void onUpgrade();
          }}
          ctaVariant={current?.is_pro ? "danger" : "primary"}
        />
      </div>

      <Card className="overflow-x-auto">
        <h2 className="mb-4 text-lg font-semibold text-[var(--mt-text)]">
          Feature comparison
        </h2>
        {!freePlan && !proPlan ? (
          <EmptyState title="No plans configured" description="Ask an admin to seed plans." />
        ) : (
          <table className="w-full min-w-[480px] text-left text-sm">
            <thead>
              <tr className="border-b border-border text-muted">
                <th className="py-2 pr-4 font-medium">Feature</th>
                <th className="py-2 pr-4 font-medium">Free</th>
                <th className="py-2 font-medium">Pro</th>
              </tr>
            </thead>
            <tbody>
              {FEATURE_ROWS.map((row) => (
                <tr key={row.key} className="border-b border-border/60">
                  <td className="py-3 pr-4 text-[var(--mt-text)]">{row.label}</td>
                  <td className="py-3 pr-4 text-muted">
                    {formatFeature(freePlan?.features?.[row.key])}
                  </td>
                  <td className="py-3 font-medium text-[var(--mt-text)]">
                    {formatFeature(proPlan?.features?.[row.key])}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </Card>

      {confirmCancel ? (
        <Card className="border-negative/30 bg-negative/5">
          <h3 className="font-semibold text-[var(--mt-text)]">Cancel Pro?</h3>
          <p className="mt-1 text-sm text-muted">
            You keep Pro until the end of the billing period. Afterwards Free
            limits apply; your data is preserved.
          </p>
          <div className="mt-4 flex gap-2">
            <Button variant="danger" loading={cancelSub.isPending} onClick={() => void onCancel()}>
              Confirm cancel
            </Button>
            <Button variant="secondary" onClick={() => setConfirmCancel(false)}>
              Keep Pro
            </Button>
          </div>
        </Card>
      ) : null}
    </div>
  );
}

function PlanCard({
  plan,
  badge,
  priceLabel,
  priceHint,
  highlight,
  ctaLabel,
  ctaDisabled,
  ctaLoading,
  ctaVariant = "primary",
  onCta,
}: {
  plan?: PlanSummary;
  badge?: string | null;
  priceLabel: string;
  priceHint: string;
  highlight?: boolean;
  ctaLabel: string;
  ctaDisabled?: boolean;
  ctaLoading?: boolean;
  ctaVariant?: "primary" | "danger" | "secondary";
  onCta?: () => void;
}) {
  if (!plan) {
    return (
      <Card className="min-h-[280px]">
        <LoadingState label="…" />
      </Card>
    );
  }

  const featureEntries = Object.entries(plan.features || {}).slice(0, 6);

  return (
    <Card
      className={`relative flex flex-col gap-5 ${
        highlight ? "border-primary/50 shadow-lg shadow-primary/10 ring-1 ring-primary/20" : ""
      }`}
    >
      {badge ? (
        <span className="absolute right-4 top-4 rounded-full bg-primary-muted px-2.5 py-1 text-xs font-semibold text-primary">
          {badge}
        </span>
      ) : null}
      <div>
        <div className="flex items-center gap-2">
          {highlight ? <Sparkles size={18} className="text-primary" /> : null}
          <h3 className="text-xl font-bold text-[var(--mt-text)]">{plan.name}</h3>
        </div>
        <p className="mt-1 text-sm text-muted">{plan.description}</p>
      </div>
      <div>
        <div className="text-3xl font-bold tracking-tight text-[var(--mt-text)]">
          {priceLabel}
        </div>
        <div className="text-sm text-muted">{priceHint}</div>
      </div>
      <ul className="flex flex-col gap-2 text-sm">
        {featureEntries.map(([key, value]) => (
          <li key={key} className="flex items-start gap-2 text-[var(--mt-text)]">
            {value === false ? (
              <X size={16} className="mt-0.5 shrink-0 text-muted" />
            ) : (
              <Check size={16} className="mt-0.5 shrink-0 text-primary" />
            )}
            <span>
              <span className="capitalize">{key.replace(/_/g, " ")}</span>
              {typeof value === "number" ? `: ${value}` : null}
              {typeof value === "boolean" ? (value ? "" : " not included") : null}
            </span>
          </li>
        ))}
      </ul>
      <Button
        variant={ctaVariant}
        className="mt-auto w-full"
        disabled={ctaDisabled}
        loading={ctaLoading}
        onClick={onCta}
      >
        {ctaLabel}
      </Button>
    </Card>
  );
}
