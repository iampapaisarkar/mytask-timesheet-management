import { DataTypes } from "sequelize";
import { mysheet } from "../database.js";

const States = mysheet.define(
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
