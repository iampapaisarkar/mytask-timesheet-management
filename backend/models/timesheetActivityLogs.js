import { DataTypes } from "sequelize";
import { db } from "../database.js";

const TimesheetActivityLogs = db.define(
  "TimesheetActivityLogs",
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
    timesheet_day_id: {
      type: DataTypes.INTEGER,
    },
    latitude: {
      type: DataTypes.DECIMAL(17, 14),
    },
    longitude: {
      type: DataTypes.DECIMAL(17, 14),
    },
    start_at: {
      type: DataTypes.DATE,
    },
    end_at: {
      type: DataTypes.DATE,
    },
    type_id: {
      type: DataTypes.INTEGER,
    },
    track_at: {
      type: DataTypes.DATE,
      field: "track_at",
    },
  },
  {
    tableName: "timesheet_activity_logs", // Table name should be in lowercase and plural
    timestamps: false,
  }
);

// -----------------------------
//   ASSOCIATIONS
// -----------------------------
TimesheetActivityLogs.associate = (models) => {
  models.TimesheetActivityLogs.belongsTo(models.TimesheetActivityTypes, {
    foreignKey: "type_id",
    as: "type",
  });
  models.TimesheetActivityLogs.belongsTo(models.Users, {
    foreignKey: "user_id",
    as: "user",
  });
  models.TimesheetActivityLogs.hasOne(models.GeofenceEvents, {
    foreignKey: "timesheet_activity_log_id",
    as: "geofence",
  });
};

export default TimesheetActivityLogs;
