/**
 * Hot-path + FK-style indexes across core tables.
 * Idempotent: skips missing tables and existing index names.
 */

async function tableExists(queryInterface, table) {
  try {
    await queryInterface.describeTable(table);
    return true;
  } catch {
    return false;
  }
}

async function indexExists(queryInterface, table, name) {
  try {
    const indexes = await queryInterface.showIndex(table);
    return indexes.some((idx) => idx.name === name);
  } catch {
    return false;
  }
}

async function ensureIndex(queryInterface, table, columns, name, options = {}) {
  if (!(await tableExists(queryInterface, table))) return;
  if (await indexExists(queryInterface, table, name)) return;
  try {
    await queryInterface.addIndex(table, columns, { name, ...options });
  } catch (err) {
    console.warn(`[indexes] skip ${name} on ${table}:`, err.message);
  }
}

/** @type {Array<{ table: string, columns: string[], name: string, unique?: boolean }>} */
const INDEXES = [
  // —— Timesheets ——
  {
    table: "timesheets",
    columns: ["organisation_id", "status_id"],
    name: "timesheets_org_status_idx",
  },
  {
    table: "timesheets",
    columns: ["organisation_id", "status_id", "created_at"],
    name: "timesheets_org_status_created_idx",
  },
  {
    table: "timesheets",
    columns: ["employee_id"],
    name: "timesheets_employee_id_idx",
  },

  // —— Timesheet days ——
  {
    table: "timesheet_days",
    columns: ["timesheet_id"],
    name: "timesheet_days_timesheet_id_idx",
  },
  {
    table: "timesheet_days",
    columns: ["organisation_id", "employee_id", "date"],
    name: "timesheet_days_org_employee_date_idx",
  },
  {
    table: "timesheet_days",
    columns: ["organisation_id", "timesheet_id"],
    name: "timesheet_days_org_timesheet_idx",
  },
  {
    table: "timesheet_days",
    columns: ["employee_id"],
    name: "timesheet_days_employee_id_idx",
  },

  // —— Day tasks ——
  {
    table: "timesheet_day_tasks",
    columns: ["timesheet_day_id"],
    name: "timesheet_day_tasks_day_id_idx",
  },
  {
    table: "timesheet_day_tasks",
    columns: ["timesheet_id"],
    name: "timesheet_day_tasks_timesheet_id_idx",
  },
  {
    table: "timesheet_day_tasks",
    columns: ["organisation_id", "employee_id"],
    name: "timesheet_day_tasks_org_employee_idx",
  },
  {
    table: "timesheet_day_tasks",
    columns: ["job_id"],
    name: "timesheet_day_tasks_job_id_idx",
  },

  // —— Activity logs (tracking) ——
  {
    table: "timesheet_activity_logs",
    columns: ["user_id", "organisation_id", "track_at"],
    name: "timesheet_activity_logs_user_org_track_idx",
  },
  {
    table: "timesheet_activity_logs",
    columns: ["timesheet_day_id", "track_at"],
    name: "timesheet_activity_logs_day_track_idx",
  },
  {
    table: "timesheet_activity_logs",
    columns: ["organisation_id", "track_at"],
    name: "timesheet_activity_logs_org_track_idx",
  },
  {
    table: "timesheet_activity_logs",
    columns: ["type_id"],
    name: "timesheet_activity_logs_type_id_idx",
  },

  // —— Activity pairs ——
  {
    table: "timesheet_task_activity_pairs",
    columns: ["timesheet_day_task_id"],
    name: "timesheet_task_activity_pairs_task_id_idx",
  },
  {
    table: "timesheet_task_activity_pairs",
    columns: ["timesheet_id"],
    name: "timesheet_task_activity_pairs_timesheet_id_idx",
  },
  {
    table: "timesheet_task_activity_pairs",
    columns: ["timesheet_day_id"],
    name: "timesheet_task_activity_pairs_day_id_idx",
  },
  {
    table: "timesheet_task_activity_pairs",
    columns: ["organisation_id", "employee_id"],
    name: "timesheet_task_activity_pairs_org_employee_idx",
  },
  {
    table: "timesheet_task_activity_pairs",
    columns: ["timesheet_activity_log_start_id"],
    name: "timesheet_task_activity_pairs_start_log_idx",
  },
  {
    table: "timesheet_task_activity_pairs",
    columns: ["timesheet_activity_log_end_id"],
    name: "timesheet_task_activity_pairs_end_log_idx",
  },

  // —— Geofence ——
  {
    table: "geofence_events",
    columns: ["timesheet_activity_log_id"],
    name: "geofence_events_activity_log_idx",
  },
  {
    table: "geofence_events",
    columns: ["organisation_id", "track_at"],
    name: "geofence_events_org_track_idx",
  },
  {
    table: "geofence_events",
    columns: ["user_id"],
    name: "geofence_events_user_id_idx",
  },
  {
    table: "geofence_events",
    columns: ["job_id"],
    name: "geofence_events_job_id_idx",
  },

  // —— Auth / users ——
  {
    table: "users",
    columns: ["firebase_user_id"],
    name: "users_firebase_user_id_idx",
  },
  {
    table: "firebase_providers",
    columns: ["uid"],
    name: "firebase_providers_uid_idx",
  },
  {
    table: "firebase_providers",
    columns: ["user_id"],
    name: "firebase_providers_user_id_idx",
  },
  {
    table: "user_timezones",
    columns: ["user_id"],
    name: "user_timezones_user_id_idx",
  },
  {
    table: "user_system_roles",
    columns: ["user_id"],
    name: "user_system_roles_user_id_idx",
  },
  {
    table: "tracking_auth_tokens",
    columns: ["expires_at"],
    name: "tracking_auth_tokens_expires_at_idx",
  },
  {
    table: "tracking_auth_tokens",
    columns: ["revoked_at"],
    name: "tracking_auth_tokens_revoked_at_idx",
  },

  // —— Org membership ——
  {
    table: "employees",
    columns: ["organisation_id"],
    name: "employees_organisation_id_idx",
  },
  {
    table: "employees",
    columns: ["organisation_id", "created_at"],
    name: "employees_org_created_idx",
  },
  {
    table: "user_organisation_roles",
    columns: ["organisation_id"],
    name: "user_organisation_roles_organisation_id_idx",
  },
  {
    table: "user_organisation_roles",
    columns: ["role_id"],
    name: "user_organisation_roles_role_id_idx",
  },

  // —— Invitations ——
  {
    table: "employee_invitations",
    columns: ["employee_id"],
    name: "employee_invitations_employee_id_idx",
  },
  {
    table: "employee_invitations",
    columns: ["organisation_id", "email"],
    name: "employee_invitations_org_email_idx",
  },
  {
    table: "employee_invitations",
    columns: ["user_id", "status_id"],
    name: "employee_invitations_user_status_idx",
  },
  {
    table: "employee_invitations",
    columns: ["organisation_id", "status_id"],
    name: "employee_invitations_org_status_idx",
  },

  // —— Customers / jobs ——
  {
    table: "customers",
    columns: ["organisation_id"],
    name: "customers_organisation_id_idx",
  },
  {
    table: "customers",
    columns: ["organisation_id", "created_at"],
    name: "customers_org_created_idx",
  },
  {
    table: "jobs",
    columns: ["organisation_id"],
    name: "jobs_organisation_id_idx",
  },
  {
    table: "jobs",
    columns: ["organisation_id", "customer_id"],
    name: "jobs_org_customer_idx",
  },
  {
    table: "jobs",
    columns: ["customer_id"],
    name: "jobs_customer_id_idx",
  },
  {
    table: "job_address",
    columns: ["job_id"],
    name: "job_address_job_id_idx",
  },
  {
    table: "organisation_address",
    columns: ["organisation_id"],
    name: "organisation_address_organisation_id_idx",
  },

  // —— Employee sub-resources ——
  {
    table: "employee_wages",
    columns: ["employee_id"],
    name: "employee_wages_employee_id_idx",
  },
  {
    table: "employee_wages",
    columns: ["organisation_id", "employee_id"],
    name: "employee_wages_org_employee_idx",
  },
  {
    table: "employee_payrolls",
    columns: ["employee_id"],
    name: "employee_payrolls_employee_id_idx",
  },
  {
    table: "employee_payrolls",
    columns: ["organisation_id", "employee_id"],
    name: "employee_payrolls_org_employee_idx",
  },
  {
    table: "employee_address",
    columns: ["employee_id"],
    name: "employee_address_employee_id_idx",
  },
  {
    table: "employee_address",
    columns: ["organisation_id", "employee_id"],
    name: "employee_address_org_employee_idx",
  },

  // —— Calendars / settings ——
  {
    table: "payroll_calendars",
    columns: ["organisation_id"],
    name: "payroll_calendars_organisation_id_idx",
  },
  {
    table: "payroll_calendars",
    columns: ["pay_cycle_id"],
    name: "payroll_calendars_pay_cycle_id_idx",
  },
  {
    table: "holiday_calendars",
    columns: ["organisation_id", "date"],
    name: "holiday_calendars_org_date_idx",
  },
  {
    table: "organisation_settings",
    columns: ["organisation_id"],
    name: "organisation_settings_organisation_id_idx",
  },

  // —— Notifications / FCM ——
  {
    table: "notifications",
    columns: ["user_id", "created_at"],
    name: "notifications_user_created_idx",
  },
  {
    table: "notifications",
    columns: ["user_id", "status_id"],
    name: "notifications_user_status_idx",
  },
  {
    table: "fcm_connections",
    columns: ["user_id"],
    name: "fcm_connections_user_id_idx",
  },
  {
    table: "fcm_connections",
    columns: ["user_id", "token"],
    name: "fcm_connections_user_token_idx",
  },
  {
    table: "fcm_connections",
    columns: ["token"],
    name: "fcm_connections_token_idx",
  },

  // —— Payouts ——
  {
    table: "payouts",
    columns: ["timesheet_id"],
    name: "payouts_timesheet_id_idx",
  },
  {
    table: "payouts",
    columns: ["organisation_id", "timesheet_id"],
    name: "payouts_org_timesheet_idx",
  },
  {
    table: "payouts",
    columns: ["employee_id"],
    name: "payouts_employee_id_idx",
  },

  // —— Sessions / billing usage ——
  {
    table: "user_sessions",
    columns: ["user_id"],
    name: "user_sessions_user_id_idx",
  },
  {
    table: "user_sessions",
    columns: ["expire_at"],
    name: "user_sessions_expire_at_idx",
  },
  {
    table: "user_sessions",
    columns: ["user_id", "revoked_at"],
    name: "user_sessions_user_revoked_idx",
  },
  {
    table: "subscription_notifications",
    columns: ["user_id", "created_at"],
    name: "subscription_notifications_user_created_idx",
  },
  {
    table: "subscription_notifications",
    columns: ["subscription_id"],
    name: "subscription_notifications_subscription_id_idx",
  },
  {
    table: "usage_counters",
    columns: ["user_id", "feature_key", "period_type", "period_key"],
    name: "usage_counters_user_feature_period_idx",
  },
  {
    table: "usage_counters",
    columns: ["organisation_id", "feature_key"],
    name: "usage_counters_org_feature_idx",
  },
  {
    table: "payment_attempts",
    columns: ["user_id", "created_at"],
    name: "payment_attempts_user_created_idx",
  },
  {
    table: "webhook_logs",
    columns: ["created_at"],
    name: "webhook_logs_created_at_idx",
  },

  // —— Ops / logs (if present) ——
  {
    table: "email_send_logs",
    columns: ["sent_at"],
    name: "email_send_logs_sent_at_idx",
  },
  {
    table: "external_api_call_logs",
    columns: ["executed_at"],
    name: "external_api_call_logs_executed_at_idx",
  },
];

