import { Inbox } from "lucide-react";
import type { ReactNode } from "react";
import { clsx } from "clsx";

export function EmptyState({
  title,
  description,
  action,
}: {
  title: string;
  description?: string;
  action?: ReactNode;
}) {
  return (
    <div className="mt-card mt-fade-in flex flex-col items-center justify-center gap-3 px-6 py-16 text-center">
      <div className="flex h-14 w-14 items-center justify-center rounded-2xl bg-primary-muted text-primary">
        <Inbox size={22} />
      </div>
      <h3 className="text-lg font-semibold text-[var(--mt-text)]">{title}</h3>
      {description ? (
        <p className="max-w-md text-sm text-muted">{description}</p>
      ) : null}
      {action}
    </div>
  );
}

export function LoadingState({ label = "Loading…" }: { label?: string }) {
  return (
    <div className="mt-fade-in flex flex-col gap-3 py-6">
      <div className="mt-skeleton h-4 w-40" />
      <div className="mt-skeleton h-28 w-full" />
      <div className="mt-skeleton h-28 w-full" />
      <p className="text-center text-sm text-muted">{label}</p>
    </div>
  );
}

export function ErrorState({
  message,
  onRetry,
}: {
  message: string;
  onRetry?: () => void;
}) {
  return (
    <div className="mt-card mt-fade-in flex flex-col items-center gap-3 px-6 py-12 text-center">
      <p className="text-sm text-negative">{message}</p>
      {onRetry ? (
        <button
          type="button"
          onClick={onRetry}
          className="text-sm font-semibold text-primary underline"
        >
          Try again
        </button>
      ) : null}
    </div>
  );
}

export function Skeleton({ className }: { className?: string }) {
  return <div className={clsx("mt-skeleton", className)} />;
}
