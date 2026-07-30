import { DataTypes } from "sequelize";

/**
 * Enterprise audit tables for System Logs.
 * Separate from legacy external_api_call_logs / email_send_logs (kept for history).
 */
export async function up(queryInterface) {
  await queryInterface.createTable(
    { tableName: "audit_internal_api_logs" },
    {
      id: {
        allowNull: false,
        autoIncrement: true,
        primaryKey: true,
        type: DataTypes.BIGINT.UNSIGNED,
      },
      organisation_id: { type: DataTypes.INTEGER, allowNull: true },
      organisation_code: { type: DataTypes.STRING(64), allowNull: true },
      user_id: { type: DataTypes.INTEGER, allowNull: true },
      employee_id: { type: DataTypes.INTEGER, allowNull: true },
      role_code: { type: DataTypes.STRING(32), allowNull: true },
      feature: { type: DataTypes.STRING(128), allowNull: true },
      controller: { type: DataTypes.STRING(128), allowNull: true },
      endpoint: { type: DataTypes.STRING(512), allowNull: false },
      method: { type: DataTypes.STRING(16), allowNull: false },
      status_code: { type: DataTypes.INTEGER, allowNull: true },
      success: { type: DataTypes.BOOLEAN, allowNull: false, defaultValue: false },
      error_category: { type: DataTypes.STRING(64), allowNull: true },
      friendly_message: { type: DataTypes.STRING(512), allowNull: true },
      technical_message: { type: DataTypes.TEXT, allowNull: true },
      request_id: { type: DataTypes.STRING(128), allowNull: true },
      correlation_id: { type: DataTypes.STRING(128), allowNull: true },
      ip_address: { type: DataTypes.STRING(64), allowNull: true },
      user_agent: { type: DataTypes.STRING(512), allowNull: true },
      platform: { type: DataTypes.STRING(32), allowNull: true },
      app_version: { type: DataTypes.STRING(64), allowNull: true },
      client_channel: { type: DataTypes.STRING(16), allowNull: true },
      duration_ms: { type: DataTypes.INTEGER, allowNull: true },
      started_at: { type: DataTypes.DATE, allowNull: false },
      completed_at: { type: DataTypes.DATE, allowNull: true },
      request_meta: { type: DataTypes.JSON, allowNull: true },
      response_meta: { type: DataTypes.JSON, allowNull: true },
      created_at: {
        type: DataTypes.DATE,
        allowNull: false,
        defaultValue: DataTypes.NOW,
      },
    },
  );

  await queryInterface.addIndex(
    { tableName: "audit_internal_api_logs" },
    ["organisation_id", "started_at"],
    { name: "audit_internal_org_started_idx" },
  );
  await queryInterface.addIndex(
    { tableName: "audit_internal_api_logs" },
    ["organisation_id", "success", "started_at"],
    { name: "audit_internal_org_success_started_idx" },
  );
  await queryInterface.addIndex(
    { tableName: "audit_internal_api_logs" },
    ["correlation_id"],
    { name: "audit_internal_correlation_idx" },
  );
  await queryInterface.addIndex(
    { tableName: "audit_internal_api_logs" },
    ["user_id", "started_at"],
    { name: "audit_internal_user_started_idx" },
  );
  await queryInterface.addIndex(
    { tableName: "audit_internal_api_logs" },
    ["feature", "started_at"],
    { name: "audit_internal_feature_started_idx" },
  );

  await queryInterface.createTable(
    { tableName: "audit_external_api_logs" },
    {
      id: {
        allowNull: false,
        autoIncrement: true,
        primaryKey: true,
        type: DataTypes.BIGINT.UNSIGNED,
      },
      organisation_id: { type: DataTypes.INTEGER, allowNull: true },
      organisation_code: { type: DataTypes.STRING(64), allowNull: true },
      user_id: { type: DataTypes.INTEGER, allowNull: true },
      employee_id: { type: DataTypes.INTEGER, allowNull: true },
      feature: { type: DataTypes.STRING(128), allowNull: true },
      api_name: { type: DataTypes.STRING(128), allowNull: false },
      endpoint: { type: DataTypes.STRING(1024), allowNull: true },
      method: { type: DataTypes.STRING(16), allowNull: true },
      status_code: { type: DataTypes.INTEGER, allowNull: true },
      success: { type: DataTypes.BOOLEAN, allowNull: false, defaultValue: false },
      duration_ms: { type: DataTypes.INTEGER, allowNull: true },
      friendly_message: { type: DataTypes.STRING(512), allowNull: true },
      technical_message: { type: DataTypes.TEXT, allowNull: true },
      request_id: { type: DataTypes.STRING(128), allowNull: true },
      correlation_id: { type: DataTypes.STRING(128), allowNull: true },
      request_meta: { type: DataTypes.JSON, allowNull: true },
      response_meta: { type: DataTypes.JSON, allowNull: true },
      executed_at: { type: DataTypes.DATE, allowNull: false },
      created_at: {
        type: DataTypes.DATE,
        allowNull: false,
        defaultValue: DataTypes.NOW,
      },
    },
  );

  await queryInterface.addIndex(
    { tableName: "audit_external_api_logs" },
    ["organisation_id", "executed_at"],
    { name: "audit_external_org_executed_idx" },
  );
  await queryInterface.addIndex(
    { tableName: "audit_external_api_logs" },
    ["organisation_id", "success", "executed_at"],
    { name: "audit_external_org_success_executed_idx" },
  );
  await queryInterface.addIndex(
    { tableName: "audit_external_api_logs" },
    ["api_name", "executed_at"],
    { name: "audit_external_api_executed_idx" },
  );
  await queryInterface.addIndex(
    { tableName: "audit_external_api_logs" },
    ["correlation_id"],
    { name: "audit_external_correlation_idx" },
  );

  await queryInterface.createTable(
    { tableName: "audit_email_logs" },
    {
      id: {
        allowNull: false,
        autoIncrement: true,
        primaryKey: true,
        type: DataTypes.BIGINT.UNSIGNED,
      },
      organisation_id: { type: DataTypes.INTEGER, allowNull: true },
      organisation_code: { type: DataTypes.STRING(64), allowNull: true },
      user_id: { type: DataTypes.INTEGER, allowNull: true },
      feature: { type: DataTypes.STRING(128), allowNull: true },
      recipient: { type: DataTypes.STRING(512), allowNull: true },
      subject: { type: DataTypes.STRING(512), allowNull: true },
      template: { type: DataTypes.STRING(128), allowNull: true },
      provider: { type: DataTypes.STRING(64), allowNull: true },
      provider_message_id: { type: DataTypes.STRING(256), allowNull: true },
      status: { type: DataTypes.STRING(32), allowNull: false, defaultValue: "queued" },
      success: { type: DataTypes.BOOLEAN, allowNull: false, defaultValue: false },
      retry_count: { type: DataTypes.INTEGER, allowNull: false, defaultValue: 0 },
      duration_ms: { type: DataTypes.INTEGER, allowNull: true },
      friendly_message: { type: DataTypes.STRING(512), allowNull: true },
      technical_message: { type: DataTypes.TEXT, allowNull: true },
      provider_response: { type: DataTypes.JSON, allowNull: true },
      correlation_id: { type: DataTypes.STRING(128), allowNull: true },
      request_id: { type: DataTypes.STRING(128), allowNull: true },
      sent_at: { type: DataTypes.DATE, allowNull: false },
      created_at: {
        type: DataTypes.DATE,
        allowNull: false,
        defaultValue: DataTypes.NOW,
      },
    },
  );

  await queryInterface.addIndex(
    { tableName: "audit_email_logs" },
    ["organisation_id", "sent_at"],
    { name: "audit_email_org_sent_idx" },
  );
  await queryInterface.addIndex(
    { tableName: "audit_email_logs" },
    ["organisation_id", "success", "sent_at"],
    { name: "audit_email_org_success_sent_idx" },
  );
  await queryInterface.addIndex(
    { tableName: "audit_email_logs" },
    ["template", "sent_at"],
    { name: "audit_email_template_sent_idx" },
  );
  await queryInterface.addIndex(
    { tableName: "audit_email_logs" },
    ["correlation_id"],
    { name: "audit_email_correlation_idx" },
  );
}

export async function down(queryInterface) {
  await queryInterface.dropTable({ tableName: "audit_email_logs" });
  await queryInterface.dropTable({ tableName: "audit_external_api_logs" });
  await queryInterface.dropTable({ tableName: "audit_internal_api_logs" });
}
