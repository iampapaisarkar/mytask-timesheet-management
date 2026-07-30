export function getErrorMessage(
  error: unknown,
  fallback = "Something went wrong",
): string {
  if (!error) return fallback;
  if (typeof error === "string") return error;
  if (typeof error === "object" && error !== null) {
    const e = error as {
      message?: string;
      code?: string;
      isApiError?: boolean;
      response?: {
        data?: { message?: string; info?: { message?: string | null } };
      };
    };
    if (e.code === "ERR_CANCELED" || e.message === "Request cancelled") {
      return fallback;
    }
    if (e.isApiError && e.message) return e.message;
    return (
      e.response?.data?.info?.message ||
      e.response?.data?.message ||
      e.message ||
      fallback
    );
  }
  return fallback;
}

export function buildListQuery(
  params: Record<string, unknown> = {},
): Record<string, unknown> {
  const {
    page = 1,
    per_page = 10,
    page_number,
    rows_per_page,
    sort_by = "created_at",
    sort_direction = "desc",
    search = "",
    ...rest
  } = params;
  const pageNumber = Number(page_number ?? page) || 1;
  const rowsPerPage = Number(rows_per_page ?? per_page) || 10;
  return {
    page: pageNumber,
    per_page: rowsPerPage,
    page_number: pageNumber,
    rows_per_page: rowsPerPage,
    sort_by,
    sort_direction,
    ...(search ? { search } : {}),
    ...rest,
  };
}

export type ListPagination = {
  total_rows?: number;
  rows_per_page?: number;
  page_number?: number;
  total_pages?: number;
  [key: string]: unknown;
};

export type PaginatedList<T = unknown> = {
  data: T[];
  pagination: ListPagination | null;
};

/**
 * Backend response envelope lifts `pagination` into `info.pagination`.
 * Read both so list UIs keep working.
 */
export function extractPagination(body: unknown): ListPagination | null {
  if (!body || typeof body !== "object") return null;
  const record = body as {
    pagination?: ListPagination | null;
    info?: { pagination?: ListPagination | null };
    meta?: { pagination?: ListPagination | null };
  };
  return (
    record.pagination ||
    record.info?.pagination ||
    record.meta?.pagination ||
    null
  );
}

/** Normalize hook results that may be a bare array or `{ data, pagination }`. */
export function listRows<T = unknown>(queryData: unknown): T[] {
  if (!queryData) return [];
  if (Array.isArray(queryData)) return queryData as T[];
  if (
    typeof queryData === "object" &&
    Array.isArray((queryData as { data?: unknown }).data)
  ) {
    return (queryData as { data: T[] }).data;
  }
  return [];
}

export function listPagination(queryData: unknown): ListPagination | null {
  if (!queryData || typeof queryData !== "object" || Array.isArray(queryData)) {
    return null;
  }
  return (queryData as PaginatedList).pagination ?? null;
}

/** Normalize org list / user.organisations items into OrganisationContext fields. */
export function getOrganisationRoleCode(org: {
  role?: unknown;
  role_code?: unknown;
  user_organisations_role?: { role?: { code?: string } | null } | null;
}): string | undefined {
  if (typeof org.role_code === "string") return org.role_code;
  if (typeof org.role === "string") return org.role;
  if (org.role && typeof org.role === "object" && "code" in org.role) {
    const code = (org.role as { code?: string }).code;
    if (code) return code;
  }
  return org.user_organisations_role?.role?.code;
}

export function displayName(user: {
  first_name?: string | null;
  middle_name?: string | null;
  last_name?: string | null;
  email?: string;
}): string {
  const parts = [user.first_name, user.middle_name, user.last_name].filter(
    Boolean,
  );
  return parts.length ? parts.join(" ") : user.email || "User";
}

/** Append " (You)" when the listed person is the current org employee. */
export function withYouLabel(
  name: string | null | undefined,
  isYou: boolean,
): string {
  const base = (name || "").trim() || "Employee";
  if (!isYou) return base;
  if (/\(You\)\s*$/i.test(base)) return base;
  return `${base} (You)`;
}

export function getTimezone(): string {
  try {
    return Intl.DateTimeFormat().resolvedOptions().timeZone || "UTC";
  } catch {
    return "UTC";
  }
}

export * from "./phone";
export * from "./locale";
export * from "./address";
export * from "./datetime";