/** MySQL TEXT columns need a prefix length for indexes. */
const PREFIX_INDEXES = [
  {
    table: "employee_invitations",
    name: "employee_invitations_token_prefix_idx",
    sql: "CREATE INDEX employee_invitations_token_prefix_idx ON employee_invitations (invitation_token(64))",
  },
  {
    table: "organisation_settings",
    name: "organisation_settings_org_key_uidx",
    sql: "CREATE UNIQUE INDEX organisation_settings_org_key_uidx ON organisation_settings (organisation_id, `key`(191))",
  },
];

export async function up(queryInterface) {
  for (const spec of INDEXES) {
    await ensureIndex(
      queryInterface,
      spec.table,
      spec.columns,
      spec.name,
      spec.unique ? { unique: true } : {},
    );
  }

  for (const spec of PREFIX_INDEXES) {
    if (!(await tableExists(queryInterface, spec.table))) continue;
    if (await indexExists(queryInterface, spec.table, spec.name)) continue;
    try {
      await queryInterface.sequelize.query(spec.sql);
    } catch (err) {
      console.warn(`[indexes] skip ${spec.name}:`, err.message);
    }
  }
}

export async function down(queryInterface) {
  for (const spec of [...PREFIX_INDEXES].reverse()) {
    if (!(await tableExists(queryInterface, spec.table))) continue;
    try {
      await queryInterface.removeIndex(spec.table, spec.name);
    } catch {
      /* ignore */
    }
  }

  for (const spec of [...INDEXES].reverse()) {
    if (!(await tableExists(queryInterface, spec.table))) continue;
    try {
      await queryInterface.removeIndex(spec.table, spec.name);
    } catch {
      /* ignore */
    }
  }
}
