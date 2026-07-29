import { DataTypes } from "sequelize";
import { db } from "../database.js";

const RoundingIntervals = db.define(
  "RoundingIntervals",
  {
    id: {
      type: DataTypes.INTEGER,
      primaryKey: true,
      autoIncrement: true,
    },
    name: {
      type: DataTypes.STRING,
    },
    value: {
      type: DataTypes.INTEGER,
    },
  },
  {
    tableName: "rounding_intervals", // Table name should be in lowercase and plural
    timestamps: false,
  }
);

export default RoundingIntervals;
