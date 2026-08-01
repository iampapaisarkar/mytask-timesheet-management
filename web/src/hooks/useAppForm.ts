import { useCallback } from "react";
import {
  useForm,
  type DefaultValues,
  type FieldValues,
  type UseFormProps,
  type UseFormReturn,
} from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import type { z } from "zod";

type AppFormOptions<T extends FieldValues> = Omit<
  UseFormProps<T>,
  "resolver"
> & {
  schema: z.ZodType<T>;
  defaultValues?: DefaultValues<T>;
};

/** Web counterpart of mobile useAppForm — Zod + focus first invalid field. */
export function useAppForm<T extends FieldValues>({
  schema,
  defaultValues,
  mode = "onTouched",
  ...rest
}: AppFormOptions<T>): UseFormReturn<T> {
  return useForm<T>({
    resolver: zodResolver(schema as never),
    defaultValues,
    mode,
    shouldFocusError: true,
    ...rest,
  });
}

/** Submit helper that keeps validation errors inline (no toast). */
export function useValidatedSubmit<T extends FieldValues>(
  form: UseFormReturn<T>,
  onValid: (values: T) => void | Promise<void>,
) {
  return useCallback(() => {
    void form.handleSubmit(async (values) => {
      await onValid(values);
    })();
  }, [form, onValid]);
}
