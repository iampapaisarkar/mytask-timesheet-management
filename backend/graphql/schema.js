import { buildSchema } from "graphql";
import GraphQLJSON from "graphql-type-json";

export const schema = buildSchema(`
  # -----------------------------------------
  # Basic Types
  # -----------------------------------------
  type Status {
    id: Int
    name: String
    code: String
  }

  type Job {
    id: Int
    organisation_id: Int
    name: String
    customer_id: Int
    address: String
    latitude: String
    longitude: String
    radius: Int
    site_contact_name: String
    site_contact_email: String
    site_contact_phone_number: String
    created_at: Date
    created_by: Int
    updated_at: Date
    updated_by: Int
  }

  # -----------------------------------------
  # Geofence
  # -----------------------------------------
  type Geofence {
    id: Int
    organisation_id: Int
    user_id: Int
    timesheet_activity_log_id: Int
    job_id: Int
    action: String
    track_at: String
    job: Job
  }

  # -----------------------------------------
  # Timeline / Activity Log Types
  # -----------------------------------------
  type TimelineLogType {
    id: Int
    name: String
    code: String
  }

  type TimelineLog {
    organisation_id: Int
    employee_id: Int
    timesheet_id: Int
    timesheet_day_id: Int
    timesheet_day_task_id: Int
    type_id: Int
    type: TimelineLogType
    start_at: Date
    end_at: Date
    timesheet_activity_log_start_id: Int
    latitude: String
    longitude: String
    timesheet_activity_log_end_id: Int
    job: Job
  }

  type TrackingLog {
    id: Int
    organisation_id: Int
    user_id: Int
    timesheet_day_id: Int
    latitude: String
    longitude: String
    start_at: Date
    end_at: Date
    type_id: Int
    track_at: Date
    type: TimelineLogType
    geofence: Geofence
  }

  type TrackingLogs {
    travels: [[TrackingLog]]
    workings: [[TrackingLog]]
    breaks: [[TrackingLog]]
  }

  # -----------------------------------------
  # Task Types
  # -----------------------------------------
  type OriginalLog {
    job_id: Int
    start_time: String
    end_time: String
    total_hours: String
    is_travel: Boolean
    is_break: Boolean
  }

  type TaskTimeline {
    start_at: Date
    end_at: Date
    track_at: Date
    type_id: Int
    type: TimelineLogType
    id: Int
    organisation_id: Int
    employee_id: Int
    timesheet_id: Int
    timesheet_day_id: Int
    timesheet_day_task_id: Int
    timesheet_activity_log_start_id: Int
    timesheet_activity_log_end_id: Int
    job: Job
  }

  type Task {
    total_logged_hours: String
    id: Int
    organisation_id: Int
    employee_id: Int
    timesheet_id: Int
    timesheet_day_id: Int
    job_id: Int
    start_time: String
    end_time: String
    total_hours: String
    is_break: Boolean
    is_travel: Boolean
    source: String
    remarks: String
    approval_reason: String
    reject_reason: String
    status_id: Int
    created_at: Date
    created_by: Int
    updated_at: Date
    updated_by: Int
    job: Job
    original_log: OriginalLog
    task_timeline: TaskTimeline
  }

  # -----------------------------------------
  # Main Timesheet Day
  # -----------------------------------------
  scalar JSON
  scalar Date
  type TimesheetDay {
    day_name: String
    total_working_hours: String
    total_travel_hours: String
    total_break_hours: String
    id: Int
    organisation_id: Int
    employee_id: Int
    timesheet_id: Int
    date: String
    day_of_week: Int
    is_public_holiday: Boolean
    holiday_calendar_id: Int
    is_weekend: Boolean
    total_hours: String
    approval_reason: String
    reject_reason: String
    status_id: Int
    created_at: Date
    created_by: Int
    updated_at: Date
    updated_by: Int

    holiday: String
    status: Status
    tasks: [Task]
    timeline_logs: [TimelineLog]
    tracking_logs: TrackingLogs

    permissions: JSON
  }

  # -----------------------------------------
  # Query
  # -----------------------------------------
  type Query {
    timesheetDay(employeeId: Int!, id: Int!): TimesheetDay
  }
`);
