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
    sort_by = "created_at",
    sort_direction = "desc",
    search = "",
    ...rest
  } = params;
  return {
    page,
    per_page,
    sort_by,
    sort_direction,
    ...(search ? { search } : {}),
    ...rest,
  };
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
