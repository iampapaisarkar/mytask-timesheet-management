import { fn, col, literal, Op } from "sequelize";
import models from "../models/index.js";
const { EarningRates } = models;
import moment from "moment";
import awardRateService from "../service/award-rate.service.js";

export async function list(req, res, next) {
  const { user, organisation } = req.body;
  let { rows_per_page, page_number, sort_by, sort_direction, search } =
    req.query;
  if (!organisation.acl.earningRate.list) {
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

    const { count, rows: earningRates } = await EarningRates.findAndCountAll({
      where: whereCondition,
      offset,
      limit: rowsPerPage,
      order: [[sortBy, sortDirection]],
      raw: false,
      nest: true,
    });

    const total_pages = Math.ceil(earningRates.length / rowsPerPage);

    return res.status(200).json({
      data: earningRates,
      pagination: {
        total_rows: earningRates.length,
        rows_per_page: rowsPerPage,
        page_number: pageNumber,
        total_pages,
        sort_by: sortBy,
        sort_direction: sortDirection,
      },
    });
  } catch (err) {
    console.error("Error fetching earning rates:", err);
    return res.status(500).json({
      message: "Unable to fetch earning rates",
      details: err.message,
    });
  }
}

export async function create(req, res, next) {
  const { user, name, rate, organisation } = req.body;
  if (!organisation.acl.earningRate.create) {
    return res.status(403).json({
      message: "Access denied: You are not authorized to access this action.",
    });
  }
  try {
    if (!name) {
      return res.status(501).json({
        message: "Name is required!",
      });
    }

    if (!rate) {
      return res.status(501).json({
        message: "Rate is required!",
      });
    }

    if (parseFloat(rate) < 100) {
      return res.status(501).json({
        message: "Rate must be 100.00 or greater",
      });
    }

    let existingEarningRateName = await EarningRates.findOne({
      where: { name: name, organisation_id: organisation.id },
    });

    if (existingEarningRateName) {
      return res.status(501).json({
        message:
          "The given rate name already exists in the system. Please use a different name.",
      });
    }

    const currentUTCTime = moment().utc().format();

    let earningRate = EarningRates.build({
      organisation_id: organisation.id,
      name: name,
      rate: rate,
      created_at: currentUTCTime,
      created_by: user.id,
      updated_at: currentUTCTime,
      updated_by: user.id,
    });

    const insertedEarningRate = await earningRate.save();

    return res.status(200).json({
      message: "Earning rate created",
    });
  } catch (err) {
    console.log("error::", err);
    return res.status(err.statusCode || 500).json({
      message:
        err.message || "Unable to create earning rate. Please ty again later.",
    });
  }
}

export async function update(req, res, next) {
  const { user, name, rate, organisation } = req.body;
  const id = req?.params?.id;
  if (!organisation.acl.earningRate.edit) {
    return res.status(403).json({
      message: "Access denied: You are not authorized to access this action.",
    });
  }
  try {
    if (!name) {
      return res.status(501).json({
        message: "Name is required!",
      });
    }

    if (!rate) {
      return res.status(501).json({
        message: "Rate is required!",
      });
    }

    if (parseFloat(rate) < 100) {
      return res.status(501).json({
        message: "Rate must be 100.00 or greater",
      });
    }

    let existingEarningRateName = await EarningRates.findOne({
      where: {
        name: name,
        organisation_id: organisation.id,
        id: { [Op.ne]: id },
      },
    });

    if (existingEarningRateName) {
      return res.status(501).json({
        message:
          "The given rate name already exists in the system. Please use a different name.",
      });
    }

    let existingEarningRate = await EarningRates.findOne({
      where: { id: id, organisation_id: organisation.id },
    });

    const currentUTCTime = moment().utc().format();

    existingEarningRate.name = name;
    existingEarningRate.rate = rate;
    existingEarningRate.updated_at = currentUTCTime;
    existingEarningRate.updated_by = user.id;

    await existingEarningRate.save();

    return res.status(200).json({
      message: "Earning rate updated",
    });
  } catch (err) {
    console.log("error::", err);
    return res.status(err.statusCode || 500).json({
      message:
        err.message || "Unable to update earning rate. Please ty again later.",
    });
  }
}
