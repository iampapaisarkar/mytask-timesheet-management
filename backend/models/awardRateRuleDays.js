import { DataTypes } from "sequelize";
import { mysheet } from "../database.js";

const AwardRateRuleDays = mysheet.define(
  "AwardRateRuleDays",
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
    locked: {
      type: DataTypes.BOOLEAN,
    },
    show_default: {
      type: DataTypes.BOOLEAN,
    },
  },
  {
    tableName: "award_rate_rule_days", // Table name should be in lowercase and plural
    timestamps: false,
  },
);

export default AwardRateRuleDays;
