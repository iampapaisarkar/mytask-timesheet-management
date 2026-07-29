import { DataTypes } from "sequelize";
import { db } from "../database.js";

const AwardRateSettings = db.define(
  "AwardRateSettings",
  {
    id: {
      type: DataTypes.INTEGER,
      primaryKey: true,
      autoIncrement: true,
    },
    organisation_id: {
      type: DataTypes.INTEGER,
    },
    award_rate_id: {
      type: DataTypes.INTEGER,
    },
    rounding_interval_id: {
      type: DataTypes.INTEGER,
    },
    rounding_up_by: {
      type: DataTypes.INTEGER,
    },
    rounding_down_by: {
      type: DataTypes.INTEGER,
    },
  },
  {
    tableName: "award_rate_settings", // Table name should be in lowercase and plural
    timestamps: false,
  }
);

// -----------------------------
//   ASSOCIATIONS
// -----------------------------
AwardRateSettings.associate = (models) => {
  models.AwardRateSettings.belongsTo(models.RoundingIntervals, {
    foreignKey: "rounding_interval_id",
    as: "rounding_interval",
  });
};

export default AwardRateSettings;
