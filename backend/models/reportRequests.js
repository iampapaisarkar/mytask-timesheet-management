import { DataTypes } from "sequelize";
import { db } from "../database.js";

const ReportRequests = db.define(
  "ReportRequests",
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
    requested_by: {
      type: DataTypes.INTEGER,
      allowNull: false,
    },
    type: {
      type: DataTypes.STRING(64),
      allowNull: false,
      defaultValue: "hours_activity",
    },
    status: {
      type: DataTypes.STRING(32),
      allowNull: false,
      defaultValue: "pending",
    },
    name: {
      type: DataTypes.STRING(255),
      allowNull: true,
    },
    filters: {
      type: DataTypes.JSON,
      allowNull: true,
    },
    progress: {
      type: DataTypes.INTEGER,
      allowNull: true,
    },
    error_message: {
      type: DataTypes.TEXT,
      allowNull: true,
    },
    result_json: {
      type: DataTypes.TEXT("long"),
      allowNull: true,
    },
    artifact_path: {
      type: DataTypes.STRING(512),
      allowNull: true,
    },
    artifact_mime: {
      type: DataTypes.STRING(128),
      allowNull: true,
    },
    started_at: {
      type: DataTypes.DATE,
      allowNull: true,
    },
    completed_at: {
      type: DataTypes.DATE,
      allowNull: true,
    },
    created_at: {
      type: DataTypes.DATE,
      field: "created_at",
    },
    updated_at: {
      type: DataTypes.DATE,
      field: "updated_at",
    },
  },
  {
    tableName: "report_requests",
    timestamps: false,
  },
);

ReportRequests.associate = (models) => {
  ReportRequests.belongsTo(models.Organisations, {
    foreignKey: "organisation_id",
    as: "organisation",
  });
  ReportRequests.belongsTo(models.Users, {
    foreignKey: "requested_by",
    as: "requester",
  });
};

export default ReportRequests;
