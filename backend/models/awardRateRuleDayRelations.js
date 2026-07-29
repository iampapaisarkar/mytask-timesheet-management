import { DataTypes } from "sequelize";
import { mysheet } from "../database.js";

const AwardRateRuleDayRelations = mysheet.define(
  "AwardRateRuleDayRelations",
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
    award_rate_day_id: {
      type: DataTypes.INTEGER,
    },
  },
  {
    tableName: "award_rate_rule_day_relations", // Table name should be in lowercase and plural
    timestamps: false,
  },
);

export default AwardRateRuleDayRelations;
