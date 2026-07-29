import { DataTypes } from "sequelize";
import { mysheet } from "../database.js";

const AwardRateRuleFieldTypes = mysheet.define(
  "AwardRateRuleFieldTypes",
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
    tableName: "award_rate_rule_field_types", // Table name should be in lowercase and plural
    timestamps: false,
  }
);

export default AwardRateRuleFieldTypes;
