import { useEffect, useState } from "react";
import { Link, useSearchParams } from "react-router-dom";
import { useConfirmCheckout, useSyncSubscription } from "@mytask/hooks";
import { ROUTES } from "@mytask/constants";
import { getErrorMessage } from "@mytask/utils";
import { Button } from "@/components/ui/Button";
import { Card } from "@/components/ui/Card";
import { CheckCircle2, Loader2 } from "lucide-react";

export function BillingSuccessPage() {
  const [searchParams] = useSearchParams();
  const sessionId = searchParams.get("session_id") || "";
  const confirm = useConfirmCheckout();
  const sync = useSyncSubscription();
  const [status, setStatus] = useState<"syncing" | "ready" | "error">("syncing");
  const [error, setError] = useState<string | null>(null);
  const [planName, setPlanName] = useState("Pro");

  useEffect(() => {
    let cancelled = false;
    async function run() {
      try {
        const data = sessionId
          ? await confirm.mutateAsync(sessionId)
          : await sync.mutateAsync();
        if (cancelled) return;
        setPlanName(data?.plan?.name || "Pro");
        setStatus("ready");
      } catch (err) {
        if (cancelled) return;
        // One retry via Stripe customer sync
        try {
          const data = await sync.mutateAsync();
          if (cancelled) return;
          setPlanName(data?.plan?.name || "Pro");
          setStatus("ready");
        } catch (err2) {
          if (cancelled) return;
          setError(
            getErrorMessage(
              err2 || err,
              "Payment succeeded, but plan sync is still pending. Open Subscription and tap refresh, or restart stripe listen.",
            ),
          );
          setStatus("error");
        }
      }
    }
    void run();
    return () => {
      cancelled = true;
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps -- run once on mount
  }, [sessionId]);

  return (
    <div className="mx-auto flex min-h-[50vh] w-full max-w-lg flex-col items-center justify-center gap-6 text-center">
      <Card className="flex w-full flex-col items-center gap-4 py-10">
        {status === "syncing" ? (
          <>
            <Loader2 className="animate-spin text-primary" size={48} />
            <h1 className="text-2xl font-bold text-[var(--mt-text)]">
              Activating your plan…
            </h1>
            <p className="max-w-sm text-sm text-muted">
              Payment received. Syncing your Pro subscription now.
            </p>
          </>
        ) : null}

        {status === "ready" ? (
          <>
            <CheckCircle2 className="text-primary" size={48} />
            <h1 className="text-2xl font-bold text-[var(--mt-text)]">
              You are on {planName}
            </h1>
            <p className="max-w-sm text-sm text-muted">
              Your Pro limits and features are active.
            </p>
          </>
        ) : null}

        {status === "error" ? (
          <>
            <CheckCircle2 className="text-amber-500" size={48} />
            <h1 className="text-2xl font-bold text-[var(--mt-text)]">
              Payment received
            </h1>
            <p className="max-w-sm text-sm text-muted">{error}</p>
            <Button
              loading={sync.isPending}
              onClick={async () => {
                setStatus("syncing");
                setError(null);
                try {
                  const data = await sync.mutateAsync();
                  setPlanName(data?.plan?.name || "Pro");
                  setStatus("ready");
                } catch (err) {
                  setError(getErrorMessage(err));
                  setStatus("error");
                }
              }}
            >
              Retry sync
            </Button>
          </>
        ) : null}

        <div className="mt-2 flex flex-wrap justify-center gap-2">
          <Link to={ROUTES.subscription}>
            <Button>View subscription</Button>
          </Link>
          <Link to={ROUTES.home}>
            <Button variant="secondary">Go to dashboard</Button>
          </Link>
        </div>
      </Card>
    </div>
  );
}
