import { DataTypes } from "sequelize";
import { db } from "../database.js";

const LeaveCategories = db.define(
  "LeaveCategories",
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
    tableName: "leave_categories", // Table name should be in lowercase and plural
    timestamps: false,
  }
);

export default LeaveCategories;
