import { DataTypes } from "sequelize";
import { mysheet } from "../database.js";

const UserTimezones = mysheet.define(
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
