import { useMemo, useState } from "react";
import PhoneInput, {
  type Country,
  type Value,
} from "react-phone-number-input";
import flags from "react-phone-number-input/flags";
import "react-phone-number-input/style.css";
import { clsx } from "clsx";
import {
  emptyPhoneValue,
  formatPhoneDisplay,
  isValidInternationalPhone,
  phoneValueFromE164,
  detectLocalePreferences,
  type PhoneValue,
} from "@mytask/utils";

export type GlobalPhoneInputProps = {
  label?: string;
  value?: PhoneValue | null;
  /** E.164 string shorthand — preferred with full PhoneValue when available */
  e164?: string | null;
  defaultCountry?: Country;
  required?: boolean;
  disabled?: boolean;
  error?: string;
  className?: string;
  id?: string;
  name?: string;
  onChange: (value: PhoneValue) => void;
  onBlur?: () => void;
};

/**
 * Shared international phone input — use on every phone field.
 * Emits E.164 + dial code + ISO country.
 * Default country comes from the browser locale when not provided.
 */
export function GlobalPhoneInput({
  label,
  value,
  e164,
  defaultCountry,
  required,
  disabled,
  error,
  className,
  id,
  name,
  onChange,
  onBlur,
}: GlobalPhoneInputProps) {
  const resolvedDefaultCountry = useMemo(() => {
    if (defaultCountry) return defaultCountry;
    const iso = detectLocalePreferences().defaultCountryIso;
    return (iso || "US") as Country;
  }, [defaultCountry]);

  const [touched, setTouched] = useState(false);
  const currentE164 = (value?.phone_number || e164 || "") as Value | undefined;

  const localError = useMemo(() => {
    if (!touched && !error) return undefined;
    if (error) return error;
    if (required && !currentE164) return "Phone number is required";
    if (currentE164 && !isValidInternationalPhone(currentE164)) {
      return "Enter a valid phone number for the selected country";
    }
    return undefined;
  }, [touched, error, required, currentE164]);

  function handleChange(next: Value) {
    if (!next) {
      onChange(emptyPhoneValue());
      return;
    }
    onChange(phoneValueFromE164(next));
  }

  return (
    <label className={clsx("flex w-full flex-col gap-1.5 text-sm", className)}>
      {label ? (
        <span className="font-medium text-[var(--mt-text)]">
          {label}
          {required ? <span className="text-negative"> *</span> : null}
        </span>
      ) : null}
      <div
        className={clsx(
          "global-phone-input mt-focus rounded-xl border border-border bg-[var(--mt-surface)] px-2 py-1 text-[var(--mt-text)] transition focus-within:border-primary",
          localError && "border-negative",
          disabled && "opacity-60",
        )}
      >
        <PhoneInput
          id={id}
          name={name}
          international
          countryCallingCodeEditable={false}
          defaultCountry={resolvedDefaultCountry}
          flags={flags}
          value={currentE164 || undefined}
          disabled={disabled}
          onChange={handleChange}
          onBlur={() => {
            setTouched(true);
            onBlur?.();
          }}
          numberInputProps={{
            className:
              "PhoneInputInput !border-0 !bg-transparent !outline-none !shadow-none text-[var(--mt-text)] placeholder:text-muted",
            "aria-invalid": Boolean(localError),
            "aria-required": required,
          }}
        />
      </div>
      {localError ? (
        <span className="text-xs text-negative" role="alert">
          {localError}
        </span>
      ) : null}
    </label>
  );
}

/** Read-only international phone display with flag. */
export function GlobalPhoneDisplay({
  phoneNumber,
  countryIso,
  className,
}: {
  phoneNumber?: string | null;
  countryIso?: string | null;
  className?: string;
}) {
  if (!phoneNumber) return <span className={className}>—</span>;
  return (
    <span className={className}>
      {formatPhoneDisplay(phoneNumber, countryIso)}
    </span>
  );
}
