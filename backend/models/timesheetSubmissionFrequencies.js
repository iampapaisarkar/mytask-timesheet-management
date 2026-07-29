import { DataTypes } from "sequelize";
import { db } from "../database.js";

const TimesheetSubmissionFrequencies = db.define(
  "TimesheetSubmissionFrequencies",
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
    tableName: "timesheet_submission_frequencies", // Table name should be in lowercase and plural
    timestamps: false,
  }
);

export default TimesheetSubmissionFrequencies;
