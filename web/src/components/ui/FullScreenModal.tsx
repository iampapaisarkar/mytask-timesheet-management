import {
  useEffect,
  useId,
  useRef,
  type ReactNode,
} from "react";
import { createPortal } from "react-dom";

type FullScreenModalProps = {
  open: boolean;
  onClose: () => void;
  title?: string;
  /** workspace = edge-to-edge day details; form = padded content column */
  variant?: "workspace" | "form";
  header?: ReactNode;
  footer?: ReactNode;
  children: ReactNode;
  /** Extra class on the panel surface */
  className?: string;
  /** Close when clicking the dimmed backdrop (default true) */
  closeOnBackdrop?: boolean;
};

export function FullScreenModal({
  open,
  onClose,
  title,
  variant = "form",
  header,
  footer,
  children,
  className,
  closeOnBackdrop = true,
}: FullScreenModalProps) {
  const titleId = useId();
  const panelRef = useRef<HTMLDivElement>(null);
  const onCloseRef = useRef(onClose);
  onCloseRef.current = onClose;

  useEffect(() => {
    if (!open) return;
    const prevOverflow = document.body.style.overflow;
    document.body.style.overflow = "hidden";

    function onKey(e: KeyboardEvent) {
      if (e.key === "Escape") onCloseRef.current();
    }
    window.addEventListener("keydown", onKey);

    // Focus once when the dialog opens — prefer form fields so typing
    // is not stolen by the header Close button on parent re-renders.
    const t = window.setTimeout(() => {
      const root = panelRef.current;
      if (!root) return;
      const preferred = root.querySelector<HTMLElement>(
        'input:not([disabled]):not([type="hidden"]), textarea:not([disabled]), select:not([disabled])',
      );
      const fallback = root.querySelector<HTMLElement>(
        'button:not([disabled]), [href], [tabindex]:not([tabindex="-1"])',
      );
      (preferred ?? fallback)?.focus();
    }, 50);

    return () => {
      document.body.style.overflow = prevOverflow;
      window.removeEventListener("keydown", onKey);
      window.clearTimeout(t);
    };
  }, [open]);

  if (!open) return null;

  const panel =
    variant === "workspace" ? (
      <div
        ref={panelRef}
        role="dialog"
        aria-modal="true"
        aria-labelledby={title ? titleId : undefined}
        className={`mt-fullscreen-panel relative z-10 flex h-full w-full flex-col bg-[var(--mt-surface)] ${className || ""}`}
      >
        {header ??
          (title ? (
            <div className="flex items-center justify-between gap-3 border-b border-border px-4 py-3 sm:px-6">
              <h2
                id={titleId}
                className="text-lg font-semibold text-[var(--mt-text)]"
              >
                {title}
              </h2>
              <CloseButton onClose={onClose} />
            </div>
          ) : null)}
        <div className="min-h-0 flex-1 overflow-hidden">{children}</div>
        {footer}
      </div>
    ) : (
      <div
        ref={panelRef}
        role="dialog"
        aria-modal="true"
        aria-labelledby={title ? titleId : undefined}
        className={`mt-fullscreen-panel relative z-10 flex h-full w-full flex-col bg-[var(--mt-surface)] ${className || ""}`}
      >
        <div className="flex shrink-0 items-center justify-between gap-3 border-b border-border px-4 py-4 sm:px-8">
          {header ?? (
            <h2
              id={titleId}
              className="text-xl font-bold text-[var(--mt-text)]"
            >
              {title}
            </h2>
          )}
          <CloseButton onClose={onClose} />
        </div>
        <div className="min-h-0 flex-1 overflow-y-auto px-4 py-6 sm:px-8">
          <div className="mx-auto w-full max-w-3xl">{children}</div>
        </div>
        {footer ? (
          <div className="shrink-0 border-t border-border px-4 py-4 sm:px-8">
            <div className="mx-auto flex w-full max-w-3xl flex-wrap justify-end gap-2">
              {footer}
            </div>
          </div>
        ) : null}
      </div>
    );

  return createPortal(
    <div className="mt-fullscreen-root fixed inset-0 z-[70] flex pb-[env(safe-area-inset-bottom)] pt-[env(safe-area-inset-top)]">
      <button
        type="button"
        className="absolute inset-0 cursor-default bg-black/50 backdrop-blur-[3px]"
        aria-label="Close dialog"
        onClick={closeOnBackdrop ? onClose : undefined}
        tabIndex={-1}
      />
      {panel}
    </div>,
    document.body,
  );
}

function CloseButton({ onClose }: { onClose: () => void }) {
  return (
    <button
      type="button"
      onClick={onClose}
      aria-label="Close"
      className="mt-focus inline-flex h-10 w-10 shrink-0 items-center justify-center rounded-xl text-[var(--mt-muted)] transition hover:bg-primary-muted hover:text-[var(--mt-text)]"
    >
      <svg
        width="18"
        height="18"
        viewBox="0 0 24 24"
        fill="none"
        stroke="currentColor"
        strokeWidth="2.2"
        strokeLinecap="round"
        aria-hidden
      >
        <path d="M18 6 6 18M6 6l12 12" />
      </svg>
    </button>
  );
}
