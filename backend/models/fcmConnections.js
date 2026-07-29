import { DataTypes } from "sequelize";
import { mysheet } from "../database.js";

const FcmConnections = mysheet.define(
  "FcmConnections",
  {
    id: {
      type: DataTypes.INTEGER,
      primaryKey: true,
      autoIncrement: true,
    },
    user_id: {
      type: DataTypes.INTEGER,
    },
    token: {
      type: DataTypes.STRING,
    },
    platform: {
      type: DataTypes.STRING,
    },
    created_at: {
      type: DataTypes.DATE,
    },
    last_updated_at: {
      type: DataTypes.DATE,
    },
  },
  {
    tableName: "fcm_connections", // Table name should be in lowercase and plural
    timestamps: false,
  }
);

export default FcmConnections;
