import { DataTypes } from "sequelize";
import { mysheet } from "../database.js";

const OrganisationAddress = mysheet.define(
  "OrganisationAddress",
  {
    id: {
      type: DataTypes.INTEGER,
      primaryKey: true,
      autoIncrement: true,
    },
    organisation_id: {
      type: DataTypes.INTEGER,
    },
    address_1: {
      type: DataTypes.TEXT,
    },
    address_2: {
      type: DataTypes.TEXT,
    },
    city: {
      type: DataTypes.STRING,
    },
    state_id: {
      type: DataTypes.INTEGER,
    },
    postcode: {
      type: DataTypes.INTEGER,
    },
    latitude: {
      type: DataTypes.DECIMAL(17, 14),
    },
    longitude: {
      type: DataTypes.DECIMAL(17, 14),
    },
  },
  {
    tableName: "organisation_address", // Table name should be in lowercase and plural
    timestamps: false,
  },
);

// -----------------------------
//   ASSOCIATIONS
// -----------------------------
OrganisationAddress.associate = (models) => {
  OrganisationAddress.belongsTo(models.States, {
    foreignKey: "state_id",
    as: "state",
  });
};

export default OrganisationAddress;
