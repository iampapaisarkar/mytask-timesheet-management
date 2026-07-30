-- =========================
-- EMPLOYEES
-- =========================
CREATE INDEX idx_employees_user_id ON employees(user_id);
CREATE INDEX idx_employees_org_id ON employees(organisation_id);
CREATE INDEX idx_employees_region_id ON employees(region_id);

-- =========================
-- WAGES & PAYROLL
-- =========================
CREATE UNIQUE INDEX uq_employee_wages_employee ON employee_wages(employee_id);
CREATE UNIQUE INDEX uq_employee_payrolls_employee ON employee_payrolls(employee_id);

CREATE INDEX idx_employee_wages_status_type_calendar 
ON employee_wages(employment_status_id, employment_type_id, payroll_calendar_id);

-- =========================
-- INVITATIONS
-- =========================
CREATE INDEX idx_emp_inv_email ON employee_invitations(email);
CREATE INDEX idx_emp_inv_status_employee 
ON employee_invitations(status_id, employee_id);

-- ⚠️ FIX: safer prefix (or switch to VARCHAR instead of TEXT)
CREATE INDEX idx_emp_inv_token ON employee_invitations(invitation_token(100));

-- =========================
-- LOOKUP TABLES (UNIQUE only, no extra index needed)
-- =========================
CREATE UNIQUE INDEX uq_employment_status_code ON employment_status(code);
CREATE UNIQUE INDEX uq_employment_types_code ON employment_types(code);

-- =========================
-- TIMESHEETS
-- =========================
CREATE INDEX idx_timesheets_emp_org_status 
ON timesheets(employee_id, organisation_id, status_id);

CREATE INDEX idx_timesheets_calendar 
ON timesheets(payroll_calendar_id);

-- =========================
-- TIMESHEET DAYS
-- =========================
CREATE INDEX idx_timesheet_days_ts_emp_date 
ON timesheet_days(timesheet_id, employee_id, date);

-- =========================
-- TIMESHEET TASKS
-- =========================
CREATE INDEX idx_ts_tasks_day_job_emp 
ON timesheet_day_tasks(timesheet_day_id, job_id, employee_id);

-- =========================
-- ACTIVITY LOGS
-- =========================
CREATE INDEX idx_activity_logs_main 
ON timesheet_activity_logs(timesheet_day_id, user_id, track_at);

CREATE INDEX idx_activity_logs_type_id 
ON timesheet_activity_logs(type_id);

-- =========================
-- TASK ACTIVITY PAIRS
-- =========================
CREATE INDEX idx_task_pairs_main 
ON timesheet_task_activity_pairs(timesheet_day_task_id, timesheet_activity_log_start_id, timesheet_activity_log_end_id);

-- =========================
-- TIMESHEET LOOKUPS
-- =========================
CREATE UNIQUE INDEX uq_timesheet_status_code ON timesheet_status(code);
CREATE UNIQUE INDEX uq_timesheet_activity_types_code ON timesheet_activity_types(code);
CREATE UNIQUE INDEX uq_timesheet_sub_freq_code ON timesheet_submission_frequencies(code);

-- =========================
-- USERS
-- =========================
CREATE UNIQUE INDEX uq_users_email ON users(email);
CREATE UNIQUE INDEX uq_users_firebase_id ON users(firebase_user_id);

-- =========================
-- USER SESSIONS
-- =========================
CREATE INDEX idx_user_sessions_user_expire 
ON user_sessions(user_id, expire_at);

-- ⚠️ FIX: reduce prefix length
CREATE INDEX idx_user_sessions_token ON user_sessions(token(100));

-- =========================
-- RBAC
-- =========================
CREATE INDEX idx_uor_main 
ON user_organisation_roles(user_id, organisation_id, role_id);

CREATE INDEX idx_usr_main 
ON user_system_roles(user_id, role_id);

-- =========================
-- ORGANISATIONS
-- =========================
CREATE UNIQUE INDEX uq_org_roles_code ON organisation_roles(code);
CREATE UNIQUE INDEX uq_organisations_code ON organisations(code);

-- =========================
-- SETTINGS
-- =========================
CREATE INDEX idx_org_settings_org_key 
ON organisation_settings(organisation_id, `key`(50));

-- =========================
-- XERO
-- =========================
CREATE INDEX idx_xero_org_tenant 
ON xero_connections(organisation_id, tenant_id);

-- =========================
-- USER META
-- =========================
CREATE INDEX idx_user_timezones_user_id ON user_timezones(user_id);

-- =========================
-- AWARD RATES
-- =========================
CREATE INDEX idx_award_rates_org_id ON award_rates(organisation_id);

-- SETTINGS
CREATE INDEX idx_award_rate_settings_main 
ON award_rate_settings(award_rate_id, rounding_interval_id);

-- RULES
CREATE INDEX idx_award_rules_main 
ON award_rate_rules(award_rate_id, organisation_id);

-- RULE IFS
CREATE INDEX idx_arr_ifs_main 
ON award_rate_rule_ifs(award_rate_rule_id, award_rate_field_id, award_rate_comparison_id);

-- RULE THEN
CREATE INDEX idx_arr_then_main 
ON award_rate_rule_then(award_rate_rule_id, award_rate_if_id, earning_rate_id);

-- DAY RELATIONS
CREATE UNIQUE INDEX uq_arr_day_rule 
ON award_rate_rule_day_relations(award_rate_rule_id, award_rate_day_id);

-- LOOKUPS
CREATE UNIQUE INDEX uq_arr_fields_code ON award_rate_rule_fields(code);
CREATE INDEX idx_arr_fields_type_id ON award_rate_rule_fields(type_id);

CREATE UNIQUE INDEX uq_arr_comparators_code ON award_rate_rule_comparators(code);
CREATE UNIQUE INDEX uq_arr_days_code ON award_rate_rule_days(code);