import type { LinkingOptions } from "@react-navigation/native";
import { APP_WEB_HOST, APP_WEB_ORIGIN } from "@mytask/constants";
import type { RootStackParamList } from "./types";

/**
 * Universal Links / App Links share the same HTTPS host as the web app so email
 * links open the website on desktop and the native app on mobile when installed.
 */
export const linkingPrefixes = [
  APP_WEB_ORIGIN,
  `https://${APP_WEB_HOST}`,
  "mytask://",
] as const;

const linkingConfig = {
  screens: {
    OrgInvitation: {
      path: "org-invitation",
      parse: {
        token: (value: string) => value,
      },
    },
    Legal: {
      path: ":kind(help|terms|privacy)",
      parse: {
        kind: (value: string) => {
          if (value === "terms" || value === "privacy" || value === "help") {
            return value;
          }
          return "help";
        },
      },
    },
    Pricing: "pricing",
    Subscription: "subscription",
    BillingSuccess: {
      path: "billing/success",
      parse: {
        session_id: (value: string) => value,
      },
    },
    BillingHistory: "billing",
    BillingInvoice: "billing/:id",
    Home: "",
    Profile: "profile",
    CreateOrganisation: "organisations/create",
    NotificationsList: "org/:orgCode/notifications",
    Organisation: {
      path: "org/:orgCode",
      screens: {
        OrgTabs: {
          path: "",
          screens: {
            Dashboard: {
              path: "",
              screens: {
                OrgDashboard: "",
              },
            },
            Sheets: {
              screens: {
                TimesheetList: "timesheet",
              },
            },
            Manage: {
              screens: {
                TimesheetManagementList: "timesheet-management",
              },
            },
            More: {
              screens: {
                MoreHome: "more",
              },
            },
          },
        },
        TimesheetDetail: "timesheet/:id/details",
        TimesheetManagementDetail: "timesheet-management/:id/details",
        TimesheetDayDetail: "timesheet/:timesheetId/days/:dayId",
        EmployeesList: "employees",
        CustomersList: "customers",
        JobsList: "jobs",
        Reports: "reports",
        Payouts: "payouts",
        PayoutDetail: "payouts/:id",
        SystemLogs: "system-logs",
        SettingsHub: "settings",
        OrganisationDetails: "settings/organisation-details",
        HolidayCalendars: "settings/holiday-calendars",
        PayrollCalendars: "settings/payroll-calendars",
      },
    },
    Login: "login",
    Signup: "signup",
    ForgotPassword: "forgot-password",
    AuthActions: {
      path: "auth-actions",
      parse: {
        mode: (value: string) => value,
        oobCode: (value: string) => value,
        email: (value: string) => value,
      },
    },
  },
} as const;

export const navigationLinking: LinkingOptions<RootStackParamList> = {
  prefixes: [...linkingPrefixes],
  // Nested org paths — PathConfig generics don't model multi-level tab/stack trees.
  config: linkingConfig as unknown as LinkingOptions<RootStackParamList>["config"],
};
