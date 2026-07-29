import { z } from "zod";

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

export const profileSchema = z.object({
  first_name: z.string().min(1, "Please enter first name"),
  middle_name: z.string().optional().nullable(),
  last_name: z.string().min(1, "Please enter last name"),
  dob: z.string().optional().nullable(),
});

export type ProfileFormValues = z.infer<typeof profileSchema>;

export const namedEntitySchema = z.object({
  name: z.string().min(1, "Please enter name"),
});

export const customerSchema = z.object({
  name: z.string().min(1, "Please enter name"),
  contact_name: z.string().optional().nullable(),
  contact_email: z.string().email().optional().or(z.literal("")).nullable(),
  contact_phone_number: z.string().optional().nullable(),
  hourly_rate: z.union([z.number(), z.string()]).optional().nullable(),
  active: z.boolean().optional(),
});

export type CustomerFormValues = z.infer<typeof customerSchema>;

export const createOrganisationSchema = z.object({
  name: z.string().min(1, "Please enter name"),
  website: z.string().optional().or(z.literal("")),
  phone_number: z.string().min(1, "Please enter phone number"),
  email: z.string().email("Please enter a valid email"),
  address_1: z.string().min(1, "Address Line 1 is required"),
  address_2: z.string().optional().or(z.literal("")),
  city: z.string().min(1, "City is required"),
  state_id: z.coerce.number().min(1, "State is required"),
  postcode: z.string().min(1, "Postcode is required"),
});

export type CreateOrganisationFormValues = z.infer<
  typeof createOrganisationSchema
>;
