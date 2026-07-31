import { DataTypes } from "sequelize";
import { db } from "../database.js";

const StripeEvents = db.define(
  "StripeEvents",
  {
    id: { type: DataTypes.BIGINT.UNSIGNED, primaryKey: true, autoIncrement: true },
    stripe_event_id: { type: DataTypes.STRING(128), allowNull: false, unique: true },
    type: { type: DataTypes.STRING(128), allowNull: false },
    api_version: { type: DataTypes.STRING(32), allowNull: true },
    livemode: { type: DataTypes.BOOLEAN, allowNull: false, defaultValue: false },
    processing_status: {
      type: DataTypes.ENUM("received", "processing", "processed", "failed"),
      allowNull: false,
      defaultValue: "received",
    },
    error_message: { type: DataTypes.TEXT, allowNull: true },
    payload: { type: DataTypes.JSON, allowNull: true },
    processed_at: { type: DataTypes.DATE, allowNull: true },
    created_at: { type: DataTypes.DATE, allowNull: false },
    updated_at: { type: DataTypes.DATE, allowNull: true },
  },
  { tableName: "stripe_events", timestamps: false },
);

export default StripeEvents;
