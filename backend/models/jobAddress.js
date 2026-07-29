import { DataTypes } from "sequelize";
import { db } from "../database.js";

const JobAddress = db.define(
  "JobAddress",
  {
    id: {
      type: DataTypes.INTEGER,
      primaryKey: true,
      autoIncrement: true,
    },
    organisation_id: {
      type: DataTypes.INTEGER,
    },
    job_id: {
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
      type: DataTypes.STRING(32),
    },
    latitude: {
      type: DataTypes.DECIMAL(17, 14),
    },
    longitude: {
      type: DataTypes.DECIMAL(17, 14),
    },
  },
  {
    tableName: "job_address", // Table name should be in lowercase and plural
    timestamps: false,
  },
);

// -----------------------------
//   ASSOCIATIONS
// -----------------------------
JobAddress.associate = (models) => {
  JobAddress.belongsTo(models.States, {
    foreignKey: "state_id",
    as: "state",
  });
};

export default JobAddress;
