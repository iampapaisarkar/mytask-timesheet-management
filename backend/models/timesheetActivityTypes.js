import { DataTypes } from "sequelize";
import { db } from "../database.js";

const TimesheetActivityTypes = db.define(
  "TimesheetActivityTypes",
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
    tableName: "timesheet_activity_types", // Table name should be in lowercase and plural
    timestamps: false,
  }
);

export default TimesheetActivityTypes;
