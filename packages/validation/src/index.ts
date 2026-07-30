import { z } from "zod";

/** E.164: + and 8–15 digits total after +. */
export const e164PhoneSchema = z
  .string()
  .regex(/^\+[1-9]\d{7,14}$/, "Enter a valid international phone (E.164)");

export const phoneCountryIsoSchema = z
  .string()
  .length(2, "Country ISO must be 2 letters")
  .regex(/^[A-Za-z]{2}$/, "Invalid country ISO")
  .transform((v) => v.toUpperCase());

/** Shared phone fields sent with every phone-bearing API payload. */
export const phoneFieldsSchema = z.object({
  phone_number: e164PhoneSchema,
  phone_country_code: z
    .string()
    .regex(/^\+\d{1,4}$/, "Invalid country dial code")
    .optional()
    .nullable(),
  phone_country_iso: phoneCountryIsoSchema.optional().nullable(),
});

export const optionalPhoneFieldsSchema = z.object({
  phone_number: e164PhoneSchema.optional().nullable().or(z.literal("")),
  phone_country_code: z.string().optional().nullable(),
  phone_country_iso: z.string().optional().nullable(),
});

export const loginSchema = z.object({
  email: z.string().email("Please enter a valid email").min(1, "Please enter your email"),
  password: z.string().min(1, "Please enter your password"),
});

export type LoginFormValues = z.infer<typeof loginSchema>;

export const signupSchema = z
  .object({
    first_name: z.string().min(1, "Please enter first name"),
    middle_name: z.string().optional(),
    last_name: z.string().min(1, "Please enter last name"),
    email: z.string().email("Please enter a valid email"),
    dob: z.string().optional(),
    phone_number: e164PhoneSchema,
    phone_country_code: z.string().optional().nullable(),
    phone_country_iso: phoneCountryIsoSchema.optional().nullable(),
    password: z.string().min(6, "Password must be at least 6 characters"),
    confirm_password: z.string().min(1, "Please confirm password"),
  })
  .refine((data) => data.password === data.confirm_password, {
    message: "Passwords do not match",
    path: ["confirm_password"],
  });

export type SignupFormValues = z.infer<typeof signupSchema>;

export const forgotPasswordSchema = z.object({
  email: z.string().email("Please enter a valid email").min(1, "Please enter your email"),
});

export type ForgotPasswordFormValues = z.infer<typeof forgotPasswordSchema>;

export const resetPasswordSchema = z
  .object({
    password: z.string().min(6, "Password must be at least 6 characters"),
    confirm_password: z.string().min(1, "Please confirm password"),
  })
  .refine((data) => data.password === data.confirm_password, {
    message: "Confirm password does not match",
    path: ["confirm_password"],
  });

export type ResetPasswordFormValues = z.infer<typeof resetPasswordSchema>;

export const profileSchema = z.object({
  first_name: z.string().min(1, "Please enter first name"),
  middle_name: z.string().optional().nullable(),
  last_name: z.string().min(1, "Please enter last name"),
  dob: z.string().optional().nullable(),
  phone_number: e164PhoneSchema.optional().nullable().or(z.literal("")),
  phone_country_code: z.string().optional().nullable(),
  phone_country_iso: z.string().optional().nullable(),
});

export type ProfileFormValues = z.infer<typeof profileSchema>;

export const namedEntitySchema = z.object({
  name: z.string().min(1, "Please enter name"),
});

export const customerSchema = z.object({
  name: z.string().min(1, "Please enter name"),
  abn: z.string().optional().nullable(),
  address: z.string().optional().nullable(),
  contact_name: z.string().optional().nullable(),
  contact_email: z.string().email().optional().or(z.literal("")).nullable(),
  contact_phone_number: z
    .string()
    .optional()
    .nullable()
    .or(z.literal(""))
    .refine(
      (v) => !v || /^\+[1-9]\d{7,14}$/.test(v),
      "Enter a valid international phone (E.164)",
    ),
  contact_phone_country_code: z.string().optional().nullable(),
  contact_phone_country_iso: z.string().optional().nullable(),
  hourly_rate: z.union([z.number(), z.string()]).optional().nullable(),
  currency: z
    .enum(["USD", "AUD", "INR", "GBP", "EUR", "NZD", "CAD", "SGD"])
    .optional()
    .default("AUD"),
});

export type CustomerFormValues = z.infer<typeof customerSchema>;

export const createOrganisationSchema = z
  .object({
    name: z.string().min(1, "Please enter name"),
    website: z.string().optional().or(z.literal("")),
    phone_number: e164PhoneSchema,
    phone_country_code: z.string().optional().nullable(),
    phone_country_iso: phoneCountryIsoSchema.optional().nullable(),
    default_country: phoneCountryIsoSchema.optional().nullable(),
    email: z.string().email("Please enter a valid email"),
    address_1: z.string().optional().or(z.literal("")),
    address_line_1: z.string().optional().or(z.literal("")),
    formatted_address: z.string().optional().or(z.literal("")),
    address_2: z.string().optional().or(z.literal("")),
    address_line_2: z.string().optional().or(z.literal("")),
    street: z.string().optional().or(z.literal("")),
    city: z.string().optional().or(z.literal("")),
    state_id: z.coerce.number().optional(),
    state_name: z.string().optional().or(z.literal("")),
    state_region_province: z.string().optional().or(z.literal("")),
    postcode: z.string().optional().or(z.literal("")),
    postal_code: z.string().optional().or(z.literal("")),
    country: z.string().optional().nullable(),
    country_code: z.string().optional().nullable(),
    place_id: z.string().optional().nullable(),
    administrative_area: z.string().optional().nullable(),
  })
  .refine(
    (data) =>
      Boolean(
        data.address_line_1?.trim() ||
          data.address_1?.trim() ||
          data.formatted_address?.trim() ||
          data.street?.trim(),
      ),
    {
      message: "Please select an address from Google Places",
      path: ["address_1"],
    },
  );

export type CreateOrganisationFormValues = z.infer<
  typeof createOrganisationSchema
>;
