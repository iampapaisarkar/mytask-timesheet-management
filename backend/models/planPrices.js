import { DataTypes } from "sequelize";
import { db } from "../database.js";

const PlanPrices = db.define(
  "PlanPrices",
  {
    id: { type: DataTypes.INTEGER.UNSIGNED, primaryKey: true, autoIncrement: true },
    plan_id: { type: DataTypes.INTEGER.UNSIGNED, allowNull: false },
    billing_interval: {
      type: DataTypes.ENUM("month", "year", "none"),
      allowNull: false,
      defaultValue: "none",
    },
    amount_cents: { type: DataTypes.INTEGER.UNSIGNED, allowNull: false, defaultValue: 0 },
    currency: { type: DataTypes.STRING(3), allowNull: false, defaultValue: "usd" },
    stripe_price_id: { type: DataTypes.STRING(128), allowNull: true },
    stripe_product_id: { type: DataTypes.STRING(128), allowNull: true },
    is_active: { type: DataTypes.BOOLEAN, allowNull: false, defaultValue: true },
    created_at: { type: DataTypes.DATE, allowNull: false },
    updated_at: { type: DataTypes.DATE, allowNull: true },
    deleted_at: { type: DataTypes.DATE, allowNull: true },
  },
  { tableName: "plan_prices", timestamps: false },
);

PlanPrices.associate = (models) => {
  PlanPrices.belongsTo(models.Plans, { foreignKey: "plan_id", as: "plan" });
};

export default PlanPrices;
