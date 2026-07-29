# Mobile Navigation

`RootNavigator` switches auth vs app stacks. After login: `MainTabs` (Organisations + Profile). Org stack under the same native stack:

| Screen | Params | Notes |
|--------|--------|-------|
| `OrgHome` | `orgCode` | Dashboard + nav to org areas; ClockInOut slot (Phase 5) |
| `Timesheets` | `orgCode` | My timesheets list → `TimesheetDetail` |
| `TimesheetDetail` | `orgCode`, `id` | Days + submit if `can_submit` → `TimesheetDayDetail` |
| `TimesheetDayDetail` | `orgCode`, `timesheetId`, `dayId` | Tasks + `TrackingMap` |
| `TimesheetManagementList` | `orgCode` | Via `useTimesheetManagement` |
| `EmployeesList` | `orgCode` | Via `useEmployees` |
| `SettingsHub` | `orgCode` | Placeholder cards for settings areas |

Org context via Zustand. Expand to drawers matching OrgLayout later.
