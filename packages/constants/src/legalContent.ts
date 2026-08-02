/** Shared Help / Terms / Privacy copy — single source for web + mobile. */

export type FaqItem = { q: string; a: string };
export type FaqSection = { title: string; items: FaqItem[] };
export type LegalSection = { title: string; body: string };

export const FAQ_SECTIONS: FaqSection[] = [
  {
    title: "Getting Started",
    items: [
      {
        q: "How do I create an organisation?",
        a: "After signing in, open Create organisation from the organisation switcher or home screen. Your plan limits how many organisations you can own (Free: 1, Pro: 5). Complete holiday and payroll calendar setup before inviting employees or creating timesheets.",
      },
      {
        q: "How do I switch organisations?",
        a: "Use the organisation dropdown in the top header. Select another organisation, or choose Back to myTask to return to your personal workspace (subscription and billing live there).",
      },
    ],
  },
  {
    title: "Plans, Subscriptions & Billing",
    items: [
      {
        q: "What plans does myTask offer?",
        a: "Free ($0) and Pro. Pro is available monthly ($9.99 USD) or yearly ($99.99 USD). Free includes basic limits; Pro raises organisation, employee, customer, job, timesheet, and report limits, and unlocks email notifications and System Logs.",
      },
      {
        q: "Who owns the subscription?",
        a: "Subscriptions are personal to your user account — not shared with invited teammates. Workspace limits (employees, customers, jobs, timesheets, reports) follow the organisation owner's plan. Your own Pro unlocks System Logs for you.",
      },
      {
        q: "How do I upgrade to Pro?",
        a: "Open Pricing (from Login, Home, Profile, or Subscription), choose Monthly or Yearly, and complete Stripe Checkout. After payment you are redirected to a success page; your plan syncs automatically. You can also tap Sync from Stripe on the Subscription page.",
      },
      {
        q: "Where do I manage billing or download invoices?",
        a: "Go to Subscription for plan details, renewal/cancel dates, and Manage billing (Stripe Customer Portal). Billing history lists paid invoices with Download PDF and View invoice for your myTask-generated invoice. Receipt emails are sent to your account email when payments succeed.",
      },
      {
        q: "How do I cancel?",
        a: "On Subscription, choose Cancel subscription to end Pro at the current period end (you keep Pro until that date), or cancel immediately from Manage billing. After Pro ends you move to Free; your data is preserved under Free limits.",
      },
      {
        q: "What happens if payment fails or Pro expires?",
        a: "Pro features are disabled and you are moved to Free. You receive an in-app notification and email explaining the reason (for example payment failed or period ended). Update your payment method and resubscribe from Pricing to restore Pro.",
      },
      {
        q: "I hit a plan limit — what do I do?",
        a: "Free and Pro enforce caps (organisations, employees per org, customers, jobs per customer, timesheets per employee per month, reports per day). Upgrade to Pro for higher limits, or remove unused resources. The error message names which limit was reached.",
      },
    ],
  },
  {
    title: "Account",
    items: [
      {
        q: "How do I reset my password?",
        a: "Use Forgot password on the login screen. Follow the email link to set a new password.",
      },
      {
        q: "How do I update my profile?",
        a: "Open Profile from the header or sidebar and update your details. Changes sync for the signed-in account. Subscription and billing are linked to this same account email.",
      },
    ],
  },
  {
    title: "Organization",
    items: [
      {
        q: "Who can change organisation settings?",
        a: "Organisation owners (and roles with settings permissions) can edit organisation details, holiday calendars, and payroll calendars from Settings.",
      },
      {
        q: "How do invitations work?",
        a: "Owners and managers invite employees by email. Invitees receive an email and in-app notification with a link to accept. Invitees do not inherit the owner's Pro subscription; they keep their own Free or Pro plan.",
      },
    ],
  },
  {
    title: "Tasks",
    items: [
      {
        q: "What are jobs and customers?",
        a: "Customers and jobs define where work happens. Job sites can include an address and geofence radius so mobile time tracking can confirm you are at the assigned location. Timesheet day entries can be linked to jobs selected for that timesheet period. Counts count toward the organisation owner's plan limits.",
      },
    ],
  },
  {
    title: "Timesheets",
    items: [
      {
        q: "How do I submit a timesheet?",
        a: "Open My Sheets, complete day entries, then submit for approval. Managers review items under Timesheets (management). Monthly timesheet generation counts toward the owner's plan quota. Days may include automatically recorded working, travel, and break periods from mobile time tracking when your organisation uses that feature.",
      },
      {
        q: "Can I approve my own timesheet?",
        a: "Moderators and managers cannot approve or reject their own timesheets. Owners retain full approval rights per organisation ACL.",
      },
    ],
  },
  {
    title: "Time & location tracking",
    items: [
      {
        q: "What is time and location tracking?",
        a: "On the myTask mobile app, Tracking lets you Start, Pause, Resume, and Stop a work session. myTask records working time, travel time, and breaks for your draft timesheet, and uses your device location to help verify that you are at (or traveling to) an assigned job site. Managers can see live maps, timelines, and day totals while a session is active.",
      },
      {
        q: "How do I start tracking?",
        a: "Open your organisation on mobile and tap the center Track button on the bottom navigation. On the Tracking screen, tap Start. You need a draft timesheet for today with at least one assigned job, and you must grant the location permissions described below. You can only track in one organisation at a time.",
      },
      {
        q: "What device permissions does tracking need?",
        a: "iOS: Location When In Use and Always (background) location, plus Motion & Fitness when prompted, so tracking can continue while the app is in the background or the screen is locked. Android: precise location, background location (Allow all the time), a location foreground-service notification while tracking runs, and notification permission on newer Android versions. Without Always / background location, tracking may stop when you leave the app.",
      },
      {
        q: "What location and activity data is collected?",
        a: "While a session is running, myTask may collect GPS coordinates (latitude/longitude), timestamps, accuracy-related location metadata, motion/activity hints (for example traveling vs stationary), organisation and user identifiers for the session, and start/pause/resume/stop events (including optional pause remarks). The server uses this to classify Travel, Working, or Break against job geofences and to build your day timeline, map path, and hour totals. Location is not collected for tracking when you have Stopped (or never Started).",
      },
      {
        q: "Does tracking run in the background?",
        a: "Yes, when you have granted background / Always location permission and started a session. The mobile app may keep a lightweight location service and (on Android) a persistent notification while tracking is active, including after the app is swiped away, until you Stop or Pause according to product rules. A durable tracking credential on the device lets location updates reach myTask even if your normal login token has expired.",
      },
      {
        q: "Who can see my live location and times?",
        a: "People in your organisation who have permission to view the relevant timesheet or timesheet-management screens can see maps, timelines, and day hours while you are tracking, and historical paths for that day after you stop. Location and time-tracking data is organisation-scoped for workforce operations — it is not sold and is not shown to other organisations.",
      },
      {
        q: "How do I stop location collection?",
        a: "Tap Stop on the Tracking screen to end the session. You can also revoke Location (and Motion) access in your device Settings; tracking will not work correctly until permissions are restored. Signing out revokes the device tracking credential used for background location uploads.",
      },
      {
        q: "Why does the Live indicator appear?",
        a: "A Live cue on organisation home (mobile) and on web/mobile timesheet views means an active tracking session is in progress for that organisation. Day hours for open working, travel, or break segments keep updating even if you stay in one place; the map updates when new GPS points arrive.",
      },
    ],
  },
  {
    title: "Payroll",
    items: [
      {
        q: "Where are payroll calendars managed?",
        a: "Settings → Payroll Calendar. Organisations can have multiple calendars; existing calendars are view-only after creation.",
      },
      {
        q: "How do payouts work?",
        a: "Approved timesheets become eligible for payout. Create a payout from the Payouts page, then mark it paid when complete. Payouts are organisation payroll operations — separate from your personal myTask Pro subscription billing.",
      },
    ],
  },
  {
    title: "Reports",
    items: [
      {
        q: "How do I generate a report?",
        a: "Open Reports, select one employee and an approved timesheet, then generate. Download PDF or email the report when ready. Daily report generation is limited by the organisation owner's plan (Free: 3/day, Pro: 20/day).",
      },
    ],
  },
  {
    title: "Notifications",
    items: [
      {
        q: "Why am I not receiving browser push notifications?",
        a: "Allow notifications when prompted, keep the service worker registered, and ensure you are signed in. Foreground alerts also appear as in-app toasts.",
      },
      {
        q: "Where do notification links go?",
        a: "Each notification includes a destination (timesheet, report, invitation, subscription, etc.). Clicking the bell item or push toast navigates to that screen.",
      },
      {
        q: "Do I get emails about billing?",
        a: "Yes. Payment receipts, expiry reminders (7 / 3 / 1 days before a scheduled cancel), payment failures, and subscription ended notices are emailed to your account address. Product feature emails may require Pro.",
      },
    ],
  },
  {
    title: "Permissions",
    items: [
      {
        q: "Why is a menu item missing?",
        a: "Navigation and actions are gated by your organisation role ACL. System Logs also require Pro on your personal subscription. Contact an owner if you need additional organisation permissions, or upgrade for Pro-only features.",
      },
      {
        q: "What device permissions does the mobile app request?",
        a: "Depending on features you use: Location (When In Use and Always / background) and Motion for time tracking; Notifications for alerts and the Android tracking foreground service; network access for sync. You can change these anytime in the device Settings app. Denying background location limits or stops Tracking while the app is not open.",
      },
    ],
  },
  {
    title: "Troubleshooting",
    items: [
      {
        q: "Data looks stale after switching organisations",
        a: "Use Back to myTask, then re-open the organisation. Logout fully clears caches if a session becomes stuck.",
      },
      {
        q: "Realtime updates are not appearing",
        a: "Confirm network connectivity and that you remain signed in. The app reconnects Socket.IO automatically after brief outages. For live tracking maps and day hours, ensure the employee has an active Tracking session and that you are viewing the correct organisation timesheet day.",
      },
      {
        q: "Tracking will not start or stops in the background",
        a: "Confirm you have a draft timesheet for today with an assigned job, grant Always / background location (and Motion on iOS), keep location services on for the device, and do not force-stop the app if you need background updates. On Android, allow the location notification and battery unrestricted / not optimised for myTask if your OEM kills background apps. Sign out and back in if the tracking credential needs refreshing, then try Start again.",
      },
      {
        q: "I paid but still see Free",
        a: "Open Subscription and tap Sync from Stripe, or revisit the billing success page so checkout can confirm. If the issue continues, check Billing history for your invoice and contact support with your account email and invoice number.",
      },
    ],
  },
  {
    title: "Contact Support",
    items: [
      {
        q: "How do I get help?",
        a: "Contact your organisation owner first for workspace questions. For billing or product issues, email support with your account email, organisation code (if relevant), invoice number, and a short description of the problem.",
      },
    ],
  },
];

