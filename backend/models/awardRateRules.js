import { DataTypes } from "sequelize";
import { db } from "../database.js";

const AwardRateRules = db.define(
  "AwardRateRules",
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
  },
  {
    tableName: "award_rate_rules", // Table name should be in lowercase and plural
    timestamps: false,
  },
);

// -----------------------------
//   ASSOCIATIONS
// -----------------------------
AwardRateRules.associate = (models) => {
  models.AwardRateRules.belongsToMany(models.AwardRateRuleDays, {
    through: models.AwardRateRuleDayRelations,
    as: "days",
    foreignKey: "award_rate_rule_id",
    otherKey: "award_rate_day_id",
  });
  models.AwardRateRules.hasMany(models.AwardRateRuleIfs, {
    foreignKey: "award_rate_rule_id",
    as: "if",
  });
};

export default AwardRateRules;
