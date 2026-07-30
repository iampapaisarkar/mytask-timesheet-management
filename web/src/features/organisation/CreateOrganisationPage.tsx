import { useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import { useForm, Controller } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import {
  createOrganisationSchema,
  type CreateOrganisationFormValues,
} from "@mytask/validation";
import { useCreateOrganisation } from "@mytask/hooks";
import { ROUTES, currencyFromCountryIso } from "@mytask/constants";
import {
  getErrorMessage,
  getOrganisationRoleCode,
  toAddressApiPayload,
} from "@mytask/utils";
import type { OrganisationMembership, UserProfile } from "@mytask/types";
import { TextInput } from "@/components/ui/TextInput";
import { GlobalPhoneInput } from "@/components/ui/GlobalPhoneInput";
import { Button } from "@/components/ui/Button";
import {
  GoogleAddressAutocomplete,
  emptyAddress,
  type AddressValue,
} from "@/components/GoogleAddress";
import { useAuthStore } from "@/store/authStore";
import { useOrganisationStore } from "@/store/organisationStore";

export function CreateOrganisationPage() {
  const navigate = useNavigate();
  const setUser = useAuthStore((s) => s.setUser);
  const setOrganisation = useOrganisationStore((s) => s.setOrganisation);
  const createMutation = useCreateOrganisation();
  const [error, setError] = useState<string | null>(null);
  const [address, setAddress] = useState<AddressValue>(emptyAddress);

  const {
    register,
    handleSubmit,
    setValue,
    control,
    watch,
    formState: { errors, isSubmitting },
  } = useForm<CreateOrganisationFormValues>({
    resolver: zodResolver(createOrganisationSchema),
    defaultValues: {
      name: "",
      website: "",
      phone_number: "",
      phone_country_code: null,
      phone_country_iso: null,
      email: "",
      address_1: "",
      address_line_1: "",
      address_2: "",
      address_line_2: "",
      street: "",
      city: "",
      state_id: undefined,
      state_name: "",
      state_region_province: "",
      postcode: "",
      postal_code: "",
    },
  });

  const phoneNumber = watch("phone_number");
  const phoneIso = watch("phone_country_iso");
  const phoneCode = watch("phone_country_code");

  function handleAddressChange(next: AddressValue) {
    setAddress(next);
    setValue("address_1", next.address_line_1 || next.street_address || next.address_1, {
      shouldValidate: true,
    });
    setValue("address_line_1", next.address_line_1 || "", {
      shouldValidate: true,
    });
    setValue("formatted_address", next.formatted_address || "", {
      shouldValidate: true,
    });
    setValue("address_2", next.address_line_2 || next.address_2 || "", {
      shouldValidate: true,
    });
    setValue("address_line_2", next.address_line_2 || "", {
      shouldValidate: true,
    });
    setValue("street", next.street || "", { shouldValidate: true });
    setValue("city", next.city || "", { shouldValidate: true });
    setValue("state_id", next.state?.id, { shouldValidate: true });
    setValue(
      "state_name",
      next.state_region_province ||
        next.administrative_area ||
        next.state?.name ||
        next.state?.code ||
        "",
      { shouldValidate: true },
    );
    setValue("state_region_province", next.state_region_province || "", {
      shouldValidate: true,
    });
    setValue("postcode", next.postal_code || next.postcode || "", {
      shouldValidate: true,
    });
    setValue("postal_code", next.postal_code || "", { shouldValidate: true });
    setValue("country", next.country || null);
    setValue("country_code", next.country_code || null);
    setValue("place_id", next.place_id || null);
    setValue("administrative_area", next.state_region_province || null);
  }

  async function onSubmit(values: CreateOrganisationFormValues) {
    setError(null);
    try {
      const response = await createMutation.mutateAsync({
        name: values.name,
        website: values.website || null,
        phone_number: values.phone_number,
        phone_country_code: values.phone_country_code,
        phone_country_iso: values.phone_country_iso,
        default_country:
          values.country_code || values.phone_country_iso || null,
        default_currency: currencyFromCountryIso(
          values.country_code || values.phone_country_iso || null,
        ),
        email: values.email,
        address: toAddressApiPayload(address, { includeCoordinates: false }),
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
                setValue("phone_country_code", phone.phone_country_code);
                setValue("phone_country_iso", phone.phone_country_iso);
              }}
              onBlur={field.onBlur}
            />
          )}
        />
        <TextInput
          label="Email"
          type="email"
          error={errors.email?.message}
          {...register("email")}
        />

        <div>
          <GoogleAddressAutocomplete
            label="Address"
            value={address}
            onChange={handleAddressChange}
            requireCoordinates={false}
            error={errors.address_1?.message}
          />
        </div>

        {error ? <p className="text-sm text-negative">{error}</p> : null}

        <Button type="submit" loading={isSubmitting || createMutation.isPending}>
          Create
        </Button>
      </form>
    </div>
  );
}