export const TERMS_SECTIONS: LegalSection[] = [
  {
    title: "1. Acceptance of Terms",
    body: "By accessing or using myTask, you agree to these Terms & Conditions, including the subscription and payment terms below. If you do not agree, do not use the service.",
  },
  {
    title: "2. Accounts",
    body: "You are responsible for maintaining the confidentiality of your credentials and for all activity under your account. Notify your organisation owner promptly of any unauthorised access. Billing notices and invoices are sent to the email on your account.",
  },
  {
    title: "3. Organisations and data",
    body: "Organisation owners control membership, roles, and operational data (employees, timesheets, reports, payouts, and time/location tracking records). You agree to use organisation data only for legitimate work purposes authorised by that organisation. Invited members do not inherit the owner's paid subscription.",
  },
  {
    title: "4. Time tracking and location",
    body: "myTask’s mobile app may offer optional time and location tracking so organisations can record working, travel, and break time and verify presence near assigned job sites. By starting a tracking session you consent to collection of location and related activity data while the session is active (including in the background when you grant the required device permissions). You must only track your own work activity, grant accurate permissions, and stop tracking when you are not working for that organisation. Organisation administrators may view live and historical tracking data for authorised workforce management. Misuse (for example tracking another person without authority, falsifying location, or bypassing geofence controls) is prohibited and may result in suspension.",
  },
  {
    title: "5. Device permissions",
    body: "Time tracking may require device Location (including background / Always access), Motion sensors, and Notifications (including an Android foreground-service notification while tracking). You control these permissions in your device settings. If you decline or revoke them, tracking features may be unavailable or incomplete; other myTask features that do not need those permissions remain available subject to your plan and role.",
  },
  {
    title: "6. Plans and subscriptions",
    body: "myTask offers a Free plan and a paid Pro plan (monthly or yearly). Subscriptions are owned by the authenticated user account, not by an organisation. Feature and usage limits (including organisations you may own, employees, customers, jobs, timesheets, reports, email notifications, and System Logs) are enforced according to the applicable plan. Workspace quotas for an organisation follow the organisation owner's plan.",
  },
  {
    title: "7. Payments, renewals, and invoices",
    body: "Paid subscriptions are processed by Stripe. By upgrading you authorise recurring charges for the selected billing interval until cancelled. Prices are shown at checkout in the stated currency. Successful payments generate invoices available in Billing history and may be emailed as receipts. Taxes may apply where required.",
  },
  {
    title: "8. Cancellation, expiry, and payment failure",
    body: "You may cancel at period end or immediately via Subscription / Stripe Customer Portal. When a subscription ends, expires, or a renewal payment fails, Pro features are disabled and the account reverts to Free limits. Your operational data is preserved subject to Free plan limits. We may notify you in-app and by email of upcoming expiry, payment failure, or plan changes.",
  },
  {
    title: "9. Acceptable use",
    body: "You must not misuse the service, attempt to bypass plan limits or access controls, interfere with other users, abuse location or time-tracking features, or upload unlawful content. We may suspend access for policy violations or unpaid balances on paid features.",
  },
  {
    title: "10. Availability",
    body: "We aim for reliable availability but do not guarantee uninterrupted service. Background location depends on device OS behaviour, battery settings, and permissions you grant. Features and plan limits may evolve; material changes will be communicated through the product where practical.",
  },
  {
    title: "11. Liability",
    body: "To the maximum extent permitted by law, myTask is provided as-is. Organisation owners remain responsible for payroll decisions, approvals, workforce monitoring practices, and statutory compliance (including any employment or privacy obligations when using location tracking). Billing disputes related to card charges should first be addressed via Subscription / Stripe billing portal, then support.",
  },
  {
    title: "12. Changes",
    body: "These terms may be updated. Continued use after updates constitutes acceptance of the revised terms. Pricing or plan changes for new purchases will be reflected at checkout; existing subscriptions follow Stripe and product notices.",
  },
  {
    title: "13. Contact",
    body: "Questions about these terms, billing, tracking, or your subscription should be directed to product support (include your account email and invoice number when relevant), or to your organisation owner for workspace matters.",
  },
];

