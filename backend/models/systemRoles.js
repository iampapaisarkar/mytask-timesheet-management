import { DataTypes } from "sequelize";
import { mysheet } from "../database.js";

const SystemRoles = mysheet.define(
  "SystemRoles",
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
    tableName: "system_roles", // Table name should be in lowercase and plural
    timestamps: false,
  }
);

// -----------------------------
//   ASSOCIATIONS
// -----------------------------
SystemRoles.associate = (models) => {
  models.SystemRoles.hasOne(models.UserSystemRoles, {
    foreignKey: "role_id",
    as: "user_system_roles",
  });
};

export default SystemRoles;
