import { DataTypes } from "sequelize";
import { db } from "../database.js";

const PlanFeatures = db.define(
  "PlanFeatures",
  {
    id: { type: DataTypes.INTEGER.UNSIGNED, primaryKey: true, autoIncrement: true },
    plan_id: { type: DataTypes.INTEGER.UNSIGNED, allowNull: false },
    feature_key: { type: DataTypes.STRING(64), allowNull: false },
    feature_type: {
      type: DataTypes.ENUM("boolean", "limit"),
      allowNull: false,
      defaultValue: "limit",
    },
    limit_value: { type: DataTypes.INTEGER, allowNull: true },
    bool_value: { type: DataTypes.BOOLEAN, allowNull: true },
    description: { type: DataTypes.STRING(255), allowNull: true },
    created_at: { type: DataTypes.DATE, allowNull: false },
    updated_at: { type: DataTypes.DATE, allowNull: true },
  },
  { tableName: "plan_features", timestamps: false },
);

PlanFeatures.associate = (models) => {
  PlanFeatures.belongsTo(models.Plans, { foreignKey: "plan_id", as: "plan" });
};

export default PlanFeatures;
