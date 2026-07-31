import { DataTypes } from "sequelize";
import { db } from "../database.js";

const SubscriptionHistory = db.define(
  "SubscriptionHistory",
  {
    id: { type: DataTypes.BIGINT.UNSIGNED, primaryKey: true, autoIncrement: true },
    subscription_id: { type: DataTypes.BIGINT.UNSIGNED, allowNull: false },
    user_id: { type: DataTypes.INTEGER, allowNull: false },
    from_plan_id: { type: DataTypes.INTEGER.UNSIGNED, allowNull: true },
    to_plan_id: { type: DataTypes.INTEGER.UNSIGNED, allowNull: true },
    event_type: { type: DataTypes.STRING(64), allowNull: false },
    previous_status: { type: DataTypes.STRING(32), allowNull: true },
    new_status: { type: DataTypes.STRING(32), allowNull: true },
    notes: { type: DataTypes.TEXT, allowNull: true },
    metadata: { type: DataTypes.JSON, allowNull: true },
    created_at: { type: DataTypes.DATE, allowNull: false },
    updated_at: { type: DataTypes.DATE, allowNull: true },
  },
  { tableName: "subscription_history", timestamps: false },
);

SubscriptionHistory.associate = (models) => {
  SubscriptionHistory.belongsTo(models.Subscriptions, {
    foreignKey: "subscription_id",
    as: "subscription",
  });
};

export default SubscriptionHistory;
