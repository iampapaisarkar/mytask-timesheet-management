import { DataTypes } from "sequelize";
import { mysheet } from "../database.js";

const AwardRateRuleComparators = mysheet.define(
  "AwardRateRuleComparators",
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
    tableName: "award_rate_rule_comparators", // Table name should be in lowercase and plural
    timestamps: false,
  }
);

export default AwardRateRuleComparators;
