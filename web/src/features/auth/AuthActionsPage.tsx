import { useEffect, useRef, useState } from "react";
import { Link, useNavigate, useSearchParams } from "react-router-dom";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import {
  resetPasswordSchema,
  type ResetPasswordFormValues,
} from "@mytask/validation";
import { ROUTES } from "@mytask/constants";
import { getErrorMessage } from "@mytask/utils";
import { TextInput } from "@/components/ui/TextInput";
import { Button } from "@/components/ui/Button";
import {
  firebaseApplyActionCode,
  firebaseConfirmPasswordReset,
} from "@/lib/firebase";
import { useToastStore } from "@/store/toastStore";

type AuthActionMode = "resetPassword" | "verifyEmail" | string;

/**
 * Mirrors original Vue AuthActions:
 * - resetPassword → form → confirmPasswordReset → /login
 * - verifyEmail → auto applyActionCode → /login (failure → /)
 */
export function AuthActionsPage() {
  const [searchParams] = useSearchParams();
  const navigate = useNavigate();
  const toast = useToastStore();
  const verifyStarted = useRef(false);

  const mode = (searchParams.get("mode") || "") as AuthActionMode;
  const oobCode = searchParams.get("oobCode") || "";

  const [error, setError] = useState<string | null>(null);
  const [verifyingEmail, setVerifyingEmail] = useState(false);

  const {
    register,
    handleSubmit,
    formState: { errors, isSubmitting },
  } = useForm<ResetPasswordFormValues>({
    resolver: zodResolver(resetPasswordSchema),
    defaultValues: { password: "", confirm_password: "" },
  });

  useEffect(() => {
    if (!mode && !oobCode) {
      navigate(ROUTES.login, { replace: true });
      return;
    }

    if (mode !== "verifyEmail" || !oobCode || verifyStarted.current) return;
    verifyStarted.current = true;

    let cancelled = false;
    (async () => {
      setVerifyingEmail(true);
      try {
        await firebaseApplyActionCode(oobCode);
        if (cancelled) return;
        useToastStore
          .getState()
          .success(
            "Email verified",
            "Email verified successfully. You can login now.",
          );
        navigate(ROUTES.login, { replace: true });
      } catch (err) {
        if (cancelled) return;
        const message = getErrorMessage(err, "Unable to verify email.");
        useToastStore.getState().error("Verification failed", message);
        navigate(ROUTES.home, { replace: true });
      } finally {
        if (!cancelled) setVerifyingEmail(false);
      }
    })();

    return () => {
      cancelled = true;
    };
  }, [mode, oobCode, navigate]);

  async function onResetPassword(values: ResetPasswordFormValues) {
    if (!oobCode) {
      setError("Reset link is missing or invalid.");
      return;
    }
    setError(null);
    try {
      await firebaseConfirmPasswordReset(oobCode, values.password);
      toast.success(
        "Password reset",
        "Password successfully reset. You can login now.",
      );
      navigate(ROUTES.login, { replace: true });
    } catch (err) {
      const message = getErrorMessage(
        err,
        "Unable to reset password. The link may have expired.",
      );
      setError(message);
      toast.error("Reset failed", message);
    }
  }

  if (mode === "verifyEmail") {
    return (
      <div className="flex flex-col items-center gap-4 py-8 text-center">
        <div
          className="h-10 w-10 animate-spin rounded-full border-2 border-primary border-t-transparent"
          aria-hidden
        />
        <h1 className="text-2xl font-bold tracking-tight text-[var(--mt-text)]">
          Verifying email
        </h1>
        <p className="text-sm text-muted">
          {verifyingEmail
            ? "Please wait while we confirm your email address…"
            : "Finishing up…"}
        </p>
      </div>
    );
  }

  if (mode === "resetPassword") {
    return (
      <div className="flex flex-col gap-6">
        <div>
          <h1 className="text-2xl font-bold tracking-tight text-[var(--mt-text)]">
            Reset password
          </h1>
          <p className="mt-1 text-sm text-muted">
            Choose a new password for your myTask account
          </p>
        </div>
        <form
          className="flex flex-col gap-4"
          onSubmit={handleSubmit(onResetPassword)}
        >
          <TextInput
            label="Password"
            type="password"
            autoComplete="new-password"
            error={errors.password?.message}
            {...register("password")}
          />
          <TextInput
            label="Confirm password"
            type="password"
            autoComplete="new-password"
            error={errors.confirm_password?.message}
            {...register("confirm_password")}
          />
          {error ? <p className="text-sm text-negative">{error}</p> : null}
          <Button type="submit" loading={isSubmitting} className="w-full">
            Reset password
          </Button>
        </form>
        <p className="text-sm text-muted">
          Back to{" "}
          <Link to={ROUTES.login} className="font-medium text-primary">
            Login
          </Link>
        </p>
      </div>
    );
  }

  return (
    <div className="flex flex-col gap-4 text-center">
      <h1 className="text-2xl font-bold tracking-tight text-[var(--mt-text)]">
        Invalid link
      </h1>
      <p className="text-sm text-muted">
        This auth action link is missing a valid mode. Request a new email and
        try again.
      </p>
      <Link to={ROUTES.login} className="text-sm font-medium text-primary">
        Back to login
      </Link>
    </div>
  );
}
