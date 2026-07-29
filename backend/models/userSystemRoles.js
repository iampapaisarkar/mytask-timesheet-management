import { DataTypes } from "sequelize";
import { db } from "../database.js";

const UserSystemRoles = db.define(
  "UserSystemRoles",
  {
    id: {
      type: DataTypes.INTEGER,
      primaryKey: true,
      autoIncrement: true,
    },
    user_id: {
      type: DataTypes.INTEGER,
    },
    role_id: {
      type: DataTypes.INTEGER,
    },
  },
  {
    tableName: "user_system_roles", // Table name should be in lowercase and plural
    timestamps: false,
  }
);

export default UserSystemRoles;
