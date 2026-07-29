import { DataTypes } from "sequelize";
import { db } from "../database.js";

const EarningRateTypes = db.define(
  "EarningRateTypes",
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
    rate_type: {
      type: DataTypes.STRING,
    },
  },
  {
    tableName: "earning_rate_types", // Table name should be in lowercase and plural
    timestamps: false,
  }
);

export default EarningRateTypes;
