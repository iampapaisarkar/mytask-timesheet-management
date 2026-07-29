import { DataTypes } from "sequelize";
import { db } from "../database.js";

const AwardRateRuleRates = db.define(
  "AwardRateRuleRates",
  {
    id: {
      type: DataTypes.INTEGER,
      primaryKey: true,
      autoIncrement: true,
    },
    name: {
      type: DataTypes.STRING,
    },
    type: {
      type: DataTypes.STRING,
    },
    value: {
      type: DataTypes.DECIMAL(6, 2),
    },
  },
  {
    tableName: "award_rate_rule_rates", // Table name should be in lowercase and plural
    timestamps: false,
  }
);

export default AwardRateRuleRates;
