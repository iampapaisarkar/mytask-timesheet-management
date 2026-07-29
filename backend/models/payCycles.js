import { DataTypes } from "sequelize";
import { db } from "../database.js";

const PayCycles = db.define(
  "PayCycles",
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
    tableName: "pay_cycles", // Table name should be in lowercase and plural
    timestamps: false,
  }
);

export default PayCycles;
