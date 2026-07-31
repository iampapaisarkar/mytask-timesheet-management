import { DataTypes } from "sequelize";
import { db } from "../database.js";

const PaymentAttempts = db.define(
  "PaymentAttempts",
  {
    id: { type: DataTypes.BIGINT.UNSIGNED, primaryKey: true, autoIncrement: true },
    user_id: { type: DataTypes.INTEGER, allowNull: false },
    subscription_id: { type: DataTypes.BIGINT.UNSIGNED, allowNull: true },
    stripe_payment_intent_id: { type: DataTypes.STRING(128), allowNull: true },
    stripe_invoice_id: { type: DataTypes.STRING(128), allowNull: true },
    amount_cents: { type: DataTypes.INTEGER, allowNull: true },
    currency: { type: DataTypes.STRING(3), allowNull: true },
    status: { type: DataTypes.STRING(32), allowNull: false },
    failure_code: { type: DataTypes.STRING(64), allowNull: true },
    failure_message: { type: DataTypes.TEXT, allowNull: true },
    attempt_count: { type: DataTypes.INTEGER.UNSIGNED, allowNull: false, defaultValue: 1 },
    metadata: { type: DataTypes.JSON, allowNull: true },
    created_at: { type: DataTypes.DATE, allowNull: false },
    updated_at: { type: DataTypes.DATE, allowNull: true },
  },
  { tableName: "payment_attempts", timestamps: false },
);

export default PaymentAttempts;
