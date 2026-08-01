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

export const checkoutSchema = z.object({
  billing_interval: z.enum(["month", "year"]),
});

export type CheckoutFormValues = z.infer<typeof checkoutSchema>;

/** YYYY-MM-DD calendar date. */
export const isoDateSchema = z
  .string()
  .min(1, "Please enter a date")
  .regex(/^\d{4}-\d{2}-\d{2}$/, "Date must be YYYY-MM-DD");

export const organisationDetailsSchema = z.object({
  name: z.string().min(1, "Please enter organisation name"),
  website: z.string().optional().nullable().or(z.literal("")),
  email: z
    .string()
    .email("Please enter a valid email")
    .optional()
    .nullable()
    .or(z.literal("")),
  phone_number: e164PhoneSchema.optional().nullable().or(z.literal("")),
  phone_country_code: z.string().optional().nullable(),
  phone_country_iso: z.string().optional().nullable(),
});

export type OrganisationDetailsFormValues = z.infer<
  typeof organisationDetailsSchema
>;

export const holidayCalendarSchema = z.object({
  name: z.string().min(1, "Please enter holiday name"),
  date: isoDateSchema,
});

export type HolidayCalendarFormValues = z.infer<typeof holidayCalendarSchema>;

export const payrollCalendarSchema = z.object({
  name: z.string().min(1, "Please enter calendar name"),
  pay_cycle_id: z.string().min(1, "Please select a pay cycle"),
  start_date: isoDateSchema,
  first_payment_date: isoDateSchema,
});

export type PayrollCalendarFormValues = z.infer<typeof payrollCalendarSchema>;

export const jobFormSchema = z
  .object({
    name: z.string().min(1, "Please enter job name"),
    customer_id: z.string().min(1, "Please select a customer"),
    address_line_1: z.string().optional().nullable().or(z.literal("")),
    formatted_address: z.string().optional().nullable().or(z.literal("")),
    latitude: z.number().nullable().optional(),
    longitude: z.number().nullable().optional(),
    radius: z
      .string()
      .min(1, "Please enter geofence radius")
      .refine((v) => Number(v) > 0, "Radius must be greater than 0"),
    site_contact_name: z.string().optional().nullable().or(z.literal("")),
    site_contact_email: z
      .string()
      .email("Please enter a valid email")
      .optional()
      .nullable()
      .or(z.literal("")),
    site_contact_phone_number: z
      .string()
      .optional()
      .nullable()
      .or(z.literal(""))
      .refine(
        (v) => !v || /^\+[1-9]\d{7,14}$/.test(v),
        "Enter a valid international phone (E.164)",
      ),
    site_contact_phone_country_code: z.string().optional().nullable(),
    site_contact_phone_country_iso: z.string().optional().nullable(),
  })
  .refine(
    (data) =>
      Boolean(data.address_line_1?.trim() || data.formatted_address?.trim()),
    { message: "Please select a site address", path: ["formatted_address"] },
  )
  .refine(
    (data) => data.latitude != null && data.longitude != null,
    {
      message: "Select an address with map coordinates",
      path: ["formatted_address"],
    },
  );

export type JobFormValues = z.infer<typeof jobFormSchema>;

export const createTimesheetSchema = z.object({
  employee_id: z.string().min(1, "Please select an employee"),
  period_key: z.string().min(1, "Please select a pay period"),
  job_ids: z.array(z.string()).min(1, "Please select at least one job"),
});

export type CreateTimesheetFormValues = z.infer<typeof createTimesheetSchema>;

export const remarksSchema = z.object({
  remarks: z.string().min(1, "Please enter remarks"),
});

export type RemarksFormValues = z.infer<typeof remarksSchema>;

export const timesheetDayTaskSchema = z
  .object({
    job_id: z.string().min(1, "Please select a job"),
    start_time: z.string().min(1, "Please enter start time"),
    end_time: z.string().min(1, "Please enter end time"),
    break_minutes: z.string().optional().nullable().or(z.literal("")),
    notes: z.string().optional().nullable().or(z.literal("")),
  })
  .refine(
    (data) => {
      if (!data.start_time || !data.end_time) return true;
      return data.end_time > data.start_time;
    },
    { message: "End time must be after start time", path: ["end_time"] },
  );

export type TimesheetDayTaskFormValues = z.infer<typeof timesheetDayTaskSchema>;

export type TimesheetDayTaskFieldErrors = Partial<
  Record<"job_id" | "start_time" | "end_time", string>
>;

