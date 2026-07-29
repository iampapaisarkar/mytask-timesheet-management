import { DataTypes } from "sequelize";
import { db } from "../database.js";

const States = db.define(
  "States",
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
    tableName: "states", // Table name should be in lowercase and plural
    timestamps: false,
  }
);

export default States;
