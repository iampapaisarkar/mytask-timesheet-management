import { DataTypes } from "sequelize";
import { db } from "../database.js";

const BillingHistory = db.define(
  "BillingHistory",
  {
    id: { type: DataTypes.BIGINT.UNSIGNED, primaryKey: true, autoIncrement: true },
    user_id: { type: DataTypes.INTEGER, allowNull: false },
    subscription_id: { type: DataTypes.BIGINT.UNSIGNED, allowNull: true },
    plan_id: { type: DataTypes.INTEGER.UNSIGNED, allowNull: true },
    invoice_number: { type: DataTypes.STRING(64), allowNull: true },
    stripe_invoice_id: { type: DataTypes.STRING(128), allowNull: true, unique: true },
    stripe_payment_intent_id: { type: DataTypes.STRING(128), allowNull: true },
    amount_cents: { type: DataTypes.INTEGER, allowNull: false, defaultValue: 0 },
    currency: { type: DataTypes.STRING(3), allowNull: false, defaultValue: "usd" },
    status: {
      type: DataTypes.ENUM("draft", "open", "paid", "uncollectible", "void", "failed"),
      allowNull: false,
      defaultValue: "open",
    },
    billing_reason: { type: DataTypes.STRING(64), allowNull: true },
    payment_method_brand: { type: DataTypes.STRING(32), allowNull: true },
    payment_method_last4: { type: DataTypes.STRING(8), allowNull: true },
    invoice_pdf_url: { type: DataTypes.STRING(1024), allowNull: true },
    hosted_invoice_url: { type: DataTypes.STRING(1024), allowNull: true },
    period_start: { type: DataTypes.DATE, allowNull: true },
    period_end: { type: DataTypes.DATE, allowNull: true },
    paid_at: { type: DataTypes.DATE, allowNull: true },
    metadata: { type: DataTypes.JSON, allowNull: true },
    created_at: { type: DataTypes.DATE, allowNull: false },
    updated_at: { type: DataTypes.DATE, allowNull: true },
    deleted_at: { type: DataTypes.DATE, allowNull: true },
  },
  { tableName: "billing_history", timestamps: false },
);

BillingHistory.associate = (models) => {
  BillingHistory.belongsTo(models.Users, { foreignKey: "user_id", as: "user" });
  BillingHistory.belongsTo(models.Subscriptions, {
    foreignKey: "subscription_id",
    as: "subscription",
  });
  BillingHistory.belongsTo(models.Plans, { foreignKey: "plan_id", as: "plan" });
};

export default BillingHistory;
