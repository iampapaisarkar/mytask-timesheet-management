import { useEffect, useState } from "react";
import { Controller } from "react-hook-form";
import { clsx } from "clsx";
import {
  useCreateJob,
  useCustomers,
  useUpdateJob,
} from "@mytask/hooks";
import {
  jobFormSchema,
  type JobFormValues,
} from "@mytask/validation";
import {
  getErrorMessage,
  phoneValueFromE164,
  fromAddressRecord,
  toAddressApiPayload,
  listRows,
} from "@mytask/utils";
import { Button } from "@/components/ui/Button";
import { FullScreenModal } from "@/components/ui/FullScreenModal";
import { TextInput } from "@/components/ui/TextInput";
import { GlobalPhoneInput } from "@/components/ui/GlobalPhoneInput";
import {
  GoogleAddressAutocomplete,
  emptyAddress,
  type AddressValue,
} from "@/components/GoogleAddress";
import { useToastStore } from "@/store/toastStore";
import { useAppForm, useValidatedSubmit } from "@/hooks/useAppForm";

const selectClass =
  "mt-focus rounded-xl border border-border bg-[var(--mt-surface)] px-3.5 py-3 text-[var(--mt-text)] outline-none focus:border-primary";

const emptyJob: JobFormValues = {
  name: "",
  customer_id: "",
  address_line_1: "",
  formatted_address: "",
  latitude: null,
  longitude: null,
  radius: "100",
  site_contact_name: "",
  site_contact_email: "",
  site_contact_phone_number: "",
  site_contact_phone_country_code: null,
  site_contact_phone_country_iso: null,
};

export type JobRow = {
  id?: number | string;
  name?: string;
  customer?: { id?: number | string; name?: string } | null;
  customer_id?: number | string | null;
  address?: Record<string, unknown> | null;
  radius?: number | string | null;
  site_contact_name?: string | null;
  site_contact_email?: string | null;
  site_contact_phone_number?: string | null;
  site_contact_phone_country_code?: string | null;
  site_contact_phone_country_iso?: string | null;
};

function addressFromJob(job?: JobRow | null): AddressValue {
  return fromAddressRecord(
    (job?.address || null) as Record<string, unknown> | null,
  );
}

function coordsFromAddress(next: AddressValue): {
  latitude: number | null;
  longitude: number | null;
} {
  const latitude =
    next.latitude === "" || next.latitude == null
      ? null
      : Number(next.latitude);
  const longitude =
    next.longitude === "" || next.longitude == null
      ? null
      : Number(next.longitude);
  return { latitude, longitude };
}