export const PRIVACY_SECTIONS: LegalSection[] = [
  {
    title: "Information we process",
    body: "Account profile details (name, email, phone, date of birth where provided), organisation membership and roles, timesheet and payroll-related activity (including working, travel, and break periods), time-tracking session events (start, pause, resume, stop, optional remarks), location points and related metadata while tracking is active, motion/activity signals used to support travel vs stationary detection, maps and timelines derived from that data, notifications, device tokens for push delivery, a durable mobile tracking credential used only for authorised location uploads, subscription status, plan usage counters, and billing records (invoice numbers, amounts, payment status, Stripe customer/subscription identifiers).",
  },
  {
    title: "How we use information",
    body: "We use data to authenticate users, operate timesheets and organisation workflows, record and display work time, verify presence near job sites configured by your organisation, show live and historical maps/timelines to authorised org members, enforce plan limits, send transactional and product notifications (including billing emails), process subscriptions via Stripe, improve reliability and security, and support customer requests.",
  },
  {
    title: "Payments and Stripe",
    body: "Card payments are processed by Stripe. We do not store full card numbers on myTask servers. Stripe may process payment method details, billing address, and transaction metadata under its own privacy policy. We store references needed to sync your plan, show billing history, send receipts, and support cancellations or disputes.",
  },
  {
    title: "Location and background tracking",
    body: "When you Start time tracking in the myTask mobile app and grant the required permissions, we collect location data (typically latitude, longitude, timestamp, and accuracy-related fields) while your session is running — including when the app is in the background or the device is locked, if you allowed Always / background location. We may also use motion or activity signals to help distinguish travel from stationary work. Location updates are sent to myTask servers with an organisation-scoped tracking credential so timesheet activity can continue if your normal login session token has expired. We use this data to classify Travel, Working, and Break against job geofences, maintain day tasks and hour totals, and power maps and live updates for authorised viewers in your organisation. We do not collect tracking locations when you have Stopped tracking (or never started). Web browsers do not run this background GPS tracking; web users may still view organisation timesheet maps and live status fed by mobile sessions.",
  },
  {
    title: "Permissions we request",
    body: "Mobile: Location (When In Use and Always / background), Motion & Fitness (iOS) or equivalent activity recognition where applicable, Notifications (including Android’s ongoing location foreground-service notification while tracking), and network access. You can withdraw these permissions in your device settings at any time; doing so may stop or degrade tracking until restored. Signing out revokes the device tracking credential used for background uploads.",
  },
  {
    title: "Sharing",
    body: "Organisation admins and other roles with timesheet or timesheet-management access can view workforce time and location data within their organisation. We do not sell personal information. Service providers (such as Stripe for payments, email, hosting, and the mobile background-location SDK vendor operating on-device) process data only as needed to run myTask.",
  },
  {
    title: "Retention",
    body: "We retain account and organisation data — including timesheet periods, day tasks, and associated tracking/location history — while your account and organisation records remain active and as required for legal, security, payroll, and billing records. You may request deletion subject to organisation ownership and compliance obligations.",
  },
  {
    title: "Your choices",
    body: "Update profile details in the app; Start or Stop tracking at any time; manage Location, Motion, and Notification permissions on your device; and manage billing via Subscription / Stripe Customer Portal. Organisation owners control membership, job sites/geofences, and operational data retention within their workspace. Review our Help & FAQ for practical steps on permissions and troubleshooting tracking.",
  },
  {
    title: "Contact",
    body: "Privacy questions — including location or tracking data — can be sent to product support with your account email. For payment-processor requests that only Stripe can fulfil, we will point you to Stripe’s customer tools where appropriate.",
  },
];

/** Production web / universal-link host for deep linking. */
export const APP_WEB_HOST = "mytaskapp.iampapaisarkar.dev";
export const APP_WEB_ORIGIN = `https://${APP_WEB_HOST}`;
