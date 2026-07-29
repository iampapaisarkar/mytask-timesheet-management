import { useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import {
  createOrganisationSchema,
  type CreateOrganisationFormValues,
} from "@mytask/validation";
import { useCreateOrganisation, useSystemStates } from "@mytask/hooks";
import { ROUTES } from "@mytask/constants";
import { getErrorMessage, getOrganisationRoleCode } from "@mytask/utils";
import type { OrganisationMembership, UserProfile } from "@mytask/types";
import { TextInput } from "@/components/ui/TextInput";
import { Button } from "@/components/ui/Button";
import { LoadingState } from "@/components/ui/States";
import { useAuthStore } from "@/store/authStore";
import { useOrganisationStore } from "@/store/organisationStore";

export function CreateOrganisationPage() {
  const navigate = useNavigate();
  const setUser = useAuthStore((s) => s.setUser);
  const setOrganisation = useOrganisationStore((s) => s.setOrganisation);
  const createMutation = useCreateOrganisation();
  const { data: states, isLoading: statesLoading } = useSystemStates();
  const [error, setError] = useState<string | null>(null);

  const {
    register,
    handleSubmit,
    formState: { errors, isSubmitting },
  } = useForm<CreateOrganisationFormValues>({
    resolver: zodResolver(createOrganisationSchema),
    defaultValues: {
      name: "",
      website: "",
      phone_number: "",
      email: "",
      address_1: "",
      address_2: "",
      city: "",
      state_id: 0,
      postcode: "",
    },
  });

  async function onSubmit(values: CreateOrganisationFormValues) {
    setError(null);
    try {
      const response = await createMutation.mutateAsync({
        name: values.name,
        website: values.website || null,
        phone_number: values.phone_number,
        email: values.email,
        address: {
          address_1: values.address_1,
          address_2: values.address_2 || null,
          city: values.city,
          state: { id: values.state_id },
          postcode: values.postcode,
          latitude: null,
          longitude: null,
        },
      });

      const raw = response.data as unknown;
      let user: UserProfile | undefined;

      if (raw && typeof raw === "object") {
        const record = raw as Record<string, unknown>;
        if (record.user && typeof record.user === "object") {
          user = record.user as UserProfile;
        } else if ("id" in record && "email" in record) {
          user = record as unknown as UserProfile;
        }
      }

      if (user) {
        setUser(user);
      }

      const orgs = (user?.organisations || []) as OrganisationMembership[];
      const created =
        orgs.find((o) => o.name === values.name) || orgs[orgs.length - 1];

      if (created?.code) {
        setOrganisation({
          id: created.id,
          code: created.code,
          name: created.name,
          role: getOrganisationRoleCode(created) || "owner",
        });
        navigate(ROUTES.org(created.code));
        return;
      }

      navigate(ROUTES.home);
    } catch (err) {
      setError(getErrorMessage(err, "Unable to create organisation"));
    }
  }

  if (statesLoading) {
    return <LoadingState label="Loading form…" />;
  }

  return (
    <div className="mx-auto max-w-2xl">
      <div className="mb-6 flex items-start justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold tracking-tight text-[var(--mt-text)]">
            Create organisation
          </h1>
          <p className="mt-1 text-sm text-muted">
            You can create up to 3 organisations.
          </p>
        </div>
        <Link to={ROUTES.home} className="text-sm font-medium text-primary">
          Cancel
        </Link>
      </div>

      <form
        className="mt-card mt-fade-in flex flex-col gap-4 p-6"
        onSubmit={handleSubmit(onSubmit)}
      >
        <TextInput
          label="Name"
          error={errors.name?.message}
          {...register("name")}
        />
        <TextInput label="Website" {...register("website")} />
        <TextInput
          label="Phone number"
          error={errors.phone_number?.message}
          {...register("phone_number")}
        />
        <TextInput
          label="Email"
          type="email"
          error={errors.email?.message}
          {...register("email")}
        />
        <TextInput
          label="Address Line 1"
          error={errors.address_1?.message}
          {...register("address_1")}
        />
        <TextInput label="Address Line 2" {...register("address_2")} />
        <TextInput
          label="City"
          error={errors.city?.message}
          {...register("city")}
        />
        <label className="flex w-full flex-col gap-1.5 text-sm">
          <span className="font-medium text-[var(--mt-text)]">State</span>
          <select
            className={`mt-focus rounded-xl border border-border bg-[var(--mt-surface)] px-3.5 py-3 text-[var(--mt-text)] outline-none focus:border-primary ${
              errors.state_id ? "border-negative" : ""
            }`}
            {...register("state_id")}
            defaultValue=""
          >
            <option value="" disabled>
              Select state
            </option>
            {(states || []).map((state) => (
              <option key={state.id} value={state.id}>
                {state.name}
              </option>
            ))}
          </select>
          {errors.state_id ? (
            <span className="text-xs text-negative">{errors.state_id.message}</span>
          ) : null}
        </label>
        <TextInput
          label="Postcode"
          error={errors.postcode?.message}
          {...register("postcode")}
        />

        {error ? <p className="text-sm text-negative">{error}</p> : null}

        <Button type="submit" loading={isSubmitting || createMutation.isPending}>
          Create
        </Button>
      </form>
    </div>
  );
}
