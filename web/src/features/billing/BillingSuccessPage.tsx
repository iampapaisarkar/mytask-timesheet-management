import { Link } from "react-router-dom";
import { ROUTES } from "@mytask/constants";
import { Button } from "@/components/ui/Button";
import { Card } from "@/components/ui/Card";
import { CheckCircle2 } from "lucide-react";

export function BillingSuccessPage() {
  return (
    <div className="mx-auto flex min-h-[50vh] w-full max-w-lg flex-col items-center justify-center gap-6 text-center">
      <Card className="flex w-full flex-col items-center gap-4 py-10">
        <CheckCircle2 className="text-primary" size={48} />
        <h1 className="text-2xl font-bold text-[var(--mt-text)]">
          You are on Pro
        </h1>
        <p className="max-w-sm text-sm text-muted">
          Payment received. Your Pro limits and features are active. It may take
          a few seconds for webhooks to finish syncing.
        </p>
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
