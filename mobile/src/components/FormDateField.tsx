import {
  Controller,
  type Control,
  type FieldPath,
  type FieldValues,
} from "react-hook-form";
import { DateField, type DateFieldProps } from "./DateField";

type Props<T extends FieldValues> = {
  control: Control<T>;
  name: FieldPath<T>;
} & Omit<DateFieldProps, "value" | "onChange" | "error">;

/**
 * React Hook Form binder for DateField (ISO YYYY-MM-DD values).
 */
export function FormDateField<T extends FieldValues>({
  control,
  name,
  ...rest
}: Props<T>) {
  return (
    <Controller
      control={control}
      name={name}
      render={({ field: { onChange, value }, fieldState }) => (
        <DateField
          value={value == null ? "" : String(value)}
          onChange={onChange}
          error={fieldState.error?.message}
          {...rest}
        />
      )}
    />
  );
}
