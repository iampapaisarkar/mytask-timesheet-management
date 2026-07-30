import { DataTypes } from "sequelize";
import { db } from "../database.js";

/**
 * MVP payouts — approved timesheets become eligible; admin marks paid.
 * Extensible for future payroll batching.
 */
const Payouts = db.define(
  "Payouts",
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
    employee_id: {
      type: DataTypes.INTEGER,
      allowNull: false,
    },
    timesheet_id: {
      type: DataTypes.INTEGER,
      allowNull: false,
    },
    amount: {
      type: DataTypes.DECIMAL(12, 2),
      allowNull: false,
    },
    /** ELIGIBLE | PAID | VOID */
    status: {
      type: DataTypes.STRING,
      allowNull: false,
      defaultValue: "ELIGIBLE",
    },
    payment_method: {
      type: DataTypes.STRING,
      allowNull: true,
    },
    paid_at: {
      type: DataTypes.DATE,
      allowNull: true,
    },
    notes: {
      type: DataTypes.TEXT,
      allowNull: true,
    },
    created_at: {
      type: DataTypes.DATE,
      field: "created_at",
    },
    created_by: {
      type: DataTypes.INTEGER,
    },
    updated_at: {
      type: DataTypes.DATE,
      field: "updated_at",
    },
    updated_by: {
      type: DataTypes.INTEGER,
    },
  },
  {
    tableName: "payouts",
    timestamps: false,
  },
);

Payouts.associate = function (models) {
  models.Payouts.belongsTo(models.Employees, {
    foreignKey: "employee_id",
    as: "employee",
  });
  models.Payouts.belongsTo(models.Timesheets, {
    foreignKey: "timesheet_id",
    as: "timesheet",
  });
  models.Payouts.belongsTo(models.Organisations, {
    foreignKey: "organisation_id",
    as: "organisation",
  });
};

export default Payouts;
