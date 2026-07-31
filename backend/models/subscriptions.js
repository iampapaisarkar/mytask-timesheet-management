import { DataTypes } from "sequelize";
import { db } from "../database.js";

const Subscriptions = db.define(
  "Subscriptions",
  {
    id: { type: DataTypes.BIGINT.UNSIGNED, primaryKey: true, autoIncrement: true },
    user_id: { type: DataTypes.INTEGER, allowNull: false },
    plan_id: { type: DataTypes.INTEGER.UNSIGNED, allowNull: false },
    plan_price_id: { type: DataTypes.INTEGER.UNSIGNED, allowNull: true },
    status: {
      type: DataTypes.ENUM(
        "active",
        "trialing",
        "past_due",
        "canceled",
        "unpaid",
        "incomplete",
        "incomplete_expired",
        "paused",
        "expired",
      ),
      allowNull: false,
      defaultValue: "active",
    },
    billing_interval: {
      type: DataTypes.ENUM("month", "year", "none"),
      allowNull: false,
      defaultValue: "none",
    },
    stripe_subscription_id: { type: DataTypes.STRING(128), allowNull: true, unique: true },
    stripe_customer_id: { type: DataTypes.STRING(128), allowNull: true },
    current_period_start: { type: DataTypes.DATE, allowNull: true },
    current_period_end: { type: DataTypes.DATE, allowNull: true },
    cancel_at_period_end: { type: DataTypes.BOOLEAN, allowNull: false, defaultValue: false },
    canceled_at: { type: DataTypes.DATE, allowNull: true },
    ended_at: { type: DataTypes.DATE, allowNull: true },
    trial_end: { type: DataTypes.DATE, allowNull: true },
    payment_status: {
      type: DataTypes.ENUM("none", "paid", "pending", "failed", "refunded"),
      allowNull: false,
      defaultValue: "none",
    },
    metadata: { type: DataTypes.JSON, allowNull: true },
    created_at: { type: DataTypes.DATE, allowNull: false },
    updated_at: { type: DataTypes.DATE, allowNull: true },
    deleted_at: { type: DataTypes.DATE, allowNull: true },
  },
  { tableName: "subscriptions", timestamps: false },
);

Subscriptions.associate = (models) => {
  Subscriptions.belongsTo(models.Users, { foreignKey: "user_id", as: "user" });
  Subscriptions.belongsTo(models.Plans, { foreignKey: "plan_id", as: "plan" });
  Subscriptions.belongsTo(models.PlanPrices, {
    foreignKey: "plan_price_id",
    as: "plan_price",
  });
  Subscriptions.hasMany(models.SubscriptionHistory, {
    foreignKey: "subscription_id",
    as: "history",
  });
  Subscriptions.hasMany(models.BillingHistory, {
    foreignKey: "subscription_id",
    as: "billing",
  });
};

export default Subscriptions;
