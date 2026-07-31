import { DataTypes } from "sequelize";
import { db } from "../database.js";

const InvoiceHistory = db.define(
  "InvoiceHistory",
  {
    id: { type: DataTypes.BIGINT.UNSIGNED, primaryKey: true, autoIncrement: true },
    user_id: { type: DataTypes.INTEGER, allowNull: false },
    billing_history_id: { type: DataTypes.BIGINT.UNSIGNED, allowNull: true },
    stripe_invoice_id: { type: DataTypes.STRING(128), allowNull: false, unique: true },
    raw_payload: { type: DataTypes.JSON, allowNull: true },
    synced_at: { type: DataTypes.DATE, allowNull: true },
    created_at: { type: DataTypes.DATE, allowNull: false },
    updated_at: { type: DataTypes.DATE, allowNull: true },
  },
  { tableName: "invoice_history", timestamps: false },
);

export default InvoiceHistory;
