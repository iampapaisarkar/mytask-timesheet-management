import { useEffect, useState } from "react";
import { Link, useNavigate, useSearchParams } from "react-router-dom";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { loginSchema, type LoginFormValues } from "@mytask/validation";
import { authApi } from "@mytask/api";
import { ROUTES } from "@mytask/constants";
import { getErrorMessage, getTimezone } from "@mytask/utils";
import { TextInput } from "@/components/ui/TextInput";
import { Button } from "@/components/ui/Button";
import {
  AuthCancelledError,
  completeGoogleRedirectSignIn,
  firebaseLogin,
  signInWithGoogle,
} from "@/services/firebase";
import { useAuthStore } from "@/store/authStore";
import { useToastStore } from "@/store/toastStore";

export function LoginPage() {
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const invitationToken =
    searchParams.get("token") || searchParams.get("invitation_token") || "";
  const redirectTo = searchParams.get("redirect") || "";
  const setSession = useAuthStore((s) => s.setSession);
  const toast = useToastStore();
  const [error, setError] = useState<string | null>(null);
  const [googleLoading, setGoogleLoading] = useState(false);
  const {
    register,
    handleSubmit,
    formState: { errors, isSubmitting },
  } = useForm<LoginFormValues>({
    resolver: zodResolver(loginSchema),
    defaultValues: { email: "", password: "" },
  });

  const busy = isSubmitting || googleLoading;

  function afterLoginNavigate() {
    if (invitationToken) {
      navigate(
        `${ROUTES.orgInvitation}?token=${encodeURIComponent(invitationToken)}`,
        { replace: true },
      );
    } else if (redirectTo && redirectTo.startsWith("/")) {
      navigate(redirectTo, { replace: true });
    } else {
      navigate(ROUTES.home);
    }
  }

  async function completeBackendLogin(
    email: string,
    token: string,
  ): Promise<void> {
    useAuthStore.setState({ token });
    const response = await authApi.login({
      email,
      platform: "web",
      timezone: getTimezone(),
      ...(invitationToken ? { invitation_token: invitationToken } : {}),
    });
    setSession(token, response.data.data);
  }

  useEffect(() => {
    let cancelled = false;
    void (async () => {
      try {
        const credential = await completeGoogleRedirectSignIn();
        if (!credential || cancelled) return;
        const email = credential.user.email;
        if (!email) {
          setError("Google did not return an email for this account.");
          return;
        }
        setGoogleLoading(true);
        const token = await credential.user.getIdToken();
        await completeBackendLogin(email, token);
        if (cancelled) return;
        toast.success("Welcome back", "You are signed in to myTask");
        afterLoginNavigate();
      } catch (err) {
        if (cancelled) return;
        if (err instanceof AuthCancelledError) return;
        const message = getErrorMessage(
          err,
          "Unable to complete Google Sign-In.",
        );
        setError(message);
        toast.error("Login failed", message);
      } finally {
        if (!cancelled) setGoogleLoading(false);
      }
    })();
    return () => {
      cancelled = true;
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps -- run once on mount for redirect result
  }, []);

  async function onSubmit(values: LoginFormValues) {
    setError(null);
    try {
      const credential = await firebaseLogin(values.email, values.password);
      const token = await credential.user.getIdToken();
      await completeBackendLogin(values.email, token);
      toast.success("Welcome back", "You are signed in to myTask");
      afterLoginNavigate();
    } catch (err) {
      const message = getErrorMessage(err, "Unable to login. Please try again.");
      setError(message);
      toast.error("Login failed", message);
    }
  }

  async function onGoogleSignIn() {
    setError(null);
    setGoogleLoading(true);
    try {
      const credential = await signInWithGoogle();
      const email = credential.user.email;
      if (!email) {
        throw new Error("Google did not return an email for this account.");
      }
      const token = await credential.user.getIdToken();
      await completeBackendLogin(email, token);
      toast.success("Welcome back", "You are signed in to myTask");
      afterLoginNavigate();
    } catch (err) {
      if (err instanceof AuthCancelledError) {
        // User closed popup or redirect started — no error toast for cancel.
        if (!err.message.includes("Redirecting")) {
          setError(err.message);
        }
        return;
      }
      const message = getErrorMessage(
        err,
        "Unable to sign in with Google. Please try again.",
      );
      setError(message);
      toast.error("Google Sign-In failed", message);
    } finally {
      setGoogleLoading(false);
    }
  }

  return (
    <div className="flex flex-col gap-6">
      <div>
        <h1 className="text-2xl font-bold tracking-tight text-[var(--mt-text)]">
          Log in to myTask
        </h1>
        <p className="mt-1 text-sm text-muted">
          Track work, manage teams, stay in sync.
        </p>
      </div>

      <Button
        type="button"
        variant="secondary"
        loading={googleLoading}
        disabled={busy}
        className="w-full"
        onClick={() => void onGoogleSignIn()}
      >
        <GoogleGlyph />
        Continue with Google
      </Button>

      <div className="flex items-center gap-3 text-xs text-muted">
        <span className="h-px flex-1 bg-border" />
        or continue with email
        <span className="h-px flex-1 bg-border" />
      </div>

      <form className="flex flex-col gap-4" onSubmit={handleSubmit(onSubmit)}>
        <TextInput
          label="Email"
          type="email"
          autoComplete="email"
          error={errors.email?.message}
          {...register("email")}
        />
        <TextInput
          label="Password"
          type="password"
          autoComplete="current-password"
          error={errors.password?.message}
          {...register("password")}
        />
        {error ? <p className="text-sm text-negative">{error}</p> : null}
        <Button type="submit" loading={isSubmitting} disabled={busy} className="w-full">
          Login
        </Button>
      </form>
      <div className="flex items-center justify-between text-sm">
        <Link to={ROUTES.forgotPassword} className="font-medium text-primary">
          I forgot my password
        </Link>
        <Link
          to={
            invitationToken
              ? `${ROUTES.signup}?token=${encodeURIComponent(invitationToken)}`
              : redirectTo
                ? `${ROUTES.signup}?redirect=${encodeURIComponent(redirectTo)}`
                : ROUTES.signup
          }
          className="font-medium text-primary"
        >
          Signup
        </Link>
      </div>
      <Link
        to={ROUTES.howItWorks}
        className="w-full"
      >
        <Button type="button" variant="soft" className="w-full" disabled={busy}>
          How it works
        </Button>
      </Link>
      <Link
        to={
          redirectTo
            ? `${ROUTES.pricing}?redirect=${encodeURIComponent(redirectTo)}`
            : ROUTES.pricing
        }
        className="w-full"
      >
        <Button type="button" variant="secondary" className="w-full" disabled={busy}>
          See Pricing
        </Button>
      </Link>
    </div>
  );
}

function GoogleGlyph() {
  return (
    <svg width="18" height="18" viewBox="0 0 48 48" aria-hidden="true">
      <path
        fill="#FFC107"
        d="M43.6 20.5H42V20H24v8h11.3C33.7 32.7 29.3 36 24 36c-6.6 0-12-5.4-12-12s5.4-12 12-12c3.1 0 5.9 1.2 8 3.1l5.7-5.7C34.2 6.1 29.4 4 24 4 12.9 4 4 12.9 4 24s8.9 20 20 20 20-8.9 20-20c0-1.3-.1-2.5-.4-3.5z"
      />
      <path
        fill="#FF3D00"
        d="M6.3 14.7l6.6 4.8C14.7 16.1 19 13 24 13c3.1 0 5.9 1.2 8 3.1l5.7-5.7C34.2 6.1 29.4 4 24 4 16.3 4 9.6 8.3 6.3 14.7z"
      />
      <path
        fill="#4CAF50"
        d="M24 44c5.2 0 9.9-2 13.4-5.2l-6.2-5.2C29.3 35.3 26.8 36 24 36c-5.2 0-9.6-3.3-11.3-7.9l-6.5 5C9.5 39.6 16.2 44 24 44z"
      />
      <path
        fill="#1976D2"
        d="M43.6 20.5H42V20H24v8h11.3c-.8 2.2-2.2 4.1-4.1 5.5l.1.1 6.2 5.2C39.2 36.3 44 31.5 44 24c0-1.3-.1-2.5-.4-3.5z"
      />
    </svg>
  );
}
