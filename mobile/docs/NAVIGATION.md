# Mobile Navigation

## Root (no bottom tabs)

Authenticated root is a **native stack**:

| Screen | Notes |
|--------|--------|
| `Home` | Organisation picker — profile icon in header only |
| `Profile` | Account / subscription / legal |
| `Organisation` | Org shell (`OrgStack`) |
| `NotificationsList` | Modal from org header |
| Billing / Legal / Create org | Personal workspace flows |

## Organisation shell (`OrgStack`)

`Organisation` mounts an **org-level native stack**:

| Screen | Chrome |
|--------|--------|
| `OrgTabs` | **OrgHeader** + premium bottom tabs |
| `TimesheetDayDetail` | Standalone `← Back · TS-…` header (no tabs) |
| `EmployeesList`, `CustomersList`, `JobsList`, … | Standalone `← Back · Title` (no tabs) |
| Settings / calendars / payout detail | Same standalone pattern |

### Tabs (only under `OrgTabs`)

| Tab | Stack |
|-----|--------|
| Home | Dashboard |
| Sheets | List only → period detail on OrgStack |
| Manage | TM list only → period detail on OrgStack |
| More | Hub only — destinations push onto `OrgStack` |

Tab roots have **no back button** and **swipe-back disabled**.  
Standalone org-stack screens (`TimesheetDetail`, `TimesheetManagementDetail`, day editor, More destinations) use the native stack header (chevron-only back + title), enable iOS/Android swipe-back, and hide OrgHeader + tab bar by architecture (siblings of `OrgTabs`).

## Deep links

HTTPS host `mytaskapp.iampapaisarkar.dev` + `mytask://` map through `navigation/linking.ts` into `Organisation → OrgTabs | standalone screens`.
