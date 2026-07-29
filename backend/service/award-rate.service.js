import { fn, col, literal, Op } from "sequelize";
import models from "../models/index.js";
const {
  AwardRateSettings,
  AwardRateRules,
  AwardRateRuleDayRelations,
  AwardRateRuleIfs,
  AwardRateRuleThen,
  EarningRates,
} = models;
import moment from "moment";

class AppError extends Error {
  constructor(message, statusCode = 400) {
    super(message);
    this.statusCode = statusCode;
    this.isOperational = true;
  }
}

function validateAwardRateInput({ name, settings, rules }) {
  if (!name) throw new AppError("Name is required!", 400);
  if (!settings) throw new AppError("Settings is required!", 400);
  if (!rules) throw new AppError("Rules are required!", 400);
}

async function processEarningRates({
  earning_rates,
  rules,
  organisation,
  user,
  transaction,
}) {
  const currentUTCTime = moment().utc().format();

  if (!Array.isArray(earning_rates) || earning_rates.length === 0) return rules;

  for (const rate of earning_rates) {
    let earningRate = await EarningRates.findOne({
      where: { id: rate?.id, organisation_id: organisation.id },
      transaction,
    });

    if (earningRate) {
      earningRate.name = rate.name;
      earningRate.rate = rate.rate;
      earningRate.updated_at = currentUTCTime;
      earningRate.updated_by = user.id;

      earningRate = await earningRate.save({ transaction });
    } else {
      earningRate = await EarningRates.create(
        {
          name: rate.name,
          rate: rate.rate,
          organisation_id: organisation.id,
          created_at: currentUTCTime,
          created_by: user.id,
          updated_at: currentUTCTime,
          updated_by: user.id,
        },
        { transaction },
      );
    }

    // Replace rate refs inside current rules
    for (const ruleDay of rules) {
      for (const ifx of ruleDay?.if || []) {
        if (Number(ifx?.then?.rate?.id) === Number(rate.id)) {
          ifx.then.rate = earningRate;
        }
      }
    }
  }

  return rules;
}

async function createAwardRateSettings({
  organisation,
  awardRateId,
  settings,
  transaction,
}) {
  return AwardRateSettings.create(
    {
      organisation_id: organisation.id,
      award_rate_id: awardRateId,
      rounding_interval_id: settings?.rounding_interval?.id,
      rounding_up_by: settings?.rounding_up_by,
      rounding_down_by: settings?.rounding_down_by,
    },
    { transaction },
  );
}

async function createAwardRateRules({
  organisation,
  awardRateId,
  rules,
  transaction,
}) {
  if (Array.isArray(rules) && rules.length) {
    if (awardRateId) {
      await AwardRateRules.destroy({
        where: {
          organisation_id: organisation.id,
          award_rate_id: awardRateId,
        },
        transaction,
      });
    }
    for (const rule of rules) {
      // Destroy old rules if award rate rule id
      if (rule?.id) {
        await AwardRateRuleDayRelations.destroy({
          where: {
            organisation_id: organisation.id,
            award_rate_rule_id: rule?.id,
          },
          transaction,
        });
        await AwardRateRuleIfs.destroy({
          where: {
            organisation_id: organisation.id,
            award_rate_rule_id: rule?.id,
          },
          transaction,
        });
        await AwardRateRuleThen.destroy({
          where: {
            organisation_id: organisation.id,
            award_rate_rule_id: rule?.id,
          },
          transaction,
        });
      }
      const awardRateRule = await AwardRateRules.create(
        {
          organisation_id: organisation.id,
          award_rate_id: awardRateId,
        },
        { transaction },
      );

      for (const day of rule.days ?? []) {
        await AwardRateRuleDayRelations.create(
          {
            organisation_id: organisation.id,
            award_rate_rule_id: awardRateRule.id,
            award_rate_day_id: day.id,
          },
          { transaction },
        );
      }

      for (const ifx of rule.if ?? []) {
        const awardRateRuleIf = await AwardRateRuleIfs.create(
          {
            organisation_id: organisation.id,
            award_rate_rule_id: awardRateRule.id,
            award_rate_field_id: ifx.field.id,
            award_rate_comparison_id: ifx.comparison.id,
            value: ifx.value ?? null,
            from: ifx.from ?? null,
            to: ifx.to ?? null,
          },
          { transaction },
        );

        await AwardRateRuleThen.create(
          {
            organisation_id: organisation.id,
            award_rate_rule_id: awardRateRule.id,
            award_rate_if_id: awardRateRuleIf.id,
            earning_rate_id: ifx.then.rate.id,
          },
          { transaction },
        );
      }
    }
  }
  return true;
}

export default {
  validateAwardRateInput,
  processEarningRates,
  createAwardRateSettings,
  createAwardRateRules,
};
