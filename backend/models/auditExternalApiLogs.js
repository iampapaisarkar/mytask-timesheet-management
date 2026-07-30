import { DataTypes } from "sequelize";
import { db } from "../database.js";

const AuditExternalApiLogs = db.define(
  "AuditExternalApiLogs",
  {
    id: { type: DataTypes.BIGINT.UNSIGNED, primaryKey: true, autoIncrement: true },
    organisation_id: DataTypes.INTEGER,
    organisation_code: DataTypes.STRING(64),
    user_id: DataTypes.INTEGER,
    employee_id: DataTypes.INTEGER,
    feature: DataTypes.STRING(128),
    api_name: { type: DataTypes.STRING(128), allowNull: false },
    endpoint: DataTypes.STRING(1024),
    method: DataTypes.STRING(16),
    status_code: DataTypes.INTEGER,
    success: { type: DataTypes.BOOLEAN, allowNull: false, defaultValue: false },
    duration_ms: DataTypes.INTEGER,
    friendly_message: DataTypes.STRING(512),
    technical_message: DataTypes.TEXT,
    request_id: DataTypes.STRING(128),
    correlation_id: DataTypes.STRING(128),
    request_meta: DataTypes.JSON,
    response_meta: DataTypes.JSON,
    executed_at: { type: DataTypes.DATE, allowNull: false },
    created_at: { type: DataTypes.DATE, allowNull: false },
  },
  {
    tableName: "audit_external_api_logs",
    timestamps: false,
  },
);

export default AuditExternalApiLogs;
