import { DataTypes } from "sequelize";
import { db } from "../database.js";

const HolidayCalendars = db.define(
  "HolidayCalendars",
  {
    id: {
      type: DataTypes.INTEGER,
      primaryKey: true,
      autoIncrement: true,
    },
    organisation_id: {
      type: DataTypes.INTEGER,
    },
    name: {
      type: DataTypes.STRING,
    },
    date: {
      type: DataTypes.DATEONLY,
    },
    created_at: {
      type: DataTypes.DATE,
      field: "created_at",
    },
    created_by: {
      type: DataTypes.INTEGER,
    },
    updated_at: {
      type: DataTypes.DATE,
      field: "updated_at",
    },
    updated_by: {
      type: DataTypes.INTEGER,
    },
  },
  {
    tableName: "holiday_calendars", // Table name should be in lowercase and plural
    timestamps: false,
  }
);

HolidayCalendars.associate = () => {};

export default HolidayCalendars;
