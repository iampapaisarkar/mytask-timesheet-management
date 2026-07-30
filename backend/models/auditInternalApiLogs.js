import { DataTypes } from "sequelize";
import { db } from "../database.js";

const AuditInternalApiLogs = db.define(
  "AuditInternalApiLogs",
  {
    id: { type: DataTypes.BIGINT.UNSIGNED, primaryKey: true, autoIncrement: true },
    organisation_id: DataTypes.INTEGER,
    organisation_code: DataTypes.STRING(64),
    user_id: DataTypes.INTEGER,
    employee_id: DataTypes.INTEGER,
    role_code: DataTypes.STRING(32),
    feature: DataTypes.STRING(128),
    controller: DataTypes.STRING(128),
    endpoint: { type: DataTypes.STRING(512), allowNull: false },
    method: { type: DataTypes.STRING(16), allowNull: false },
    status_code: DataTypes.INTEGER,
    success: { type: DataTypes.BOOLEAN, allowNull: false, defaultValue: false },
    error_category: DataTypes.STRING(64),
    friendly_message: DataTypes.STRING(512),
    technical_message: DataTypes.TEXT,
    request_id: DataTypes.STRING(128),
    correlation_id: DataTypes.STRING(128),
    ip_address: DataTypes.STRING(64),
    user_agent: DataTypes.STRING(512),
    platform: DataTypes.STRING(32),
    app_version: DataTypes.STRING(64),
    client_channel: DataTypes.STRING(16),
    duration_ms: DataTypes.INTEGER,
    started_at: { type: DataTypes.DATE, allowNull: false },
    completed_at: DataTypes.DATE,
    request_meta: DataTypes.JSON,
    response_meta: DataTypes.JSON,
    created_at: { type: DataTypes.DATE, allowNull: false },
  },
  {
    tableName: "audit_internal_api_logs",
    timestamps: false,
  },
);

export default AuditInternalApiLogs;
