import { DataTypes } from "sequelize";
import { db } from "../database.js";

const ExternalApiCallLogs = db.define(
  "ExternalApiCallLogs",
  {
    id: {
      type: DataTypes.INTEGER,
      primaryKey: true,
      autoIncrement: true,
    },
    orgnisaion_id: {
      type: DataTypes.INTEGER,
    },
    user_id: {
      type: DataTypes.INTEGER,
    },
    platform: {
      type: DataTypes.STRING,
    },
    url: {
      type: DataTypes.STRING,
    },
    method: {
      type: DataTypes.STRING,
    },
    body: {
      type: DataTypes.JSON,
    },
    content_type: {
      type: DataTypes.STRING,
    },
    response: {
      type: DataTypes.JSON,
    },
    executed_at: {
      type: DataTypes.DATE,
    },
  },
  {
    tableName: "external_api_call_logs", // Table name should be in lowercase and plural
    timestamps: false,
  }
);

export default ExternalApiCallLogs;
