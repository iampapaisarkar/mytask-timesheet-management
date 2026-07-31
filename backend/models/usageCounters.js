import { DataTypes } from "sequelize";
import { db } from "../database.js";

const UsageCounters = db.define(
  "UsageCounters",
  {
    id: { type: DataTypes.BIGINT.UNSIGNED, primaryKey: true, autoIncrement: true },
    user_id: { type: DataTypes.INTEGER, allowNull: false },
    organisation_id: { type: DataTypes.INTEGER, allowNull: true },
    employee_id: { type: DataTypes.INTEGER, allowNull: true },
    feature_key: { type: DataTypes.STRING(64), allowNull: false },
    period_type: {
      type: DataTypes.ENUM("lifetime", "daily", "monthly"),
      allowNull: false,
      defaultValue: "lifetime",
    },
    period_key: { type: DataTypes.STRING(16), allowNull: false },
    count: { type: DataTypes.INTEGER.UNSIGNED, allowNull: false, defaultValue: 0 },
    created_at: { type: DataTypes.DATE, allowNull: false },
    updated_at: { type: DataTypes.DATE, allowNull: true },
  },
  { tableName: "usage_counters", timestamps: false },
);

export default UsageCounters;
