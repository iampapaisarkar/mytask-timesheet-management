import { DataTypes } from "sequelize";
import { db } from "../database.js";

const AuditEmailLogs = db.define(
  "AuditEmailLogs",
  {
    id: { type: DataTypes.BIGINT.UNSIGNED, primaryKey: true, autoIncrement: true },
    organisation_id: DataTypes.INTEGER,
    organisation_code: DataTypes.STRING(64),
    user_id: DataTypes.INTEGER,
    feature: DataTypes.STRING(128),
    recipient: DataTypes.STRING(512),
    subject: DataTypes.STRING(512),
    template: DataTypes.STRING(128),
    provider: DataTypes.STRING(64),
    provider_message_id: DataTypes.STRING(256),
    status: { type: DataTypes.STRING(32), allowNull: false, defaultValue: "queued" },
    success: { type: DataTypes.BOOLEAN, allowNull: false, defaultValue: false },
    retry_count: { type: DataTypes.INTEGER, allowNull: false, defaultValue: 0 },
    duration_ms: DataTypes.INTEGER,
    friendly_message: DataTypes.STRING(512),
    technical_message: DataTypes.TEXT,
    provider_response: DataTypes.JSON,
    correlation_id: DataTypes.STRING(128),
    request_id: DataTypes.STRING(128),
    sent_at: { type: DataTypes.DATE, allowNull: false },
    created_at: { type: DataTypes.DATE, allowNull: false },
  },
  {
    tableName: "audit_email_logs",
    timestamps: false,
  },
);

export default AuditEmailLogs;
