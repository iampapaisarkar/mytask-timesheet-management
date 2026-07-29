export function getErrorMessage(error: unknown, fallback = "Something went wrong"): string {
  if (!error) return fallback;
  if (typeof error === "string") return error;
  if (typeof error === "object" && error !== null) {
    const e = error as {
      message?: string;
      response?: { data?: { message?: string; info?: { message?: string | null } } };
    };
    return (
      e.response?.data?.info?.message ||
      e.response?.data?.message ||
      e.message ||
      fallback
    );
  }
  return fallback;
}

export function buildListQuery(params: Record<string, unknown> = {}): Record<string, unknown> {
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
  const parts = [user.first_name, user.middle_name, user.last_name].filter(Boolean);
  return parts.length ? parts.join(" ") : user.email || "User";
}

export function getTimezone(): string {
  try {
    return Intl.DateTimeFormat().resolvedOptions().timeZone || "UTC";
  } catch {
    return "UTC";
  }
}
