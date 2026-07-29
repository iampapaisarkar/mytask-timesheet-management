import { DataTypes } from "sequelize";
import { mysheet } from "../database.js";

const XeroConnections = mysheet.define(
  "XeroConnections",
  {
    id: {
      type: DataTypes.INTEGER,
      primaryKey: true,
      autoIncrement: true,
    },
    organisation_id: {
      type: DataTypes.INTEGER,
    },
    connection_id: {
      type: DataTypes.STRING,
    },
    tenant_id: {
      type: DataTypes.UUID,
    },
    access_token: {
      type: DataTypes.TEXT,
    },
    refresh_token: {
      type: DataTypes.TEXT,
    },
    expires_at: {
      type: DataTypes.DATE,
    },
    created_at: {
      type: DataTypes.DATE,
      field: "created_at",
    },
    created_by: {
      type: DataTypes.INTEGER,
    },
  },
  {
    tableName: "xero_connections", // Table name should be in lowercase and plural
    timestamps: false,
  }
);

export default XeroConnections;
