import { DataTypes } from "sequelize";
import { mysheet } from "../database.js";

const AwardRateRuleThen = mysheet.define(
  "AwardRateRuleThen",
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
    award_rate_if_id: {
      type: DataTypes.INTEGER,
    },
    earning_rate_id: {
      type: DataTypes.INTEGER,
    },
  },
  {
    tableName: "award_rate_rule_then", // Table name should be in lowercase and plural
    timestamps: false,
  },
);

// -----------------------------
//   ASSOCIATIONS
// -----------------------------
AwardRateRuleThen.associate = (models) => {
  models.AwardRateRuleThen.belongsTo(models.EarningRates, {
    foreignKey: "earning_rate_id",
    as: "rate",
  });
};

export default AwardRateRuleThen;
