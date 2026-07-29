import { X } from "lucide-react";
import { clsx } from "clsx";
import { useToastStore, type ToastTone } from "@/store/toastStore";

const toneClass: Record<ToastTone, string> = {
  success: "border-positive/30 bg-[var(--mt-surface)] text-positive",
  error: "border-negative/30 bg-[var(--mt-surface)] text-negative",
  warning: "border-warning/30 bg-[var(--mt-surface)] text-warning",
  info: "border-info/30 bg-[var(--mt-surface)] text-info",
};

export function ToastViewport() {
  const items = useToastStore((s) => s.items);
  const dismiss = useToastStore((s) => s.dismiss);

  return (
    <div className="pointer-events-none fixed right-4 bottom-4 z-[100] flex w-[min(100%-2rem,360px)] flex-col gap-2">
      {items.map((item) => (
        <div
          key={item.id}
          className={clsx(
            "pointer-events-auto mt-fade-in rounded-2xl border px-4 py-3 shadow-lg",
            toneClass[item.tone],
          )}
        >
          <div className="flex items-start justify-between gap-3">
            <div>
              <p className="text-sm font-semibold text-[var(--mt-text)]">
                {item.title}
              </p>
              {item.description ? (
                <p className="mt-1 text-xs text-muted">{item.description}</p>
              ) : null}
            </div>
            <button
              type="button"
              className="rounded-lg p-1 text-muted hover:bg-primary-muted"
              onClick={() => dismiss(item.id)}
              aria-label="Dismiss"
            >
              <X size={14} />
            </button>
          </div>
        </div>
      ))}
    </div>
  );
}
