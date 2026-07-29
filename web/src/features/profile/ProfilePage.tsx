import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { profileSchema, type ProfileFormValues } from "@mysheet/validation";
import { authApi } from "@mysheet/api";
import { getErrorMessage } from "@mysheet/utils";
import { useAuthStore } from "@/store/authStore";
import { TextInput } from "@/components/ui/TextInput";
import { Button } from "@/components/ui/Button";
import { useState } from "react";

export function ProfilePage() {
  const user = useAuthStore((s) => s.user);
  const setUser = useAuthStore((s) => s.setUser);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);
  const {
    register,
    handleSubmit,
    formState: { errors, isSubmitting },
  } = useForm<ProfileFormValues>({
    resolver: zodResolver(profileSchema),
    defaultValues: {
      first_name: user?.first_name || "",
      middle_name: user?.middle_name || "",
      last_name: user?.last_name || "",
      dob: (user?.dob as string) || "",
    },
  });

  async function onSubmit(values: ProfileFormValues) {
    setError(null);
    setSuccess(null);
    try {
      const res = await authApi.updateProfile(values);
      setUser(res.data.data);
      setSuccess("Profile updated");
    } catch (err) {
      setError(getErrorMessage(err));
    }
  }

  return (
    <div className="mx-auto max-w-lg rounded-lg border border-border bg-white p-6">
      <h1 className="text-2xl font-semibold">Profile</h1>
      <p className="mt-1 text-sm text-muted">{user?.email}</p>
      <form className="mt-6 flex flex-col gap-4" onSubmit={handleSubmit(onSubmit)}>
        <TextInput label="First Name" error={errors.first_name?.message} {...register("first_name")} />
        <TextInput label="Middle Name" {...register("middle_name")} />
        <TextInput label="Last Name" error={errors.last_name?.message} {...register("last_name")} />
        <TextInput label="Date of Birth" type="date" {...register("dob")} />
        {error ? <p className="text-sm text-negative">{error}</p> : null}
        {success ? <p className="text-sm text-positive">{success}</p> : null}
        <Button type="submit" loading={isSubmitting}>
          Update
        </Button>
      </form>
    </div>
  );
}
