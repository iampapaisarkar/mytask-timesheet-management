import { useForm, Controller } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { profileSchema, type ProfileFormValues } from "@mytask/validation";
import { authApi } from "@mytask/api";
import { getErrorMessage, phoneValueFromE164 } from "@mytask/utils";
import { useAuthStore } from "@/store/authStore";
import { TextInput } from "@/components/ui/TextInput";
import { GlobalPhoneInput } from "@/components/ui/GlobalPhoneInput";
import { Button } from "@/components/ui/Button";
import { Card, PageHeader } from "@/components/ui/Card";
import { useToastStore } from "@/store/toastStore";
import { useState } from "react";

export function ProfilePage() {
  const user = useAuthStore((s) => s.user);
  const setUser = useAuthStore((s) => s.setUser);
  const toast = useToastStore();
  const [error, setError] = useState<string | null>(null);
  const initialPhone = phoneValueFromE164(
    user?.phone_number as string | undefined,
    user?.phone_country_iso as string | undefined,
  );
  const {
    register,
    handleSubmit,
    control,
    setValue,
    watch,
    formState: { errors, isSubmitting },
  } = useForm<ProfileFormValues>({
    resolver: zodResolver(profileSchema),
    defaultValues: {
      first_name: user?.first_name || "",
      middle_name: user?.middle_name || "",
      last_name: user?.last_name || "",
      dob: (user?.dob as string) || "",
      phone_number: initialPhone.phone_number || "",
      phone_country_code: initialPhone.phone_country_code,
      phone_country_iso: initialPhone.phone_country_iso,
    },
  });

  const phoneNumber = watch("phone_number");
  const phoneIso = watch("phone_country_iso");
  const phoneCode = watch("phone_country_code");

  async function onSubmit(values: ProfileFormValues) {
    setError(null);
    try {
      const res = await authApi.updateProfile({
        ...values,
        phone_number: values.phone_number || null,
        phone_country_code: values.phone_country_code || null,
        phone_country_iso: values.phone_country_iso || null,
      });
      setUser(res.data.data);
      toast.success("Profile updated");
    } catch (err) {
      const message = getErrorMessage(err);
      setError(message);
      toast.error("Update failed", message);
    }
  }

  return (
    <div className="mx-auto max-w-lg">
      <PageHeader title="Profile" description={user?.email} />
      <Card>
        <form className="flex flex-col gap-4" onSubmit={handleSubmit(onSubmit)}>
          <TextInput
            label="First Name"
            error={errors.first_name?.message}
            {...register("first_name")}
          />
          <TextInput label="Middle Name" {...register("middle_name")} />
          <TextInput
            label="Last Name"
            error={errors.last_name?.message}
            {...register("last_name")}
          />
          <TextInput label="Date of Birth" type="date" {...register("dob")} />
          <Controller
            name="phone_number"
            control={control}
            render={({ field }) => (
              <GlobalPhoneInput
                label="Phone number"
                value={{
                  phone_number: phoneNumber || null,
                  phone_country_code: phoneCode || null,
                  phone_country_iso: phoneIso || null,
                }}
                error={errors.phone_number?.message}
                onChange={(phone) => {
                  field.onChange(phone.phone_number || "");
                  setValue("phone_country_code", phone.phone_country_code);
                  setValue("phone_country_iso", phone.phone_country_iso);
                }}
                onBlur={field.onBlur}
              />
            )}
          />
          {error ? <p className="text-sm text-negative">{error}</p> : null}
          <Button type="submit" loading={isSubmitting}>
            Update
          </Button>
        </form>
      </Card>
    </div>
  );
}
