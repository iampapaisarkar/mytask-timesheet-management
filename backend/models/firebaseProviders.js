import { DataTypes } from "sequelize";
import { db } from "../database.js";

const FirebaseProviders = db.define(
  "FirebaseProviders",
  {
    id: {
      type: DataTypes.INTEGER,
      primaryKey: true,
      autoIncrement: true,
    },
    user_id: {
      type: DataTypes.INTEGER,
    },
    provider_id: {
      type: DataTypes.STRING,
    },
    uid: {
      type: DataTypes.STRING,
    },
    photo_url: {
      type: DataTypes.TEXT,
      allowNull: true,
    },
  },
  {
    tableName: "firebase_providers", // Table name should be in lowercase and plural
    timestamps: false,
  }
);

export default FirebaseProviders;
