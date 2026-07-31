import { DataTypes } from "sequelize";
import { db } from "../database.js";

const SubscriptionNotifications = db.define(
  "SubscriptionNotifications",
  {
    id: { type: DataTypes.BIGINT.UNSIGNED, primaryKey: true, autoIncrement: true },
    user_id: { type: DataTypes.INTEGER, allowNull: false },
    subscription_id: { type: DataTypes.BIGINT.UNSIGNED, allowNull: true },
    notification_type: { type: DataTypes.STRING(64), allowNull: false },
    channel: {
      type: DataTypes.ENUM("in_app", "email", "both"),
      allowNull: false,
      defaultValue: "in_app",
    },
    title: { type: DataTypes.STRING(255), allowNull: false },
    body: { type: DataTypes.TEXT, allowNull: true },
    sent_at: { type: DataTypes.DATE, allowNull: true },
    read_at: { type: DataTypes.DATE, allowNull: true },
    metadata: { type: DataTypes.JSON, allowNull: true },
    created_at: { type: DataTypes.DATE, allowNull: false },
    updated_at: { type: DataTypes.DATE, allowNull: true },
  },
  { tableName: "subscription_notifications", timestamps: false },
);

export default SubscriptionNotifications;
