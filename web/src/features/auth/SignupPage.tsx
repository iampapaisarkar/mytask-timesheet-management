import { useState } from "react";
import { Link, useNavigate, useSearchParams } from "react-router-dom";
import { useForm, Controller } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { signupSchema, type SignupFormValues } from "@mytask/validation";
import { authApi } from "@mytask/api";
import { ROUTES } from "@mytask/constants";
import { getErrorMessage, getTimezone } from "@mytask/utils";
import { TextInput } from "@/components/ui/TextInput";
import { GlobalPhoneInput } from "@/components/ui/GlobalPhoneInput";
import { Button } from "@/components/ui/Button";
import { firebaseSignup } from "@/lib/firebase";
import { useAuthStore } from "@/store/authStore";
import { useToastStore } from "@/store/toastStore";

export function SignupPage() {
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const invitationToken =
    searchParams.get("token") || searchParams.get("invitation_token") || "";
  const setSession = useAuthStore((s) => s.setSession);
  const toast = useToastStore();
  const [error, setError] = useState<string | null>(null);
  const {
    register,
    handleSubmit,
    control,
    setValue,
    watch,
    formState: { errors, isSubmitting },
  } = useForm<SignupFormValues>({
    resolver: zodResolver(signupSchema),
    defaultValues: {
      phone_number: "",
      phone_country_code: null,
      phone_country_iso: null,
    },
  });

  const phoneNumber = watch("phone_number");
  const phoneIso = watch("phone_country_iso");
  const phoneCode = watch("phone_country_code");

  async function onSubmit(values: SignupFormValues) {
    setError(null);
    try {
      const credential = await firebaseSignup(values.email, values.password);
      const token = await credential.user.getIdToken();
      useAuthStore.setState({ token });
      const response = await authApi.signup({
        first_name: values.first_name,
        middle_name: values.middle_name,
        last_name: values.last_name,
        email: values.email,
        dob: values.dob,
        phone_number: values.phone_number,
        phone_country_code: values.phone_country_code,
        phone_country_iso: values.phone_country_iso,
        uid: credential.user.uid,
        providerData: credential.user.providerData as unknown as unknown[],
        platform: "web",
        timezone: getTimezone(),
        ...(invitationToken
          ? { invitation_token: invitationToken }
          : {}),
      });
      setSession(token, response.data.data);
      toast.success("Account created", "Welcome to myTask");
      if (invitationToken) {
        navigate(
          `${ROUTES.orgInvitation}?token=${encodeURIComponent(invitationToken)}`,
          { replace: true },
        );
      } else {
        navigate(ROUTES.home);
      }
    } catch (err) {
      const message = getErrorMessage(err, "Unable to sign up. Please try again.");
      setError(message);
      toast.error("Signup failed", message);
    }
  }

  return (
    <div className="flex flex-col gap-6">
      <div>
        <h1 className="text-2xl font-bold tracking-tight text-[var(--mt-text)]">
          Create your account
        </h1>
        <p className="mt-1 text-sm text-muted">Join myTask</p>
      </div>
      <form className="flex flex-col gap-4" onSubmit={handleSubmit(onSubmit)}>
        <TextInput label="First Name" error={errors.first_name?.message} {...register("first_name")} />
        <TextInput label="Middle Name" {...register("middle_name")} />
        <TextInput label="Last Name" error={errors.last_name?.message} {...register("last_name")} />
        <TextInput label="Email" type="email" error={errors.email?.message} {...register("email")} />
        <Controller
          name="phone_number"
          control={control}
          render={({ field }) => (
            <GlobalPhoneInput
              label="Phone number"
              required
              value={{
                phone_number: phoneNumber || null,
                phone_country_code: phoneCode || null,
                phone_country_iso: phoneIso || null,
              }}
              error={errors.phone_number?.message}
              onChange={(phone) => {
                field.onChange(phone.phone_number || "");
                setValue("phone_country_code", phone.phone_country_code, {
                  shouldValidate: true,
                });
                setValue("phone_country_iso", phone.phone_country_iso, {
                  shouldValidate: true,
                });
              }}
              onBlur={field.onBlur}
            />
          )}
        />
        <TextInput label="Date of Birth" type="date" {...register("dob")} />
        <TextInput label="Password" type="password" error={errors.password?.message} {...register("password")} />
        <TextInput
          label="Confirm Password"
          type="password"
          error={errors.confirm_password?.message}
          {...register("confirm_password")}
        />
        {error ? <p className="text-sm text-negative">{error}</p> : null}
        <Button type="submit" loading={isSubmitting} className="w-full">
          Signup
        </Button>
      </form>
      <p className="text-sm">
        Already have an account?{" "}
        <Link
          to={
            invitationToken
              ? `${ROUTES.login}?token=${encodeURIComponent(invitationToken)}`
              : ROUTES.login
          }
          className="font-medium text-primary"
        >
          Login
        </Link>
      </p>
    </div>
  );
}
