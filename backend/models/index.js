import { mysheet } from "../database.js";
import Users from "./users.js";
import UserSessions from "./userSessions.js";
import SystemRoles from "./systemRoles.js";
import UserSystemRoles from "./userSystemRoles.js";
import FirebaseProviders from "./firebaseProviders.js";
import Organisations from "./organisations.js";
import OrganisationRoles from "./organisationRoles.js";
import UserOrganisationRoles from "./userOrganisationRoles.js";
import Regions from "./regions.js";
import Employees from "./employees.js";
import NokRelations from "./nokRelations.js";
import EmployeeInvitations from "./employeeInvitations.js";
import InvitationStatus from "./invitationStatus.js";
import Customers from "./customers.js";
import Jobs from "./jobs.js";
import JobAddress from "./jobAddress.js";
import HolidayCalendars from "./holidayCalendars.js";
import EarningRates from "./earningRates.js";
import EarningRateTypes from "./earningRateTypes.js";
import LeaveCategories from "./leaveCategories.js";
import TimesheetSubmissionFrequencies from "./timesheetSubmissionFrequencies.js";
import OrganisationSettings from "./organisationSettings.js";
import PayCycles from "./payCycles.js";
import PayrollCalendars from "./payrollCalendars.js";
import AwardRateRuleFields from "./awardRateRuleFields.js";
import AwardRateRuleComparators from "./awardRateRuleComparators.js";
import AwardRateRuleDays from "./awardRateRuleDays.js";
import RoundingIntervals from "./roundingIntervals.js";
import AwardRateRuleFieldTypes from "./awardRateRuleFieldTypes.js";
import AwardRates from "./awardRates.js";
import AwardRateSettings from "./awardRateSettings.js";
import AwardRateRules from "./awardRateRules.js";
import AwardRateRuleDayRelations from "./awardRateRuleDayRelations.js";
import AwardRateRuleIfs from "./awardRateRuleIfs.js";
import AwardRateRuleThen from "./awardRateRuleThen.js";
import ManagementGroups from "./managementGroups.js";
import ManagementGroupEmployees from "./managementGroupEmployees.js";
import EmployeeWages from "./employeeWages.js";
import EmployeePayrolls from "./employeePayrolls.js";
import EmploymentStatus from "./employmentStatus.js";
import EmploymentTypes from "./employmentTypes.js";
import EmployeeAddress from "./employeeAddress.js";
import ManagementGroupJobs from "./managementGroupJobs.js";
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
import XeroConnections from "./xeroConnections.js";
import States from "./states.js";
import EmailSendLogs from "./emailSendLogs.js";
import ExternalApiCallLogs from "./externalApiCallLogs.js";
import OrganisationAddress from "./organisationAddress.js";

const models = {
  Users,
  UserSessions,
  SystemRoles,
  UserSystemRoles,
  FirebaseProviders,
  Organisations,
  OrganisationRoles,
  UserOrganisationRoles,
  Regions,
  Employees,
  NokRelations,
  EmployeeInvitations,
  InvitationStatus,
  Customers,
  Jobs,
  JobAddress,
  HolidayCalendars,
  EarningRates,
  EarningRateTypes,
  LeaveCategories,
  TimesheetSubmissionFrequencies,
  OrganisationSettings,
  PayCycles,
  PayrollCalendars,
  AwardRateRuleFields,
  AwardRateRuleComparators,
  AwardRateRuleDays,
  RoundingIntervals,
  AwardRateRuleFieldTypes,
  AwardRates,
  AwardRateSettings,
  AwardRateRules,
  AwardRateRuleDayRelations,
  AwardRateRuleIfs,
  AwardRateRuleThen,
  ManagementGroups,
  ManagementGroupEmployees,
  EmployeeWages,
  EmployeePayrolls,
  EmploymentStatus,
  EmploymentTypes,
  EmployeeAddress,
  ManagementGroupJobs,
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
  XeroConnections,
  States,
  EmailSendLogs,
  ExternalApiCallLogs,
  OrganisationAddress,
};

// -----------------------------
//   Run associations
// -----------------------------
Object.values(models).forEach((model) => {
  if (typeof model.associate === "function") {
    model.associate(models);
  }
});

export default models;
