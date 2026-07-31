import { DataTypes } from "sequelize";
import { db } from "../database.js";

const Plans = db.define(
  "Plans",
  {
    id: { type: DataTypes.INTEGER.UNSIGNED, primaryKey: true, autoIncrement: true },
    code: { type: DataTypes.STRING(32), allowNull: false, unique: true },
    name: { type: DataTypes.STRING(64), allowNull: false },
    description: { type: DataTypes.TEXT, allowNull: true },
    is_free: { type: DataTypes.BOOLEAN, allowNull: false, defaultValue: false },
    is_active: { type: DataTypes.BOOLEAN, allowNull: false, defaultValue: true },
    sort_order: { type: DataTypes.INTEGER, allowNull: false, defaultValue: 0 },
    created_at: { type: DataTypes.DATE, allowNull: false },
    updated_at: { type: DataTypes.DATE, allowNull: true },
    deleted_at: { type: DataTypes.DATE, allowNull: true },
  },
  { tableName: "plans", timestamps: false },
);

Plans.associate = (models) => {
  Plans.hasMany(models.PlanPrices, { foreignKey: "plan_id", as: "prices" });
  Plans.hasMany(models.PlanFeatures, { foreignKey: "plan_id", as: "features" });
  Plans.hasMany(models.Subscriptions, { foreignKey: "plan_id", as: "subscriptions" });
};

export default Plans;
