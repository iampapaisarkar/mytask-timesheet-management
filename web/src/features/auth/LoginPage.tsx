import { useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { loginSchema, type LoginFormValues } from "@mytask/validation";
import { authApi } from "@mytask/api";
import { ROUTES } from "@mytask/constants";
import { getErrorMessage, getTimezone } from "@mytask/utils";
import { TextInput } from "@/components/ui/TextInput";
import { Button } from "@/components/ui/Button";
import { firebaseLogin } from "@/lib/firebase";
import { useAuthStore } from "@/store/authStore";
import { useToastStore } from "@/store/toastStore";

export function LoginPage() {
  const navigate = useNavigate();
  const setSession = useAuthStore((s) => s.setSession);
  const toast = useToastStore();
  const [error, setError] = useState<string | null>(null);
  const {
    register,
    handleSubmit,
    formState: { errors, isSubmitting },
  } = useForm<LoginFormValues>({
    resolver: zodResolver(loginSchema),
    defaultValues: { email: "", password: "" },
  });

  async function onSubmit(values: LoginFormValues) {
    setError(null);
    try {
      const credential = await firebaseLogin(values.email, values.password);
      const token = await credential.user.getIdToken();
      useAuthStore.setState({ token });
      const response = await authApi.login({
        email: values.email,
        platform: "web",
        timezone: getTimezone(),
      });
      setSession(token, response.data.data);
      toast.success("Welcome back", "You are signed in to myTask");
      navigate(ROUTES.home);
    } catch (err) {
      const message = getErrorMessage(err, "Unable to login. Please try again.");
      setError(message);
      toast.error("Login failed", message);
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
        <Button type="submit" loading={isSubmitting} className="w-full">
          Login
        </Button>
      </form>
      <div className="flex items-center justify-between text-sm">
        <Link to={ROUTES.forgotPassword} className="font-medium text-primary">
          I forgot my password
        </Link>
        <Link to={ROUTES.signup} className="font-medium text-primary">
          Signup
        </Link>
      </div>
    </div>
  );
}
