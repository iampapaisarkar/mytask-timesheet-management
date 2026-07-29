import { DataTypes } from "sequelize";
import { mysheet } from "../database.js";

const TimesheetTaskActivityPairs = mysheet.define(
  "TimesheetTaskActivityPairs",
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
    timesheet_day_task_id: {
      type: DataTypes.INTEGER,
    },
    timesheet_activity_log_start_id: {
      type: DataTypes.INTEGER,
    },
    timesheet_activity_log_end_id: {
      type: DataTypes.INTEGER,
    },
  },
  {
    tableName: "timesheet_task_activity_pairs", // Table name should be in lowercase and plural
    timestamps: false,
  }
);

// -----------------------------
//   ASSOCIATIONS
// -----------------------------
TimesheetTaskActivityPairs.associate = (models) => {
  models.TimesheetTaskActivityPairs.belongsTo(models.TimesheetActivityLogs, {
    foreignKey: "timesheet_activity_log_start_id",
    as: "start",
  });
  models.TimesheetTaskActivityPairs.belongsTo(models.TimesheetActivityLogs, {
    foreignKey: "timesheet_activity_log_end_id",
    as: "end",
  });
};

export default TimesheetTaskActivityPairs;
