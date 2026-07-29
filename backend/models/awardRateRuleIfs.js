import { DataTypes } from "sequelize";
import { db } from "../database.js";

const AwardRateRuleIfs = db.define(
  "AwardRateRuleIfs",
  {
    id: {
      type: DataTypes.INTEGER,
      primaryKey: true,
      autoIncrement: true,
    },
    organisation_id: {
      type: DataTypes.INTEGER,
    },
    award_rate_rule_id: {
      type: DataTypes.INTEGER,
    },
    award_rate_field_id: {
      type: DataTypes.INTEGER,
    },
    award_rate_comparison_id: {
      type: DataTypes.INTEGER,
    },
    value: {
      type: DataTypes.STRING,
    },
    from: {
      type: DataTypes.STRING,
    },
    to: {
      type: DataTypes.STRING,
    },
  },
  {
    tableName: "award_rate_rule_ifs", // Table name should be in lowercase and plural
    timestamps: false,
  },
);

// -----------------------------
//   ASSOCIATIONS
// -----------------------------
AwardRateRuleIfs.associate = (models) => {
  models.AwardRateRuleIfs.belongsTo(models.AwardRateRuleFields, {
    foreignKey: "award_rate_field_id",
    as: "field",
  });
  models.AwardRateRuleIfs.belongsTo(models.AwardRateRuleComparators, {
    foreignKey: "award_rate_comparison_id",
    as: "comparison",
  });
  models.AwardRateRuleIfs.hasOne(models.AwardRateRuleThen, {
    foreignKey: "award_rate_if_id",
    as: "then",
  });
};

export default AwardRateRuleIfs;
