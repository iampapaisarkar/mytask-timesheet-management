import { DataTypes } from "sequelize";
import { db } from "../database.js";

const TimesheetDayStatus = db.define(
  "TimesheetDayStatus",
  {
    id: {
      type: DataTypes.INTEGER,
      primaryKey: true,
      autoIncrement: true,
    },
    name: {
      type: DataTypes.STRING,
    },
    code: {
      type: DataTypes.STRING,
    },
  },
  {
    tableName: "timesheet_day_status", // Table name should be in lowercase and plural
    timestamps: false,
  }
);

// -----------------------------
//   ASSOCIATIONS
// -----------------------------
TimesheetDayStatus.associate = (models) => {
  models.TimesheetDayStatus.hasMany(models.TimesheetDays, {
    foreignKey: "status_id",
    as: "days",
  });
};

export default TimesheetDayStatus;
