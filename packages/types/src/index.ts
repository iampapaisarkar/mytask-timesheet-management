export interface ApiInfo {
  status: number;
  response: "success" | "failed";
  timestamp: string;
  noTimeout: boolean;
  message: string | null;
  caption: string | null;
  pagination: PaginationInfo | null;
}

export interface PaginationInfo {
  page?: number;
  per_page?: number;
  total?: number;
  total_pages?: number;
  [key: string]: unknown;
}

export interface ApiResponse<T> {
  data: T;
  info?: ApiInfo;
  message?: string;
  caption?: string;
  pagination?: PaginationInfo;
}

export interface ListParams {
  page?: number;
  per_page?: number;
  sort_by?: string;
  sort_direction?: "asc" | "desc";
  search?: string;
  [key: string]: unknown;
}

export type OrganisationRoleCode = "owner" | "moderator" | "manager" | "staff";

export type CrudPermission = {
  list: boolean;
  view: boolean;
  create: boolean;
  edit: boolean;
  delete: boolean;
};

export type OrganisationAcl = {
  organisationSetting: CrudPermission;
  timesheet: CrudPermission;
  timesheetManagement: CrudPermission;
  report: CrudPermission;
  employee: CrudPermission;
  customer: CrudPermission;
  managementGroup: CrudPermission;
  job: CrudPermission;
  region: CrudPermission;
  holidayCalendar: CrudPermission;
  payrollCalendar: CrudPermission;
  earningRate: CrudPermission;
  awardRate: CrudPermission;
  setting: CrudPermission;
  xero: CrudPermission;
};

export interface UserProfile {
  id: number | string;
  email: string;
  first_name?: string;
  middle_name?: string | null;
  last_name?: string;
  dob?: string | null;
  firebase_user_id?: string;
  organisations?: OrganisationMembership[];
  [key: string]: unknown;
}

export interface OrganisationMembership {
  id: number | string;
  name: string;
  code: string;
  role?: OrganisationRoleCode | string | { id?: number; code?: string; name?: string };
  role_code?: OrganisationRoleCode | string;
  user_organisations_role?: {
    role?: { id?: number; code?: string; name?: string } | null;
  } | null;
  [key: string]: unknown;
}

export interface OrganisationContext {
  id: string | number;
  code: string;
  name: string;
  role?: OrganisationRoleCode | string;
  role_code?: OrganisationRoleCode | string;
}

export type TimesheetStatus = "draft" | "submitted" | "approved" | "rejected" | string;

export interface AuthLoginPayload {
  email: string;
  invitation_token?: string;
  fcmToken?: string | null;
  oldFcmToken?: string | null;
  platform?: string;
  timezone?: string;
}

export interface AuthSignupPayload {
  first_name: string;
  middle_name?: string;
  last_name: string;
  email: string;
  dob?: string;
  uid: string;
  providerData?: unknown[];
  invitation_token?: string;
  fcmToken?: string | null;
  oldFcmToken?: string | null;
  platform?: string;
  timezone?: string;
}

export interface OrganisationInvitation {
  id: number | string;
  organisation_id: number | string;
  employee_id: number | string;
  invitation_token: string;
  email?: string;
  organisation?: { id?: number | string; name?: string } | null;
  role?: { id?: number | string; name?: string; code?: string } | null;
  status?: { id?: number | string; name?: string; code?: string } | null;
  employee?: {
    id?: number | string;
    creator?: {
      full_name?: string;
      first_name?: string;
      last_name?: string;
    } | null;
  } | null;
  [key: string]: unknown;
}

export interface AppNotification {
  id: number | string;
  title?: string;
  body?: string;
  url?: string | null;
  sent_at?: string;
  status?: { id?: number | string; name?: string; code?: string } | null;
  [key: string]: unknown;
}

export type OrgAclRequirement = {
  action: keyof OrganisationAcl;
  permission: keyof CrudPermission;
};
