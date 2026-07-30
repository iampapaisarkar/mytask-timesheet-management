import { fn, col, literal, Op } from "sequelize";
import models from "../models/index.js";
const {
  RoundingIntervals,
  AwardRates,
  AwardRateSettings,
  AwardRateRules,
  AwardRateRuleIfs,
  AwardRateRuleThen,
  AwardRateRuleDays,
  AwardRateRuleFields,
  AwardRateRuleComparators,
  AwardRateRuleFieldTypes,
  EarningRates,
} = models;
import moment from "moment";
import { db } from "../database.js";
import awardRateService from "../service/award-rate.service.js";

export async function list(req, res, next) {
  const { user, organisation } = req.body;
  let { rows_per_page, page_number, sort_by, sort_direction, search } =
    req.query;
  if (!organisation.acl.awardRate.list) {
    return res.status(403).json({
      message: "Access denied: You are not authorized to access this action.",
    });
  }
  try {
    const rowsPerPage = parseInt(rows_per_page) || 10;
    const pageNumber = parseInt(page_number) || 1;
    const offset = (pageNumber - 1) * rowsPerPage;
    const sortBy = sort_by || "id";
    const sortDirection = sort_direction || "asc";

    let whereCondition = {
      organisation_id: organisation.id,
    };

    if (search && search.trim() !== "") {
      whereCondition = {
        ...whereCondition,
        [Op.or]: [{ name: { [Op.like]: `%${search}%` } }],
      };
    }

    const { count, rows: awardRates } = await AwardRates.findAndCountAll({
      where: whereCondition,
      include: [
        {
          model: AwardRateSettings,
          as: "settings",
          include: [
            {
              model: RoundingIntervals,
              as: "rounding_interval",
            },
          ],
        },
        {
          model: AwardRateRules,
          as: "rules",
          include: [
            {
              model: AwardRateRuleDays,
              as: "days",
              through: { attributes: [] },
            },
            {
              model: AwardRateRuleIfs,
              as: "if",
              include: [
                {
                  model: AwardRateRuleFields,
                  as: "field",
                  include: [
                    {
                      model: AwardRateRuleFieldTypes,
                      as: "field_type",
                    },
                  ],
                },
                {
                  model: AwardRateRuleComparators,
                  as: "comparison",
                },
                {
                  model: AwardRateRuleThen,
                  as: "then",
                  include: [
                    {
                      model: EarningRates,
                      as: "rate",
                    },
                  ],
                },
              ],
            },
          ],
        },
      ],
      offset,
      limit: rowsPerPage,
      order: [[sortBy, sortDirection]],
      raw: false,
      nest: true,
    });

    const total_pages = Math.ceil(awardRates.length / rowsPerPage);

    return res.status(200).json({
      data: awardRates,
      pagination: {
        total_rows: awardRates.length,
        rows_per_page: rowsPerPage,
        page_number: pageNumber,
        total_pages,
        sort_by: sortBy,
        sort_direction: sortDirection,
      },
    });
  } catch (err) {
    console.error("Error fetching award rates:", err);
    return res.status(500).json({
      message: "Unable to fetch award rates",
      details: err.message,
    });
  }
}

export async function create(req, res) {
  const {
    user,
    organisation,
    name,
    settings,
    rules,
    earning_rates,
  } = req.body;

  if (!organisation.acl.awardRate.create) {
    return res.status(403).json({ message: "Access denied" });
  }

  const transaction = await db.transaction();

  try {
    awardRateService.validateAwardRateInput({ name, settings, rules });


    const currentUTCTime = moment().utc().format();

    const awardRate = await AwardRates.create(
      {
        organisation_id: organisation.id,
        name,
        created_at: currentUTCTime,
        created_by: user.id,
        updated_at: currentUTCTime,
        updated_by: user.id,
      },
      { transaction },
    );

    await awardRateService.createAwardRateSettings({
      organisation,
      awardRateId: awardRate.id,
      settings,
      transaction,
    });

    const updatedRules = await awardRateService.processEarningRates({
      earning_rates,
      rules,
      organisation,
      user,
      transaction,
    });

    await awardRateService.createAwardRateRules({
      organisation,
      awardRateId: awardRate.id,
      rules: updatedRules,
      transaction,
    });

    await transaction.commit();

    return res.status(200).json({ message: "Award rate created" });
  } catch (err) {
    await transaction.rollback();
    console.error(err);
    return res.status(500).json({ message: err.message });
  }
}

export async function update(req, res) {
  const {
    user,
    organisation,
    name,
    settings,
    rules,
    earning_rates,
  } = req.body;
  const id = req.params.id;

  if (!organisation.acl.awardRate.edit) {
    return res.status(403).json({
      message: "Access denied: You are not authorized to access this action.",
    });
  }

  const transaction = await db.transaction();

  try {
    awardRateService.validateAwardRateInput({ name, settings, rules });


    const currentUTCTime = moment().utc().format();

    await AwardRates.update(
      {
        name,
        updated_at: currentUTCTime,
        updated_by: user.id,
      },
      {
        where: { id, organisation_id: organisation.id },
        transaction,
      },
    );

    await AwardRateSettings.destroy({
      where: {
        organisation_id: organisation.id,
        award_rate_id: id,
      },
      transaction,
    });

    await awardRateService.createAwardRateSettings({
      organisation,
      awardRateId: id,
      settings,
      transaction,
    });

    const updatedRules = await awardRateService.processEarningRates({
      earning_rates,
      rules,
      organisation,
      user,
      transaction,
    });

    await awardRateService.createAwardRateRules({
      organisation,
      awardRateId: id,
      rules: updatedRules,
      transaction,
    });

    await transaction.commit();

    return res.status(200).json({
      message: "Award rate updated",
    });
  } catch (err) {
    await transaction.rollback();
    console.error("error::", err);

    return res.status(500).json({
      message: "Unable to update award rate. Please try again later.",
      details: err.message,
    });
  }
}
