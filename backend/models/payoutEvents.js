import { DataTypes } from "sequelize";
import { db } from "../database.js";

const PayoutEvents = db.define(
  "PayoutEvents",
  {
    id: {
      type: DataTypes.INTEGER,
      primaryKey: true,
      autoIncrement: true,
    },
    organisation_id: {
      type: DataTypes.INTEGER,
      allowNull: false,
    },
    payout_id: {
      type: DataTypes.INTEGER,
      allowNull: false,
    },
    action: {
      type: DataTypes.STRING(64),
      allowNull: false,
    },
    previous_status: {
      type: DataTypes.STRING(64),
      allowNull: true,
    },
    new_status: {
      type: DataTypes.STRING(64),
      allowNull: true,
    },
    previous_value: {
      type: DataTypes.TEXT,
      allowNull: true,
    },
    new_value: {
      type: DataTypes.TEXT,
      allowNull: true,
    },
    notes: {
      type: DataTypes.TEXT,
      allowNull: true,
    },
    created_at: {
      type: DataTypes.DATE,
      allowNull: false,
    },
    created_by: {
      type: DataTypes.INTEGER,
      allowNull: true,
    },
  },
  {
    tableName: "payout_events",
    timestamps: false,
  },
);

PayoutEvents.associate = function (models) {
  models.PayoutEvents.belongsTo(models.Payouts, {
    foreignKey: "payout_id",
    as: "payout",
  });
};

export default PayoutEvents;
