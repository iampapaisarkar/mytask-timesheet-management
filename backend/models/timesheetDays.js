import { DataTypes } from "sequelize";
import { mysheet } from "../database.js";
import moment from "moment";

const TimesheetDays = mysheet.define(
  "TimesheetDays",
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
    date: {
      type: DataTypes.DATEONLY,
    },
    day_of_week: {
      type: DataTypes.INTEGER,
    },
    is_public_holiday: {
      type: DataTypes.BOOLEAN,
      default: false,
    },
    holiday_calendar_id: {
      type: DataTypes.INTEGER,
    },
    is_weekend: {
      type: DataTypes.BOOLEAN,
      default: false,
    },
    total_hours: {
      type: DataTypes.DECIMAL(10, 2),
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
    day_name: {
      type: DataTypes.VIRTUAL,
      get() {
        const date = this.getDataValue("date");
        const day_of_week = this.getDataValue("day_of_week");

        if (!date || day_of_week === null || day_of_week === undefined) {
          return null;
        }

        const dayName = moment(date).format("dddd");

        return dayName;
      },
    },
    total_working_hours_in_decimal: {
      type: DataTypes.VIRTUAL,
      get() {
        const tasks = this.getDataValue("tasks");
        if (!tasks) return null;

        let sum = 0;

        tasks.forEach((task) => {
          if (!task.is_break && !task.is_travel) {
            sum += task.total_hours ? parseFloat(task.total_hours) : 0;
          }
        });

        return sum;
      },
    },
    total_working_hours: {
      type: DataTypes.VIRTUAL,
      get() {
        const tasks = this.getDataValue("tasks");
        if (!tasks) return null;

        let sum = 0;

        tasks.forEach((task) => {
          if (!task.is_break && !task.is_travel) {
            sum += task.total_hours ? parseFloat(task.total_hours) : 0;
          }
        });

        return toHM(sum);
      },
    },
    total_travel_hours: {
      type: DataTypes.VIRTUAL,
      get() {
        const tasks = this.getDataValue("tasks");
        if (!tasks) return null;

        let sum = 0;

        tasks.forEach((task) => {
          if (task.is_travel && !task.is_break) {
            sum += task.total_hours ? parseFloat(task.total_hours) : 0;
          }
        });

        return toHM(sum);
      },
    },
    total_break_hours: {
      type: DataTypes.VIRTUAL,
      get() {
        const tasks = this.getDataValue("tasks");
        if (!tasks) return null;

        let sum = 0;

        tasks.forEach((task) => {
          if (task.is_break && !task.is_travel) {
            sum += task.total_hours ? parseFloat(task.total_hours) : 0;
          }
        });

        return toHM(sum);
      },
    },
  },
  {
    tableName: "timesheet_days", // Table name should be in lowercase and plural
    timestamps: false,
  }
);

// -----------------------------
//   ASSOCIATIONS
// -----------------------------
TimesheetDays.associate = (models) => {
  models.TimesheetDays.hasMany(models.TimesheetDayTasks, {
    foreignKey: "timesheet_day_id",
    as: "tasks",
  });
  models.TimesheetDays.belongsTo(models.Timesheets, {
    foreignKey: "timesheet_id",
    as: "timesheet",
  });
  models.TimesheetDays.hasMany(models.TimesheetActivityLogs, {
    foreignKey: "timesheet_day_id",
    sourceKey: "id",
    as: "tracking_logs",
    constraints: false,
  });
  models.TimesheetDays.belongsTo(models.HolidayCalendars, {
    foreignKey: "holiday_calendar_id",
    as: "holiday",
  });
};

// -----------------------------
//   GLOBAL HELPERS (one-time only)
// -----------------------------
const toHM = (decimalVal) => {
  if (decimalVal !== 0) {
    const minutes = Math.round(decimalVal * 60);
    const h = Math.floor(minutes / 60);
    const m = minutes % 60;
    if (h === 0 && m === 0) {
      return null;
    }
    return `${h}h ${m}m`;
  }
  return null;
};

export default TimesheetDays;
