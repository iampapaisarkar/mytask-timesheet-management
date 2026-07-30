import { db } from "../database.js";
import Users from "./users.js";
import UserSessions from "./userSessions.js";
import SystemRoles from "./systemRoles.js";
import UserSystemRoles from "./userSystemRoles.js";
import FirebaseProviders from "./firebaseProviders.js";
import Organisations from "./organisations.js";
import OrganisationRoles from "./organisationRoles.js";
import UserOrganisationRoles from "./userOrganisationRoles.js";
import Employees from "./employees.js";
import EmployeeInvitations from "./employeeInvitations.js";
import InvitationStatus from "./invitationStatus.js";
import Customers from "./customers.js";
import Jobs from "./jobs.js";
import JobAddress from "./jobAddress.js";
import HolidayCalendars from "./holidayCalendars.js";
import LeaveCategories from "./leaveCategories.js";
import TimesheetSubmissionFrequencies from "./timesheetSubmissionFrequencies.js";
import OrganisationSettings from "./organisationSettings.js";
import PayCycles from "./payCycles.js";
import PayrollCalendars from "./payrollCalendars.js";
import RoundingIntervals from "./roundingIntervals.js";
import EmployeeWages from "./employeeWages.js";
import EmployeePayrolls from "./employeePayrolls.js";
import EmploymentStatus from "./employmentStatus.js";
import EmploymentTypes from "./employmentTypes.js";
import EmployeeAddress from "./employeeAddress.js";
import Timesheets from "./timesheets.js";
import TimesheetStatus from "./timesheetStatus.js";
import TimesheetDays from "./timesheetDays.js";
import TimesheetDayTasks from "./timesheetDayTasks.js";
import TimesheetTaskActivityPairs from "./timesheetTaskActivityPairs.js";
import FcmConnections from "./fcmConnections.js";
import Notifications from "./notifications.js";
import NotificationStatus from "./notificationStatus.js";
import TimesheetActivityLogs from "./timesheetActivityLogs.js";
import TimesheetActivityTypes from "./timesheetActivityTypes.js";
import GeofenceEvents from "./geofenceEvents.js";
import UserTimezones from "./userTimezones.js";
import States from "./states.js";
import EmailSendLogs from "./emailSendLogs.js";
import ExternalApiCallLogs from "./externalApiCallLogs.js";
import OrganisationAddress from "./organisationAddress.js";
import Payouts from "./payouts.js";

const models = {
  Users,
  UserSessions,
  SystemRoles,
  UserSystemRoles,
  FirebaseProviders,
  Organisations,
  OrganisationRoles,
  UserOrganisationRoles,
  Employees,
  EmployeeInvitations,
  InvitationStatus,
  Customers,
  Jobs,
  JobAddress,
  HolidayCalendars,
  LeaveCategories,
  TimesheetSubmissionFrequencies,
  OrganisationSettings,
  PayCycles,
  PayrollCalendars,
  RoundingIntervals,
  EmployeeWages,
  EmployeePayrolls,
  EmploymentStatus,
  EmploymentTypes,
  EmployeeAddress,
  Timesheets,
  TimesheetStatus,
  TimesheetDays,
  TimesheetDayTasks,
  TimesheetTaskActivityPairs,
  FcmConnections,
  Notifications,
  NotificationStatus,
  TimesheetActivityLogs,
  TimesheetActivityTypes,
  GeofenceEvents,
  UserTimezones,
  States,
  EmailSendLogs,
  ExternalApiCallLogs,
  OrganisationAddress,
  Payouts,
};

Object.values(models).forEach((model) => {
  if (typeof model.associate === "function") {
    model.associate(models);
  }
});

export default models;