/** Validates one timesheet day sheet row; break/travel skip job_id. */
export function validateTimesheetDayTaskRow(
  task: {
    type: "working" | "break" | "travel";
    job_id: string;
    start_time: string;
    end_time: string;
    remarks?: string | null;
  },
  defaultJobId = "",
): TimesheetDayTaskFieldErrors {
  if (task.type === "working") {
    const result = timesheetDayTaskSchema.safeParse({
      job_id: task.job_id || defaultJobId,
      start_time: task.start_time,
      end_time: task.end_time,
      break_minutes: "",
      notes: task.remarks || "",
    });
    if (result.success) return {};
    const errors: TimesheetDayTaskFieldErrors = {};
    for (const issue of result.error.issues) {
      const key = issue.path[0];
      if (key === "job_id" || key === "start_time" || key === "end_time") {
        errors[key] = issue.message;
      }
    }
    return errors;
  }

  const errors: TimesheetDayTaskFieldErrors = {};
  if (!task.start_time?.trim()) {
    errors.start_time = "Please enter start time";
  }
  if (!task.end_time?.trim()) {
    errors.end_time = "Please enter end time";
  } else if (
    task.start_time &&
    task.end_time &&
    task.end_time <= task.start_time
  ) {
    errors.end_time = "End time must be after start time";
  }
  return errors;
}

export const employeeEmailStepSchema = z.object({
  email: z.string().email("Please enter a valid email").min(1, "Please enter email"),
});

export type EmployeeEmailStepValues = z.infer<typeof employeeEmailStepSchema>;

export const employeeDetailsStepSchema = z.object({
  first_name: z.string().min(1, "Please enter first name"),
  middle_name: z.string().optional().nullable().or(z.literal("")),
  last_name: z.string().min(1, "Please enter last name"),
  email: z.string().email("Please enter a valid email"),
  preferred_name: z.string().optional().nullable().or(z.literal("")),
  dob: isoDateSchema,
  phone_number: e164PhoneSchema,
  phone_country_code: z.string().optional().nullable(),
  phone_country_iso: z.string().optional().nullable(),
  address_line_1: z.string().optional().nullable().or(z.literal("")),
  formatted_address: z.string().optional().nullable().or(z.literal("")),
  role_id: z.string().min(1, "Please select a role"),
}).refine(
  (data) =>
    Boolean(data.address_line_1?.trim() || data.formatted_address?.trim()),
  { message: "Please select or enter an address", path: ["formatted_address"] },
);

export type EmployeeDetailsStepValues = z.infer<typeof employeeDetailsStepSchema>;

export const employeeWageStepSchema = z
  .object({
    start_date: isoDateSchema,
    employment_type_id: z.string().min(1, "Please select employment type"),
    payroll_calendar_id: z.string().min(1, "Please select payroll calendar"),
    pay_type: z.enum(["HOURLY", "FIXED"]),
    currency: z.string().min(1, "Please select currency"),
    hourly_rate: z.string().optional().nullable().or(z.literal("")),
    fixed_rate: z.string().optional().nullable().or(z.literal("")),
  })
  .superRefine((data, ctx) => {
    if (data.pay_type === "HOURLY") {
      if (!data.hourly_rate?.trim() || Number(data.hourly_rate) <= 0) {
        ctx.addIssue({
          code: z.ZodIssueCode.custom,
          message: "Please enter hourly rate",
          path: ["hourly_rate"],
        });
      }
    } else if (!data.fixed_rate?.trim() || Number(data.fixed_rate) <= 0) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        message: "Please enter fixed rate",
        path: ["fixed_rate"],
      });
    }
  });

export type EmployeeWageStepValues = z.infer<typeof employeeWageStepSchema>;

export const employeePayrollStepSchema = z
  .object({
    payment_method: z.enum(["CASH", "DIRECT_DEBIT", "BANK_TRANSFER"]),
    account_holder_name: z.string().optional().nullable().or(z.literal("")),
    bank_name: z.string().optional().nullable().or(z.literal("")),
    bank_account_number: z.string().optional().nullable().or(z.literal("")),
    ifsc_code: z.string().optional().nullable().or(z.literal("")),
    swift_code: z.string().optional().nullable().or(z.literal("")),
  })
  .superRefine((data, ctx) => {
    if (data.payment_method !== "BANK_TRANSFER") return;
    if (!data.account_holder_name?.trim()) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        message: "Account holder name is required",
        path: ["account_holder_name"],
      });
    }
    if (!data.bank_name?.trim()) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        message: "Bank name is required",
        path: ["bank_name"],
      });
    }
    if (!data.bank_account_number?.trim()) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        message: "Bank account number is required",
        path: ["bank_account_number"],
      });
    }
    if (!data.ifsc_code?.trim()) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        message: "IFSC code is required",
        path: ["ifsc_code"],
      });
    }
    if (!data.swift_code?.trim()) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        message: "SWIFT code is required",
        path: ["swift_code"],
      });
    }
  });

export type EmployeePayrollStepValues = z.infer<typeof employeePayrollStepSchema>;

export const reportGenerateSchema = z.object({
  employee_id: z.string().min(1, "Please select an employee"),
  timesheet_id: z.string().min(1, "Please select an approved timesheet"),
});

export type ReportGenerateFormValues = z.infer<typeof reportGenerateSchema>;
