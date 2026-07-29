import { DataTypes } from "sequelize";
import { db } from "../database.js";

const AwardRates = db.define(
  "AwardRates",
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
    created_at: {
      type: DataTypes.DATE,
      field: "created_at",
    },
    created_by: {
      type: DataTypes.INTEGER,
    },
    updated_at: {
      type: DataTypes.DATE,
      field: "updated_at",
    },
    updated_by: {
      type: DataTypes.INTEGER,
    },
    push_to_xero: {
      type: DataTypes.VIRTUAL,
      get() {
        return true;
      },
    },
  },
  {
    tableName: "award_rates", // Table name should be in lowercase and plural
    timestamps: false,
  },
);

// -----------------------------
//   ASSOCIATIONS
// -----------------------------
AwardRates.associate = (models) => {
  models.AwardRates.hasOne(models.AwardRateSettings, {
    foreignKey: "award_rate_id",
    as: "settings",
  });
  models.AwardRates.hasMany(models.AwardRateRules, {
    foreignKey: "award_rate_id",
    as: "rules",
  });
};

export default AwardRates;
