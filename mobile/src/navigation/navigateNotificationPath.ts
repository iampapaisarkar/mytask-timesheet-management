import type { NativeStackNavigationProp } from "@react-navigation/native-stack";
import { can } from "@mytask/services";
import type { OrganisationAcl } from "@mytask/types";
import type { OrgStackParamList, RootStackParamList } from "./types";

type Nav = NativeStackNavigationProp<RootStackParamList>;

type NavigateOptions = {
  navigation: Nav;
  path: string;
  acl?: OrganisationAcl | null;
  onAccessDenied?: (message: string) => void;
  onUnhandled?: () => void;
};

function pathnameOf(path: string): string {
  const q = path.indexOf("?");
  return q === -1 ? path : path.slice(0, q);
}

function searchParamsOf(path: string): URLSearchParams {
  const q = path.indexOf("?");
  if (q === -1) return new URLSearchParams();
  return new URLSearchParams(path.slice(q + 1));
}

function deny(
  options: NavigateOptions,
  message: string,
): boolean {
  options.onAccessDenied?.(message);
  return true;
}

/**
 * Map a web-style path from `resolveNotificationPath` onto Root / Org navigator screens.
 */
export function navigateNotificationPath(options: NavigateOptions): boolean {
  const { navigation, acl } = options;
  const pathname = pathnameOf(options.path).replace(/\/+$/, "") || "/";
  const search = searchParamsOf(options.path);

  if (pathname === "/" || pathname === "") {
    navigation.navigate("Home");
    return true;
  }

  if (pathname === "/login") {
    navigation.navigate("Login");
    return true;
  }
  if (pathname === "/signup") {
    navigation.navigate("Signup");
    return true;
  }
  if (pathname === "/forgot-password") {
    navigation.navigate("ForgotPassword");
    return true;
  }
  if (pathname === "/auth-actions") {
    navigation.navigate("AuthActions", {
      mode: search.get("mode") || undefined,
      oobCode: search.get("oobCode") || undefined,
      email: search.get("email") || undefined,
    });
    return true;
  }
  if (pathname === "/profile") {
    navigation.navigate("Profile");
    return true;
  }
  if (pathname === "/org-invitation") {
    const token =
      search.get("token") || search.get("invitation_token") || "";
    if (!token) {
      options.onUnhandled?.();
      return false;
    }
    navigation.navigate("OrgInvitation", { token });
    return true;
  }
  if (pathname === "/help" || pathname === "/terms" || pathname === "/privacy") {
    navigation.navigate("Legal", {
      kind: pathname.slice(1) as "help" | "terms" | "privacy",
    });
    return true;
  }
  if (pathname === "/pricing") {
    navigation.navigate("Pricing");
    return true;
  }
  if (pathname === "/subscription") {
    navigation.navigate("Subscription");
    return true;
  }
  if (pathname === "/billing/success") {
    navigation.navigate("BillingSuccess", {
      session_id: search.get("session_id") || undefined,
    });
    return true;
  }
  if (pathname === "/billing") {
    navigation.navigate("BillingHistory");
    return true;
  }
  const billingInvoice = pathname.match(/^\/billing\/([^/]+)$/);
  if (billingInvoice && billingInvoice[1] !== "success") {
    navigation.navigate("BillingInvoice", { id: billingInvoice[1] });
    return true;
  }
  if (pathname === "/organisations/create") {
    navigation.navigate("CreateOrganisation");
    return true;
  }

  const notifications = pathname.match(/^\/org\/([^/]+)\/notifications$/);
  if (notifications) {
    navigation.navigate("NotificationsList", { orgCode: notifications[1] });
    return true;
  }

  const timesheetDay = pathname.match(
    /^\/org\/([^/]+)\/timesheet\/([^/]+)\/days\/([^/]+)$/,
  );
  if (timesheetDay) {
    if (acl && !can(acl, "timesheet", "view")) {
      return deny(
        options,
        "You do not have permission to view this timesheet.",
      );
    }
    navigation.navigate("Organisation", {
      orgCode: timesheetDay[1],
      screen: "TimesheetDayDetail",
      params: {
        orgCode: timesheetDay[1],
        timesheetId: timesheetDay[2],
        dayId: timesheetDay[3],
      },
    });
    return true;
  }

  const timesheetDetail = pathname.match(
    /^\/org\/([^/]+)\/timesheet\/([^/]+)\/details$/,
  );
  if (timesheetDetail) {
    if (acl && !can(acl, "timesheet", "view")) {
      return deny(
        options,
        "You do not have permission to view this timesheet.",
      );
    }
    navigation.navigate("Organisation", {
      orgCode: timesheetDetail[1],
      screen: "TimesheetDetail",
      params: { orgCode: timesheetDetail[1], id: timesheetDetail[2] },
    });
    return true;
  }

  const managementDetail = pathname.match(
    /^\/org\/([^/]+)\/timesheet-management\/([^/]+)\/details$/,
  );
  if (managementDetail) {
    if (
      acl &&
      !can(acl, "timesheetManagement", "view") &&
      !can(acl, "timesheetManagement", "list")
    ) {
      return deny(
        options,
        "You do not have permission to view this timesheet.",
      );
    }
    navigation.navigate("Organisation", {
      orgCode: managementDetail[1],
      screen: "TimesheetManagementDetail",
      params: { orgCode: managementDetail[1], id: managementDetail[2] },
    });
    return true;
  }

  const timesheetList = pathname.match(/^\/org\/([^/]+)\/timesheet$/);
  if (timesheetList) {
    navigation.navigate("Organisation", {
      orgCode: timesheetList[1],
      screen: "OrgTabs",
      params: {
        screen: "Sheets",
        params: {
          screen: "TimesheetList",
          params: { orgCode: timesheetList[1] },
        },
      },
    });
    return true;
  }

  const managementList = pathname.match(
    /^\/org\/([^/]+)\/timesheet-management$/,
  );
  if (managementList) {
    navigation.navigate("Organisation", {
      orgCode: managementList[1],
      screen: "OrgTabs",
      params: {
        screen: "Manage",
        params: {
          screen: "TimesheetManagementList",
          params: { orgCode: managementList[1] },
        },
      },
    });
    return true;
  }

  const payoutDetail = pathname.match(/^\/org\/([^/]+)\/payouts\/([^/]+)$/);
  if (payoutDetail) {
    navigation.navigate("Organisation", {
      orgCode: payoutDetail[1],
      screen: "PayoutDetail",
      params: { orgCode: payoutDetail[1], id: payoutDetail[2] },
    });
    return true;
  }

  const orgStandalone: Array<{
    re: RegExp;
    screen: keyof OrgStackParamList;
  }> = [
    { re: /^\/org\/([^/]+)\/employees$/, screen: "EmployeesList" },
    { re: /^\/org\/([^/]+)\/customers$/, screen: "CustomersList" },
    { re: /^\/org\/([^/]+)\/jobs$/, screen: "JobsList" },
    { re: /^\/org\/([^/]+)\/reports$/, screen: "Reports" },
    { re: /^\/org\/([^/]+)\/payouts$/, screen: "Payouts" },
    { re: /^\/org\/([^/]+)\/system-logs$/, screen: "SystemLogs" },
    {
      re: /^\/org\/([^/]+)\/settings\/organisation-details$/,
      screen: "OrganisationDetails",
    },
    {
      re: /^\/org\/([^/]+)\/settings\/holiday-calendars$/,
      screen: "HolidayCalendars",
    },
    {
      re: /^\/org\/([^/]+)\/settings\/payroll-calendars$/,
      screen: "PayrollCalendars",
    },
    { re: /^\/org\/([^/]+)\/settings$/, screen: "SettingsHub" },
  ];

  for (const { re, screen } of orgStandalone) {
    const m = pathname.match(re);
    if (m) {
      navigation.navigate("Organisation", {
        orgCode: m[1],
        screen,
        params: { orgCode: m[1] },
      });
      return true;
    }
  }

  const orgHome = pathname.match(/^\/org\/([^/]+)$/);
  if (orgHome) {
    navigation.navigate("Organisation", {
      orgCode: orgHome[1],
      screen: "OrgTabs",
      params: {
        screen: "Dashboard",
        params: {
          screen: "OrgDashboard",
          params: { orgCode: orgHome[1] },
        },
      },
    });
    return true;
  }

  options.onUnhandled?.();
  return false;
}
