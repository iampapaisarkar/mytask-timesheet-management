import { useCallback, useMemo } from "react";
import {
  useForm,
  type DefaultValues,
  type FieldValues,
  type Path,
  type UseFormProps,
  type UseFormReturn,
} from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import type { z } from "zod";
import { Keyboard } from "react-native";
import { triggerHaptic } from "../utils/haptics";

type AppFormOptions<T extends FieldValues> = Omit<
  UseFormProps<T>,
  "resolver"
> & {
  schema: z.ZodType<T>;
  defaultValues: DefaultValues<T>;
};

/**
 * Signup-standard form setup: Zod resolver, focus first invalid field,
 * clear errors as the user corrects them.
 */
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

/**
 * Wrap RHF handleSubmit so a failed validation attempt triggers one error haptic
 * (not per-field). Valid submit dismisses the keyboard and runs onValid.
 */
export function useValidatedSubmit<T extends FieldValues>(
  form: UseFormReturn<T>,
  onValid: (values: T) => void | Promise<void>,
) {
  return useCallback(() => {
    void form.handleSubmit(
      async (values) => {
        Keyboard.dismiss();
        await onValid(values);
      },
      () => {
        void triggerHaptic("error");
      },
    )();
  }, [form, onValid]);
}

/**
 * Keyboard return-key chain: Next focuses the next field; final field uses
 * "dismiss" (or "done" mapped to dismiss) and only closes the keyboard.
 */
export function useFormFieldChain<T extends FieldValues>(
  form: UseFormReturn<T>,
  fieldNames: Path<T>[],
) {
  return useMemo(() => {
    const active = fieldNames.filter(Boolean);
    return active.map((name, index) => {
      const isLast = index === active.length - 1;
      const next = !isLast ? active[index + 1] : undefined;
      return {
        name,
        returnKeyType: (isLast ? "done" : "next") as "done" | "next",
        blurOnSubmit: isLast,
        onSubmitEditing: () => {
          if (isLast) {
            Keyboard.dismiss();
            return;
          }
          if (next) form.setFocus(next);
        },
      };
    });
  }, [fieldNames, form]);
}

export function fieldChainProps<T extends FieldValues>(
  chain: ReturnType<typeof useFormFieldChain<T>>,
  name: Path<T>,
) {
  const item = chain.find((entry) => entry.name === name);
  if (!item) return {};
  return {
    returnKeyType: item.returnKeyType,
    blurOnSubmit: item.blurOnSubmit,
    onSubmitEditing: item.onSubmitEditing,
  };
}
