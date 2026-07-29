import { DataTypes } from "sequelize";
import { db } from "../database.js";

const UserTimezones = db.define(
  "UserTimezones",
  {
    id: {
      type: DataTypes.INTEGER,
      primaryKey: true,
      autoIncrement: true,
    },
    user_id: {
      type: DataTypes.INTEGER,
    },
    timezone: {
      type: DataTypes.STRING,
    },
  },
  {
    tableName: "user_timezones", // Table name should be in lowercase and plural
    timestamps: false,
  }
);

export default UserTimezones;
