import { DataTypes } from "sequelize";
import { mysheet } from "../database.js";

const GeofenceEvents = mysheet.define(
  "GeofenceEvents",
  {
    id: {
      type: DataTypes.INTEGER,
      primaryKey: true,
      autoIncrement: true,
    },
    organisation_id: {
      type: DataTypes.INTEGER,
    },
    user_id: {
      type: DataTypes.INTEGER,
    },
    timesheet_activity_log_id: {
      type: DataTypes.INTEGER,
    },
    job_id: {
      type: DataTypes.INTEGER,
    },
    action: {
      type: DataTypes.STRING,
    },
    track_at: {
      type: DataTypes.DATE,
    },
  },
  {
    tableName: "geofence_events", // Table name should be in lowercase and plural
    timestamps: false,
  }
);

// -----------------------------
//   ASSOCIATIONS
// -----------------------------
GeofenceEvents.associate = (models) => {
  GeofenceEvents.belongsTo(models.TimesheetActivityLogs, {
    foreignKey: "timesheet_activity_log_id",
    as: "activity_log",
  });
  models.GeofenceEvents.belongsTo(models.Jobs, {
    foreignKey: "job_id",
    as: "job",
  });
};

export default GeofenceEvents;
