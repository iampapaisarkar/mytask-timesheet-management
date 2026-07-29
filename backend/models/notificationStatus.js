import { DataTypes } from "sequelize";
import { mysheet } from "../database.js";

const NotificationStatus = mysheet.define(
  "NotificationStatus",
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
    tableName: "notification_status", // Table name should be in lowercase and plural
    timestamps: false,
  }
);

export default NotificationStatus;
