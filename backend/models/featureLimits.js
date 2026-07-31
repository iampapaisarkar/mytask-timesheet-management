import { DataTypes } from "sequelize";
import { db } from "../database.js";

const FeatureLimits = db.define(
  "FeatureLimits",
  {
    id: { type: DataTypes.INTEGER.UNSIGNED, primaryKey: true, autoIncrement: true },
    feature_key: { type: DataTypes.STRING(64), allowNull: false, unique: true },
    display_name: { type: DataTypes.STRING(128), allowNull: false },
    description: { type: DataTypes.TEXT, allowNull: true },
    reset_period: {
      type: DataTypes.ENUM("none", "daily", "monthly"),
      allowNull: false,
      defaultValue: "none",
    },
    created_at: { type: DataTypes.DATE, allowNull: false },
    updated_at: { type: DataTypes.DATE, allowNull: true },
  },
  { tableName: "feature_limits", timestamps: false },
);

export default FeatureLimits;
