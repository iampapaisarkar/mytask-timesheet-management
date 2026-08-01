import type { LinkingOptions } from "@react-navigation/native";
import { APP_WEB_HOST, APP_WEB_ORIGIN } from "@mytask/constants";
import type { RootStackParamList } from "./RootNavigator";

/**
 * Universal Links / App Links share the same HTTPS host as the web app so email
 * links open the website on desktop and the native app on mobile when installed.
 */
export const linkingPrefixes = [
  APP_WEB_ORIGIN,
  `https://${APP_WEB_HOST}`,
  "mytask://",
] as const;

export const navigationLinking: LinkingOptions<RootStackParamList> = {
  prefixes: [...linkingPrefixes],
  config: {
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
      BillingHistory: "billing",
      MainTabs: {
        path: "",
        screens: {
          Organisations: "",
          Profile: "profile",
        },
      },
      CreateOrganisation: "organisations/create",
      OrgHome: "org/:orgCode",
      Timesheets: "org/:orgCode/timesheet",
      TimesheetDetail: "org/:orgCode/timesheet/:id/details",
      TimesheetManagementList: "org/:orgCode/timesheet-management",
      TimesheetManagementDetail:
        "org/:orgCode/timesheet-management/:id/details",
      Reports: "org/:orgCode/reports",
      Payouts: "org/:orgCode/payouts",
      PayoutDetail: "org/:orgCode/payouts/:id",
      EmployeesList: "org/:orgCode/employees",
      CustomersList: "org/:orgCode/customers",
      JobsList: "org/:orgCode/jobs",
      SystemLogs: "org/:orgCode/system-logs",
      NotificationsList: "org/:orgCode/notifications",
      SettingsHub: "org/:orgCode/settings",
      OrganisationDetails: "org/:orgCode/settings/organisation-details",
      HolidayCalendars: "org/:orgCode/settings/holiday-calendars",
      PayrollCalendars: "org/:orgCode/settings/payroll-calendars",
      Login: "login",
      Signup: "signup",
      ForgotPassword: "forgot-password",
    },
  },
};
