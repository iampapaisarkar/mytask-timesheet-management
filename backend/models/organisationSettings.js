import { DataTypes } from "sequelize";
import { mysheet } from "../database.js";

const OrganisationSettings = mysheet.define(
  "OrganisationSettings",
  {
    id: {
      type: DataTypes.INTEGER,
      primaryKey: true,
      autoIncrement: true,
    },
    organisation_id: {
      type: DataTypes.INTEGER,
    },
    key: {
      type: DataTypes.TEXT,
    },
    value: {
      type: DataTypes.JSON,
    },
  },
  {
    tableName: "organisation_settings", // Table name should be in lowercase and plural
    timestamps: false,
  }
);

export default OrganisationSettings;
