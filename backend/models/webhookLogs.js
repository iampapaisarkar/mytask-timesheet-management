import { DataTypes } from "sequelize";
import { db } from "../database.js";

const WebhookLogs = db.define(
  "WebhookLogs",
  {
    id: { type: DataTypes.BIGINT.UNSIGNED, primaryKey: true, autoIncrement: true },
    provider: { type: DataTypes.STRING(32), allowNull: false, defaultValue: "stripe" },
    stripe_event_id: { type: DataTypes.STRING(128), allowNull: true },
    event_type: { type: DataTypes.STRING(128), allowNull: true },
    http_status: { type: DataTypes.INTEGER, allowNull: true },
    success: { type: DataTypes.BOOLEAN, allowNull: false, defaultValue: false },
    request_headers: { type: DataTypes.JSON, allowNull: true },
    request_body: { type: DataTypes.JSON, allowNull: true },
    response_body: { type: DataTypes.JSON, allowNull: true },
    error_message: { type: DataTypes.TEXT, allowNull: true },
    duration_ms: { type: DataTypes.INTEGER, allowNull: true },
    created_at: { type: DataTypes.DATE, allowNull: false },
    updated_at: { type: DataTypes.DATE, allowNull: true },
  },
  { tableName: "webhook_logs", timestamps: false },
);

export default WebhookLogs;
