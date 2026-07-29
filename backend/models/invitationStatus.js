import { DataTypes } from "sequelize";
import { db } from "../database.js";

const InvitationStatus = db.define(
  "InvitationStatus",
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
    tableName: "invitation_status", // Table name should be in lowercase and plural
    timestamps: false,
  }
);

export default InvitationStatus;
