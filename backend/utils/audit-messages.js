/**
 * Human-readable audit copy for non-technical users.
 */

const FEATURE_BY_PREFIX = [
  [/\/auth\/login/, "Login"],
  [/\/auth\/signup/, "Sign Up"],
  [/\/auth\/forgot-password/, "Reset Password"],
  [/\/auth\/logout/, "Logout"],
  [/\/auth\//, "Authentication"],
  [/\/employees/, "Employees"],
  [/\/customers/, "Customers"],
  [/\/jobs/, "Jobs"],
  [/\/timesheet-management/, "Timesheet Management"],
  [/\/timesheets/, "Timesheets"],
  [/\/timesheet-activity/, "Time Tracking"],
  [/\/payouts/, "Payroll"],
  [/\/payroll-calendars/, "Payroll Calendar"],
  [/\/holiday-calendars/, "Holiday Calendar"],
  [/\/reports/, "Reports"],
  [/\/notifications/, "Notifications"],
  [/\/organisations/, "Organisation"],
  [/\/screens\/dashboard/, "Dashboard"],
  [/\/screens/, "Screens"],
  [/\/system-logs/, "System Logs"],
  [/\/system\//, "System"],
];

export function featureFromPath(path = "") {
  const p = String(path).split("?")[0];
  for (const [re, label] of FEATURE_BY_PREFIX) {
    if (re.test(p)) return label;
  }
  return "API";
}

export function friendlyInternalMessage({ success, statusCode, feature, path }) {
  const label = feature || featureFromPath(path) || "Request";
  if (success) {
    return `${label} completed successfully.`;
  }
  switch (Number(statusCode)) {
    case 401:
      return "Your login session expired or is invalid. Please sign in again.";
    case 403:
      return "You do not have permission to perform this action.";
    case 404:
      return "The requested record could not be found.";
    case 409:
      return "This action conflicts with the current state. Please refresh and try again.";
    case 422:
    case 400:
      return "Some details look incorrect. Please review and try again.";
    case 429:
      return "Too many requests. Please wait a moment and try again.";
    case 502:
    case 503:
    case 504:
      return "A dependent service is temporarily unavailable. Please try again shortly.";
    case 500:
    default:
      return `${label} could not be completed due to an unexpected error.`;
  }
}

export function errorCategoryFromStatus(statusCode) {
  const code = Number(statusCode);
  if (code === 401) return "authentication";
  if (code === 403) return "authorization";
  if (code === 422 || code === 400) return "validation";
  if (code === 404) return "not_found";
  if (code === 409) return "conflict";
  if (code === 429) return "rate_limit";
  if (code >= 500) return "server";
  if (code >= 400) return "client";
  return null;
}

export function friendlyExternalMessage({ success, apiName, statusCode }) {
  const name = apiName || "External service";
  if (success) return `${name} request completed successfully.`;
  if (Number(statusCode) === 401 || Number(statusCode) === 403) {
    return `${name} rejected the request (authentication/authorization).`;
  }
  if (Number(statusCode) >= 500 || !statusCode) {
    return `${name} is temporarily unavailable.`;
  }
  if (Number(statusCode) === 429) {
    return `${name} rate limit reached. Please try again shortly.`;
  }
  return `Unable to complete ${name} request.`;
}

export function friendlyEmailMessage({ success, template }) {
  const label = templateLabel(template);
  if (success) return `${label} email sent successfully.`;
  return `Unable to send ${label} email.`;
}

function templateLabel(template) {
  if (!template) return "Notification";
  const t = String(template).replace(/\.html$/i, "").replace(/[-_]/g, " ");
  return t.replace(/\b\w/g, (c) => c.toUpperCase());
}

export default {
  featureFromPath,
  friendlyInternalMessage,
  friendlyExternalMessage,
  friendlyEmailMessage,
  errorCategoryFromStatus,
};