export function JobFormDialog({
  open,
  onClose,
  job,
}: {
  open: boolean;
  onClose: () => void;
  job?: JobRow | null;
}) {
  const toast = useToastStore();
  const createMutation = useCreateJob();
  const updateMutation = useUpdateJob();
  const isEdit = job?.id != null;
  const customersQuery = useCustomers({ rows_per_page: 200 }, open);

  const [address, setAddress] = useState<AddressValue>(emptyAddress);

  const form = useAppForm<JobFormValues>({
    schema: jobFormSchema,
    defaultValues: emptyJob,
  });
  const {
    register,
    control,
    reset,
    setValue,
    watch,
    formState: { errors },
  } = form;

  const phoneNumber = watch("site_contact_phone_number");
  const phoneIso = watch("site_contact_phone_country_iso");
  const phoneCode = watch("site_contact_phone_country_code");

  const customers = listRows<{ id?: number; name?: string }>(
    customersQuery.data,
  );

  function handleAddressChange(next: AddressValue) {
    setAddress(next);
    const { latitude, longitude } = coordsFromAddress(next);
    setValue("address_line_1", next.address_line_1 || "", {
      shouldValidate: true,
    });
    setValue("formatted_address", next.formatted_address || "", {
      shouldValidate: true,
    });
    setValue("latitude", latitude, { shouldValidate: true });
    setValue("longitude", longitude, { shouldValidate: true });
  }

  useEffect(() => {
    if (!open) return;
    const addr = addressFromJob(job);
    const { latitude, longitude } = coordsFromAddress(addr);
    const phone = phoneValueFromE164(
      job?.site_contact_phone_number,
      job?.site_contact_phone_country_iso,
    );
    reset({
      name: job?.name || "",
      customer_id:
        job?.customer?.id != null
          ? String(job.customer.id)
          : job?.customer_id != null
            ? String(job.customer_id)
            : "",
      address_line_1: addr.address_line_1 || "",
      formatted_address: addr.formatted_address || "",
      latitude,
      longitude,
      radius: job?.radius != null ? String(job.radius) : "100",
      site_contact_name: job?.site_contact_name || "",
      site_contact_email: job?.site_contact_email || "",
      site_contact_phone_number: phone.phone_number || "",
      site_contact_phone_country_code: phone.phone_country_code,
      site_contact_phone_country_iso: phone.phone_country_iso,
    });
    setAddress(addr);
  }, [open, job, reset]);

  const handleSubmit = useValidatedSubmit(form, async (values) => {
    const payload = {
      name: values.name.trim(),
      customer: { id: Number(values.customer_id) },
      address: toAddressApiPayload(address, { includeCoordinates: true }),
      radius: Number(values.radius),
      site_contact_name: values.site_contact_name?.trim() || null,
      site_contact_email: values.site_contact_email?.trim() || null,
      site_contact_phone_number: values.site_contact_phone_number || null,
      site_contact_phone_country_code: values.site_contact_phone_country_code,
      site_contact_phone_country_iso: values.site_contact_phone_country_iso,
    };

    try {
      if (isEdit && job?.id != null) {
        await updateMutation.mutateAsync({ id: job.id, payload });
        toast.success("Job updated");
      } else {
        await createMutation.mutateAsync(payload);
        toast.success("Job created");
      }
      onClose();
    } catch (err) {
      toast.error(
        isEdit ? "Update failed" : "Create failed",
        getErrorMessage(err),
      );
    }
  });

  const pending = createMutation.isPending || updateMutation.isPending;

  if (!open) return null;

  return (
    <FullScreenModal
      open={open}
      onClose={onClose}
      title={isEdit ? "Edit job" : "Create job"}
      variant="form"
      footer={
        <>
          <Button variant="secondary" onClick={onClose}>
            Cancel
          </Button>
          <Button loading={pending} onClick={handleSubmit}>
            {isEdit ? "Update" : "Create"}
          </Button>
        </>
      }
    >
      <div className="flex flex-col gap-3">
        <TextInput
          label="Name"
          error={errors.name?.message}
          {...register("name")}
        />
        <Controller
          name="customer_id"
          control={control}
          render={({ field }) => (
            <label className="flex w-full flex-col gap-1.5 text-sm">
              <span className="font-medium text-[var(--mt-text)]">Customer</span>
              <select
                className={clsx(
                  selectClass,
                  errors.customer_id && "border-negative",
                )}
                value={field.value}
                onChange={field.onChange}
                onBlur={field.onBlur}
              >
                <option value="">Select customer</option>
                {customers.map((c) => (
                  <option key={String(c.id)} value={String(c.id)}>
                    {c.name || `Customer #${c.id}`}
                  </option>
                ))}
              </select>
              {errors.customer_id?.message ? (
                <span className="text-xs text-negative">
                  {errors.customer_id.message}
                </span>
              ) : null}
            </label>
          )}
        />

        <GoogleAddressAutocomplete
          label="Site address"
          value={address}
          onChange={handleAddressChange}
          requireCoordinates
          showMap
          error={errors.formatted_address?.message}
        />

        <TextInput
          label="Geofence radius (meters)"
          type="number"
          min={1}
          error={errors.radius?.message}
          {...register("radius")}
        />

        <TextInput label="Site contact name" {...register("site_contact_name")} />
        <TextInput
          label="Site contact email"
          type="email"
          error={errors.site_contact_email?.message}
          {...register("site_contact_email")}
        />
        <Controller
          name="site_contact_phone_number"
          control={control}
          render={({ field }) => (
            <GlobalPhoneInput
              label="Site contact phone"
              value={{
                phone_number: phoneNumber || null,
                phone_country_code: phoneCode || null,
                phone_country_iso: phoneIso || null,
              }}
              error={errors.site_contact_phone_number?.message}
              onChange={(phone) => {
                field.onChange(phone.phone_number || "");
                setValue(
                  "site_contact_phone_country_code",
                  phone.phone_country_code,
                  { shouldValidate: true },
                );
                setValue(
                  "site_contact_phone_country_iso",
                  phone.phone_country_iso,
                  { shouldValidate: true },
                );
              }}
              onBlur={field.onBlur}
            />
          )}
        />
      </div>
    </FullScreenModal>
  );
}

/** @deprecated Prefer JobFormDialog */
export function CreateJobDialog(
  props: Omit<Parameters<typeof JobFormDialog>[0], "job">,
) {
  return <JobFormDialog {...props} />;
}
