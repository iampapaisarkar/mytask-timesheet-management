// award-rate-rule-fields.model.js
import { DataTypes, Op } from "sequelize";
import { db } from "../database.js";
import AwardRateRuleComparators from "./awardRateRuleComparators.js";

/**
 * Async helper - returns an array of comparators for a given code.
 * Always returns an array (empty if none).
 */
async function getComparators(code) {
  try {
    if (
      code === "daily-hours" ||
      code === "weekly-ordinary-hours" ||
      code === "daily-break" ||
      code === "first-travel-trip-time" ||
      code === "last-travel-trip-time"
    ) {
      return await AwardRateRuleComparators.findAll({ raw: true });
    }

    if (code === "hour-time") {
      return await AwardRateRuleComparators.findAll({
        where: {
          code: {
            [Op.or]: ["between", "not-between"],
          },
        },
        raw: true,
      });
    }

    return [];
  } catch (err) {
    console.error("Error fetching comparators:", err);
    // Do not throw, return empty so hook doesn't break upstream logic
    return [];
  }
}

// Define model
const AwardRateRuleFields = db.define(
  "AwardRateRuleFields",
  {
    id: { type: DataTypes.INTEGER, primaryKey: true, autoIncrement: true },
    name: DataTypes.STRING,
    code: DataTypes.STRING,
    type_id: DataTypes.INTEGER,
    category: DataTypes.STRING,
    is_active: {
      type: DataTypes.BOOLEAN,
      default: true,
    },

    // We declare a VIRTUAL field so comparators appears in toJSON()
    comparators: {
      type: DataTypes.VIRTUAL,
      // no getter: we will set this value in afterFind hook
    },
  },
  {
    tableName: "award_rate_rule_fields",
    timestamps: false,

    // afterFind hook runs for findAll / findOne / findByPk (when raw: false)
    hooks: {
      afterFind: async (result, options) => {
        if (!result) return;

        // helper to populate one instance
        const populateOne = async (instance) => {
          // Only try if instance has dataValues / code
          if (!instance || !instance.dataValues) return;

          try {
            const code = instance.get("code");
            const comps = await getComparators(code);
            // setDataValue will attach to dataValues and include in toJSON()
            instance.setDataValue("comparators", comps);
          } catch (err) {
            // log and continue — don't break the whole request
            console.error("afterFind populate comparators error:", err);
            instance.setDataValue("comparators", []);
          }
        };

        // result can be an array or a single instance
        if (Array.isArray(result)) {
          // Many results
          await Promise.all(
            result.map(async (item) => {
              // sometimes includes can produce plain objects in result (rare),
              // check for model instances
              if (item && typeof item.setDataValue === "function") {
                await populateOne(item);
              }
            })
          );
        } else if (
          typeof result === "object" &&
          typeof result.setDataValue === "function"
        ) {
          // Single instance
          await populateOne(result);
        }
        // else: nothing to do (plain objects / raw results)
      },
    },
  }
);

// -----------------------------
//   ASSOCIATIONS
// -----------------------------
AwardRateRuleFields.associate = (models) => {
  models.AwardRateRuleFields.belongsTo(models.AwardRateRuleFieldTypes, {
    foreignKey: "type_id",
    as: "field_type",
  });
};

export default AwardRateRuleFields;
