import { useState } from "react";
import { Link } from "react-router-dom";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import {
  forgotPasswordSchema,
  type ForgotPasswordFormValues,
} from "@mysheet/validation";
import { authApi } from "@mysheet/api";
import { ROUTES } from "@mysheet/constants";
import { getErrorMessage } from "@mysheet/utils";
import { TextInput } from "@/components/ui/TextInput";
import { Button } from "@/components/ui/Button";
import { firebaseForgotPassword } from "@/lib/firebase";

export function ForgotPasswordPage() {
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);
  const {
    register,
    handleSubmit,
    formState: { errors, isSubmitting },
  } = useForm<ForgotPasswordFormValues>({
    resolver: zodResolver(forgotPasswordSchema),
  });

  async function onSubmit(values: ForgotPasswordFormValues) {
    setError(null);
    setSuccess(null);
    try {
      try {
        await authApi.forgotPassword({ email: values.email });
      } catch {
        // Fall back to Firebase client reset if backend path differs
        await firebaseForgotPassword(values.email);
      }
      setSuccess("Password reset instructions have been sent if the account exists.");
    } catch (err) {
      setError(getErrorMessage(err));
    }
  }

  return (
    <div className="flex flex-col gap-6">
      <div>
        <h1 className="text-2xl font-semibold text-dark">Forgot password</h1>
        <p className="mt-1 text-sm text-muted">We will email you a reset link</p>
      </div>
      <form className="flex flex-col gap-4" onSubmit={handleSubmit(onSubmit)}>
        <TextInput
          label="Email"
          type="email"
          error={errors.email?.message}
          {...register("email")}
        />
        {error ? <p className="text-sm text-negative">{error}</p> : null}
        {success ? <p className="text-sm text-positive">{success}</p> : null}
        <Button type="submit" loading={isSubmitting}>
          Send reset link
        </Button>
      </form>
      <Link to={ROUTES.login} className="text-sm text-primary">
        Back to login
      </Link>
    </div>
  );
}
