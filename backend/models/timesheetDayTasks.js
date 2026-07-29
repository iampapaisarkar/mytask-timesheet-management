import { DataTypes } from "sequelize";
import { db } from "../database.js";
import moment from "moment-timezone";

const TimesheetDayTasks = db.define(
  "TimesheetDayTasks",
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
    timesheet_id: {
      type: DataTypes.INTEGER,
    },
    timesheet_day_id: {
      type: DataTypes.INTEGER,
    },
    job_id: {
      type: DataTypes.INTEGER,
    },
    start_time: {
      type: DataTypes.TIME,
    },
    end_time: {
      type: DataTypes.TIME,
    },
    total_hours: {
      type: DataTypes.DECIMAL(10, 2),
    },
    is_break: {
      type: DataTypes.BOOLEAN,
    },
    is_travel: {
      type: DataTypes.BOOLEAN,
    },
    original_log: {
      type: DataTypes.JSON,
    },
    source: {
      type: DataTypes.STRING,
    },
    remarks: {
      type: DataTypes.TEXT,
    },
    approval_reason: {
      type: DataTypes.TEXT,
    },
    reject_reason: {
      type: DataTypes.TEXT,
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
    total_logged_hours: {
      type: DataTypes.VIRTUAL,
      get() {
        const total_hours = this.total_hours;
        if (!total_hours) return null;
        return toHM(parseFloat(total_hours));
      },
    },
  },
  {
    tableName: "timesheet_day_tasks", // Table name should be in lowercase and plural
    timestamps: false,
  }
);

const toHM = (decimalVal) => {
  const minutes = Math.round(decimalVal * 60);
  const h = Math.floor(minutes / 60);
  const m = minutes % 60;
  if (h === 0 && m === 0) {
    return null;
  }
  return `${h}h ${m}m`;
};

// -----------------------------
//   ASSOCIATIONS
// -----------------------------
TimesheetDayTasks.associate = (models) => {
  models.TimesheetDayTasks.belongsTo(models.TimesheetDays, {
    foreignKey: "timesheet_day_id",
    as: "day",
  });
  models.TimesheetDayTasks.belongsTo(models.Jobs, {
    foreignKey: "job_id",
    as: "job",
  });
  models.TimesheetDayTasks.belongsTo(models.Employees, {
    foreignKey: "employee_id",
    as: "employee",
  });
  models.TimesheetDayTasks.hasOne(models.TimesheetTaskActivityPairs, {
    foreignKey: "timesheet_day_task_id",
    as: "task_timeline",
  });
};

export default TimesheetDayTasks;
