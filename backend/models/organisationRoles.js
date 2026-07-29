import { DataTypes } from "sequelize";
import { mysheet } from "../database.js";

const OrganisationRoles = mysheet.define(
  "OrganisationRoles",
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
    tableName: "organisation_roles", // Table name should be in lowercase and plural
    timestamps: false,
  },
);

export default OrganisationRoles;
