import { forwardRef, type InputHTMLAttributes } from "react";

interface TextInputProps extends InputHTMLAttributes<HTMLInputElement> {
  label?: string;
  error?: string;
}

export const TextInput = forwardRef<HTMLInputElement, TextInputProps>(
  function TextInput({ label, error, className = "", id, ...props }, ref) {
    const inputId = id || props.name;
    return (
      <label className="flex w-full flex-col gap-1.5 text-sm">
        {label ? <span className="font-medium text-dark">{label}</span> : null}
        <input
          ref={ref}
          id={inputId}
          className={`rounded-md border border-border bg-white px-3 py-2.5 outline-none ring-primary focus:ring-2 ${error ? "border-negative" : ""} ${className}`}
          {...props}
        />
        {error ? <span className="text-xs text-negative">{error}</span> : null}
      </label>
    );
  },
);
