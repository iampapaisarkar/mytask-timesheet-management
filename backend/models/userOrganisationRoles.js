import { DataTypes } from "sequelize";
import { db } from "../database.js";

const UserOrganisationRoles = db.define(
  "UserOrganisationRoles",
  {
    id: {
      type: DataTypes.INTEGER,
      primaryKey: true,
      autoIncrement: true,
    },
    organisation_id: {
      type: DataTypes.INTEGER,
    },
    user_id: {
      type: DataTypes.INTEGER,
    },
    role_id: {
      type: DataTypes.INTEGER,
    },
  },
  {
    tableName: "user_organisation_roles", // Table name should be in lowercase and plural
    timestamps: false,
  },
);

// -----------------------------
//   ASSOCIATIONS
// -----------------------------
UserOrganisationRoles.associate = (models) => {
  models.UserOrganisationRoles.belongsTo(models.Users, {
    foreignKey: "user_id",
    as: "user",
  });
  models.UserOrganisationRoles.belongsTo(models.OrganisationRoles, {
    foreignKey: "role_id",
    as: "role",
  });
};

export default UserOrganisationRoles;
