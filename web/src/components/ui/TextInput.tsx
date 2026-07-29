import { forwardRef, type InputHTMLAttributes } from "react";
import { clsx } from "clsx";

interface TextInputProps extends InputHTMLAttributes<HTMLInputElement> {
  label?: string;
  error?: string;
}

export const TextInput = forwardRef<HTMLInputElement, TextInputProps>(
  function TextInput({ label, error, className, id, ...props }, ref) {
    const inputId = id || props.name;
    return (
      <label className="flex w-full flex-col gap-1.5 text-sm">
        {label ? (
          <span className="font-medium text-[var(--mt-text)]">{label}</span>
        ) : null}
        <input
          ref={ref}
          id={inputId}
          className={clsx(
            "mt-focus rounded-xl border border-border bg-[var(--mt-surface)] px-3.5 py-3 text-[var(--mt-text)] outline-none transition placeholder:text-muted focus:border-primary",
            error && "border-negative",
            className,
          )}
          {...props}
        />
        {error ? <span className="text-xs text-negative">{error}</span> : null}
      </label>
    );
  },
);
