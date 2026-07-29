import { DataTypes } from "sequelize";
import { db } from "../database.js";

const Regions = db.define(
  "Regions",
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
    code: {
      type: DataTypes.STRING,
    },
    created_at: {
      type: DataTypes.DATE,
      field: "created_at",
    },
    updated_at: {
      type: DataTypes.DATE,
      field: "updated_at",
    },
  },
  {
    tableName: "regions", // Table name should be in lowercase and plural
    timestamps: false,
  }
);

// -----------------------------
//   ASSOCIATIONS
// -----------------------------
Regions.associate = (models) => {
  models.Regions.hasMany(models.HolidayCalendars, {
    foreignKey: "region_id",
    as: "holidays",
  });
};

export default Regions;
