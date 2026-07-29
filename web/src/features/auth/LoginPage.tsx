import { useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { loginSchema, type LoginFormValues } from "@mysheet/validation";
import { authApi } from "@mysheet/api";
import { ROUTES } from "@mysheet/constants";
import { getErrorMessage, getTimezone } from "@mysheet/utils";
import { TextInput } from "@/components/ui/TextInput";
import { Button } from "@/components/ui/Button";
import { firebaseLogin } from "@/lib/firebase";
import { useAuthStore } from "@/store/authStore";

export function LoginPage() {
  const navigate = useNavigate();
  const setSession = useAuthStore((s) => s.setSession);
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
      navigate(ROUTES.home);
    } catch (err) {
      setError(getErrorMessage(err, "Unable to login. Please try again."));
    }
  }

  return (
    <div className="flex flex-col gap-6">
      <div>
        <h1 className="text-2xl font-semibold text-dark">Log in to mySheet</h1>
        <p className="mt-1 text-sm text-muted">Enter your email and password</p>
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
        <Button type="submit" loading={isSubmitting}>
          Login
        </Button>
      </form>
      <div className="flex items-center justify-between text-sm">
        <Link to={ROUTES.forgotPassword} className="text-primary">
          I forgot my password
        </Link>
        <Link to={ROUTES.signup} className="text-primary">
          Signup
        </Link>
      </div>
    </div>
  );
}
