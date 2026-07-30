import { DataTypes } from "sequelize";
import { db } from "../database.js";

const TimesheetJobs = db.define(
  "TimesheetJobs",
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
    timesheet_id: {
      type: DataTypes.INTEGER,
      allowNull: false,
    },
    job_id: {
      type: DataTypes.INTEGER,
      allowNull: false,
    },
  },
  {
    tableName: "timesheet_jobs",
    timestamps: false,
  },
);

TimesheetJobs.associate = (models) => {
  TimesheetJobs.belongsTo(models.Timesheets, {
    foreignKey: "timesheet_id",
    as: "timesheet",
  });
  TimesheetJobs.belongsTo(models.Jobs, {
    foreignKey: "job_id",
    as: "job",
  });
};

export default TimesheetJobs;
