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
  job: CrudPermission;
  holidayCalendar: CrudPermission;
  payrollCalendar: CrudPermission;
  setting: CrudPermission;
  payout: CrudPermission;
};

/** International phone fields (E.164 + metadata). */
export interface PhoneFields {
  phone_number?: string | null;
  phone_country_code?: string | null;
  phone_country_iso?: string | null;
}

export interface UserProfile {
  id: number | string;
  email: string;
  first_name?: string;
  middle_name?: string | null;
  last_name?: string;
  dob?: string | null;
  phone_number?: string | null;
  phone_country_code?: string | null;
  phone_country_iso?: string | null;
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
  phone_number?: string | null;
  phone_country_code?: string | null;
  phone_country_iso?: string | null;
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

/** Screen-oriented API DTOs (UI view models — not DB tables). */

export interface NamedLookup {
  id: number | string;
  name: string | null;
  code?: string;
}

export interface OrgBootstrapView {
  organisation: Record<string, unknown>;
  organisations: OrganisationMembership[];
  notifications: {
    items: AppNotification[];
    unread_count: number;
  };
}

export interface HomeBootstrapView {
  organisations: OrganisationMembership[];
  invitations: OrganisationInvitation[];
}

export interface EmployeeFormLookupsView {
  /** Preferred key when present; falls back to `roles`. */
  organisation_roles?: NamedLookup[];
  roles: NamedLookup[];
  employment_types: NamedLookup[];
  payroll_calendars: NamedLookup[];
  /** @deprecated MVP — no longer used by employee form UI */
  nok_relations?: NamedLookup[];
  employment_status?: NamedLookup[];
  timesheet_submission_frequencies?: NamedLookup[];
}

export interface JobOptionView {
  id: number | string;
  name: string | null;
}

export interface TimesheetDayEditorView {
  available_jobs: JobOptionView[];
  permissions?: { can_save?: boolean; [key: string]: unknown };
  tasks?: unknown[];
  is_public_holiday?: boolean;
  [key: string]: unknown;
}

export interface DashboardOverviewView {
  source?: string;
  kpis: {
    approved: number;
    draft: number;
    submitted: number;
    rejected: number;
    total: number;
    approval_rate_pct: number;
  };
  status_donut: Array<{ code: string; name: string; count: number }>;
  weekly_progress: Array<{ day: string; completed: number; pending: number }>;
  monthly_progress: Array<{ week: string; progress_pct: number }>;
  productivity_trend: Array<{ label: string; value: number }>;
  team_activity: Array<{ name: string; count: number }>;
  recent_activity: Array<{
    title: string;
    meta: string;
    at?: string | null;
    url?: string | null;
  }>;
  quick_links_hint: {
    has_pending_approvals: boolean;
    open_timesheet_id: number | string | null;
  };
}

