import { DataTypes } from "sequelize";
import { db } from "../database.js";

const AwardRateRuleComparators = db.define(
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
