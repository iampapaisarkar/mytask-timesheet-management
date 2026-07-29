import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { profileSchema, type ProfileFormValues } from "@mytask/validation";
import { authApi } from "@mytask/api";
import { getErrorMessage } from "@mytask/utils";
import { useAuthStore } from "@/store/authStore";
import { TextInput } from "@/components/ui/TextInput";
import { Button } from "@/components/ui/Button";
import { Card, PageHeader } from "@/components/ui/Card";
import { useToastStore } from "@/store/toastStore";
import { useState } from "react";

export function ProfilePage() {
  const user = useAuthStore((s) => s.user);
  const setUser = useAuthStore((s) => s.setUser);
  const toast = useToastStore();
  const [error, setError] = useState<string | null>(null);
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
    try {
      const res = await authApi.updateProfile(values);
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
          {error ? <p className="text-sm text-negative">{error}</p> : null}
          <Button type="submit" loading={isSubmitting}>
            Update
          </Button>
        </form>
      </Card>
    </div>
  );
}
