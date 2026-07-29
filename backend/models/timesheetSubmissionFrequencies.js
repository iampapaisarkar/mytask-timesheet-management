import { DataTypes } from "sequelize";
import { mysheet } from "../database.js";

const TimesheetSubmissionFrequencies = mysheet.define(
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
