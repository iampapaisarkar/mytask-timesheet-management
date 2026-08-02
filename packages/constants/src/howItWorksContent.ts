/** Shared “How it works” setup guide — web + mobile. */

export type HowItWorksPlatform = "web" | "mobile" | "both";

export type HowItWorksStep = {
  id: string;
  title: string;
  summary: string;
  details: string[];
  platform: HowItWorksPlatform;
};

export type HowItWorksPhase = {
  id: string;
  title: string;
  subtitle: string;
  steps: HowItWorksStep[];
};

export const HOW_IT_WORKS_INTRO = {
  title: "How myTask works",
  subtitle:
    "A clear setup path from your first account to live time tracking, approvals, and payroll — on web and mobile.",
  tip: "Follow the phases in order the first time. You can jump ahead later once your organisation is set up.",
} as const;

export const HOW_IT_WORKS_PHASES: HowItWorksPhase[] = [
  {
    id: "account",
    title: "1. Create your account",
    subtitle: "Sign up once — your personal profile and subscription live here.",
    steps: [
      {
        id: "signup",
        title: "Sign up or log in",
        summary:
          "Create a myTask account with email/password or Google. This account owns your Free or Pro plan.",
        details: [
          "Use a work email you check regularly — billing and invitations go here.",
          "After login you land on Home (personal workspace), not inside an organisation yet.",
          "Forgot password and Help / Terms / Privacy are available from the login screen.",
        ],
        platform: "both",
      },
      {
        id: "profile-plan",
        title: "Review profile and plan",
        summary:
          "Open Profile / Subscription to confirm your details and whether you are on Free or Pro.",
        details: [
          "Subscriptions are personal — teammates do not inherit your Pro plan.",
          "Upgrade from Pricing when you need higher limits or Pro-only features.",
        ],
        platform: "both",
      },
    ],
  },
  {
    id: "organisation",
    title: "2. Set up your organisation",
    subtitle: "Create the workspace where employees, jobs, and timesheets live.",
    steps: [
      {
        id: "create-org",
        title: "Create an organisation",
        summary:
          "From Home, create an organisation and complete the basics (name, details).",
        details: [
          "Plan limits control how many organisations you can own (Free: 1, Pro: 5).",
          "Switch organisations anytime from the header / switcher, or go Back to myTask.",
        ],
        platform: "both",
      },
      {
        id: "calendars",
        title: "Holiday and payroll calendars",
        summary:
          "In Settings, configure holiday calendars and payroll calendars before inviting staff or generating timesheets.",
        details: [
          "Holiday calendars mark public holidays on timesheet days.",
          "Payroll calendars define pay periods used when generating timesheets.",
          "Finish these early — later steps assume calendars exist.",
        ],
        platform: "both",
      },
      {
        id: "invite",
        title: "Invite your team",
        summary:
          "Invite employees by email. They accept via link (email / in-app) and join with a role.",
        details: [
          "Owners and managers control who can approve, edit, or only submit their own sheets.",
          "Invitees keep their own Free/Pro plan; they use your organisation workspace quotas.",
        ],
        platform: "both",
      },
    ],
  },
  {
    id: "work-sites",
    title: "3. Customers, jobs, and sites",
    subtitle: "Define where work happens so timesheets and GPS tracking can attach to jobs.",
    steps: [
      {
        id: "customers-jobs",
        title: "Add customers and jobs",
        summary:
          "Create customers, then jobs under them. Assign jobs to employees’ timesheet periods.",
        details: [
          "Jobs can include an address and geofence radius for on-site verification.",
          "Tracking uses assigned jobs to decide Travel vs Working near a site.",
        ],
        platform: "both",
      },
    ],
  },
  {
    id: "timesheets",
    title: "4. Timesheets on web",
    subtitle: "Generate periods, fill days, submit, and approve.",
    steps: [
      {
        id: "generate",
        title: "Generate or open timesheets",
        summary:
          "Under My Sheets (employees) or Timesheets management (managers), work in the current payroll period.",
        details: [
          "Each day can hold Working, Travel, and Break blocks with start/end times.",
          "Submit for approval when the period is complete; owners/managers review under Timesheets.",
        ],
        platform: "web",
      },
      {
        id: "day-views",
        title: "Day editor: sheets, timeline, map",
        summary:
          "Open a day to edit sheets, view the tracked timeline, and inspect the GPS map path.",
        details: [
          "While someone is tracking live, day hours and timelines update even if they stay still.",
          "The map updates when new location points arrive from the mobile app.",
          "A Live indicator appears when an active tracking session is in progress.",
        ],
        platform: "web",
      },
    ],
  },
  {
    id: "mobile-tracking",
    title: "5. Mobile time & location tracking",
    subtitle: "Record work time in the field with background GPS — the core of live verification.",
    steps: [
      {
        id: "permissions",
        title: "Allow required permissions",
        summary:
          "Before Start, grant Location (When In Use + Always / background), Motion where prompted, and Notifications on Android.",
        details: [
          "Always / background location is required so tracking continues when the app is not open.",
          "Android shows an ongoing notification while a location foreground service is running.",
          "You can revoke permissions in device Settings; tracking will stop working correctly until restored.",
        ],
        platform: "mobile",
      },
      {
        id: "start-session",
        title: "Start, pause, resume, stop",
        summary:
          "Open your organisation and tap the center Track button. Use Start / Pause / Resume / Stop on the Tracking screen.",
        details: [
          "You need a draft timesheet for today with at least one assigned job.",
          "Only one organisation can be tracked at a time.",
          "Pause can create a break (optional remarks). Stop ends the session and location uploads.",
          "Working, travel, and break time sync to your timesheet day automatically.",
        ],
        platform: "mobile",
      },
      {
        id: "live-home",
        title: "See that tracking is on",
        summary:
          "Organisation Home shows a Live banner while this device has an active session.",
        details: [
          "Managers on web or mobile can open the employee’s timesheet day to watch Live hours, timeline, and map.",
          "Sign out revokes the device tracking credential used for background uploads.",
        ],
        platform: "mobile",
      },
    ],
  },
  {
    id: "close-loop",
    title: "6. Approve, report, and pay",
    subtitle: "Close the loop from tracked time to payroll operations.",
    steps: [
      {
        id: "approve",
        title: "Review and approve",
        summary:
          "Managers approve or reject submitted timesheets. Moderators cannot approve their own sheets.",
        details: [
          "Check day totals, timeline, and map if location verification matters for that period.",
        ],
        platform: "both",
      },
      {
        id: "reports-payouts",
        title: "Reports and payouts",
        summary:
          "Generate employee reports from approved timesheets, then create payouts when ready.",
        details: [
          "Daily report limits follow the organisation owner’s plan.",
          "Payouts are organisation payroll — separate from your personal Pro subscription billing.",
        ],
        platform: "both",
      },
    ],
  },
];

export function howItWorksPlatformLabel(
  platform: HowItWorksPlatform,
): string {
  if (platform === "web") return "Web";
  if (platform === "mobile") return "Mobile";
  return "Web & mobile";
}
