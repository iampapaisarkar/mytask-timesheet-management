import { DataTypes } from "sequelize";
import { db } from "../database.js";

/**
 * Enterprise payouts — internal payroll records from approved timesheets.
 * Statuses: DRAFT | PENDING_APPROVAL | APPROVED | READY_FOR_PAYOUT | PAID | CANCELLED
 * Legacy: ELIGIBLE → READY_FOR_PAYOUT, VOID → CANCELLED
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
    payout_number: {
      type: DataTypes.STRING(64),
      allowNull: true,
    },
    amount: {
      type: DataTypes.DECIMAL(12, 2),
      allowNull: false,
    },
    status: {
      type: DataTypes.STRING,
      allowNull: false,
      defaultValue: "READY_FOR_PAYOUT",
    },
    payment_method: {
      type: DataTypes.STRING,
      allowNull: true,
    },
    pay_date: {
      type: DataTypes.DATEONLY,
      allowNull: true,
    },
    period_start_date: {
      type: DataTypes.DATEONLY,
      allowNull: true,
    },
    period_end_date: {
      type: DataTypes.DATEONLY,
      allowNull: true,
    },
    currency: {
      type: DataTypes.STRING(8),
      allowNull: true,
    },
    worked_hours: {
      type: DataTypes.DECIMAL(10, 2),
      allowNull: true,
    },
    regular_hours: {
      type: DataTypes.DECIMAL(10, 2),
      allowNull: true,
    },
    overtime_hours: {
      type: DataTypes.DECIMAL(10, 2),
      allowNull: true,
    },
    hourly_rate: {
      type: DataTypes.DECIMAL(12, 4),
      allowNull: true,
    },
    gross_amount: {
      type: DataTypes.DECIMAL(12, 2),
      allowNull: true,
    },
    deductions: {
      type: DataTypes.DECIMAL(12, 2),
      allowNull: false,
      defaultValue: 0,
    },
    bonuses: {
      type: DataTypes.DECIMAL(12, 2),
      allowNull: false,
      defaultValue: 0,
    },
    adjustments: {
      type: DataTypes.DECIMAL(12, 2),
      allowNull: false,
      defaultValue: 0,
    },
    tax_amount: {
      type: DataTypes.DECIMAL(12, 2),
      allowNull: false,
      defaultValue: 0,
    },
    net_amount: {
      type: DataTypes.DECIMAL(12, 2),
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
    approved_by: {
      type: DataTypes.INTEGER,
      allowNull: true,
    },
    approved_at: {
      type: DataTypes.DATE,
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
  if (models.PayoutEvents) {
    models.Payouts.hasMany(models.PayoutEvents, {
      foreignKey: "payout_id",
      as: "events",
    });
  }
};

export default Payouts;
