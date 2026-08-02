import { clsx } from "clsx";

type Props = {
  label?: string;
  className?: string;
  /** Compact = dot only (for table rows) */
  compact?: boolean;
};

/**
 * Blinking primary-color cue that realtime GPS / clock-in tracking is active.
 */
export function LiveTrackingIndicator({
  label = "Live",
  className,
  compact = false,
}: Props) {
  if (compact) {
    return (
      <span
        className={clsx("mt-live-dot", className)}
        title="Live tracking"
        aria-label="Live tracking"
      >
        <span className="mt-live-dot-ping" />
        <span className="mt-live-dot-core" />
      </span>
    );
  }

  return (
    <span
      className={clsx("mt-live-badge", className)}
      role="status"
      aria-live="polite"
    >
      <span className="mt-live-dot">
        <span className="mt-live-dot-ping" />
        <span className="mt-live-dot-core" />
      </span>
      {label}
    </span>
  );
}
