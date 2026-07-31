import { DataTypes } from "sequelize";
import { db } from "../database.js";

const StripeCustomers = db.define(
  "StripeCustomers",
  {
    id: { type: DataTypes.INTEGER.UNSIGNED, primaryKey: true, autoIncrement: true },
    user_id: { type: DataTypes.INTEGER, allowNull: false, unique: true },
    stripe_customer_id: { type: DataTypes.STRING(128), allowNull: false, unique: true },
    email: { type: DataTypes.STRING(255), allowNull: true },
    default_payment_method: { type: DataTypes.STRING(128), allowNull: true },
    metadata: { type: DataTypes.JSON, allowNull: true },
    created_at: { type: DataTypes.DATE, allowNull: false },
    updated_at: { type: DataTypes.DATE, allowNull: true },
    deleted_at: { type: DataTypes.DATE, allowNull: true },
  },
  { tableName: "stripe_customers", timestamps: false },
);

StripeCustomers.associate = (models) => {
  StripeCustomers.belongsTo(models.Users, { foreignKey: "user_id", as: "user" });
};

export default StripeCustomers;
