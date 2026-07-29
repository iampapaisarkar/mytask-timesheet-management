import { DataTypes } from "sequelize";
import { mysheet } from "../database.js";

const TimesheetStatus = mysheet.define(
  "TimesheetStatus",
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
    tableName: "timesheet_status", // Table name should be in lowercase and plural
    timestamps: false,
  }
);

export default TimesheetStatus;
