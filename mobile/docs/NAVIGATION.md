# Mobile Navigation

## Root (no bottom tabs)

Authenticated root is a **native stack**:

| Screen | Notes |
|--------|--------|
| `Home` | Organisation picker — profile icon in header only |
| `Profile` | Account / subscription / legal |
| `Organisation` | Org shell (custom header + bottom tabs) |
| `NotificationsList` | Modal from org header |
| Billing / Legal / Create org | Personal workspace flows |

## Organisation shell

`Organisation` mounts `OrgNavigator`:

- **OrgHeader** — logo (leave), org code + name, notifications, theme toggle
- **Bottom tabs** (premium floating bar) — only inside an organisation

| Tab | Stack |
|-----|--------|
| Home | Dashboard |
| Sheets | My timesheets + detail + day editor |
| Manage | Timesheet management (ACL gated) |
| More | Employees, customers, jobs, reports, payouts, settings, logs |

Tab roots have **no back button** and **swipe-back disabled**. Detail screens show a back control and allow the gesture.

## Deep links

HTTPS host `mytaskapp.iampapaisarkar.dev` + `mytask://` map through `navigation/linking.ts` into the nested org tab stacks.
