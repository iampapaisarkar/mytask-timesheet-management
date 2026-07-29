import { DataTypes, Sequelize, Op } from "sequelize";
import { db } from "../database.js";
import moment from "moment-timezone";

const Timesheets = db.define(
  "Timesheets",
  {
    id: {
      type: DataTypes.INTEGER,
      primaryKey: true,
      autoIncrement: true,
    },
    organisation_id: {
      type: DataTypes.INTEGER,
    },
    employee_id: {
      type: DataTypes.INTEGER,
    },
    code: {
      type: DataTypes.STRING,
      unique: true,
    },
    payroll_calendar_id: {
      type: DataTypes.INTEGER,
    },
    period_start_date: {
      type: DataTypes.DATEONLY,
    },
    period_end_date: {
      type: DataTypes.DATEONLY,
    },
    status_id: {
      type: DataTypes.INTEGER,
    },
    approval_reason: {
      type: DataTypes.TEXT,
    },
    reject_reason: {
      type: DataTypes.TEXT,
    },
    xero_timesheet_id: {
      type: DataTypes.UUID,
    },
    created_at: {
      type: DataTypes.DATE,
      field: "created_at",
    },
    created_by: {
      type: DataTypes.INTEGER,
    },
    period_range: {
      type: DataTypes.VIRTUAL,
      get() {
        const start = this.getDataValue("period_start_date");
        const end = this.getDataValue("period_end_date");

        if (!start || !end) return null;

        const startFmt = moment(start).format("DD MMM");
        const endFmt = moment(end).format("DD MMM, YYYY");

        return `${startFmt} to ${endFmt}`;
      },
    },
    push_to_xero: {
      type: DataTypes.VIRTUAL,
      get() {
        return true;
      },
    },
  },
  {
    tableName: "timesheets", // Table name should be in lowercase and plural
    timestamps: false,
  }
);

// -----------------------------
//   ASSOCIATIONS
// -----------------------------
Timesheets.associate = (models) => {
  models.Timesheets.belongsTo(models.TimesheetStatus, {
    foreignKey: "status_id",
    as: "status",
  });
  models.Timesheets.belongsTo(models.Employees, {
    foreignKey: "employee_id",
    as: "employee",
  });
  models.Timesheets.belongsTo(models.PayrollCalendars, {
    foreignKey: "payroll_calendar_id",
    as: "payroll_calendar",
  });
  models.Timesheets.hasMany(models.TimesheetDays, {
    foreignKey: "timesheet_id",
    as: "days",
  });
};

export default Timesheets;
