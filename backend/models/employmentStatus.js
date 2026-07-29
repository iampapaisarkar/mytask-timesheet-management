import { DataTypes } from "sequelize";
import { db } from "../database.js";

const EmploymentStatus = db.define(
  "EmploymentStatus",
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
    tableName: "employment_status", // Table name should be in lowercase and plural
    timestamps: false,
  }
);

export default EmploymentStatus;
