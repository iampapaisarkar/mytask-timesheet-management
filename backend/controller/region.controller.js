import { fn, col, literal, Op } from "sequelize";
import models from "../models/index.js";
const { Regions } = models;
import moment from "moment";

export async function list(req, res, next) {
  const { user, organisation } = req.body;
  let { rows_per_page, page_number, sort_by, sort_direction, search } =
    req.query;
  if (!organisation.acl.region.list) {
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
        [Op.or]: [
          { code: { [Op.like]: `%${search}%` } },
          { name: { [Op.like]: `%${search}%` } },
        ],
      };
    }

    const { count, rows: regions } = await Regions.findAndCountAll({
      where: whereCondition,
      offset,
      limit: rowsPerPage,
      order: [[sortBy, sortDirection]],
      raw: false,
      nest: true,
    });

    const total_pages = Math.ceil(regions.length / rowsPerPage);

    return res.status(200).json({
      data: regions,
      pagination: {
        total_rows: regions.length,
        rows_per_page: rowsPerPage,
        page_number: pageNumber,
        total_pages,
        sort_by: sortBy,
        sort_direction: sortDirection,
      },
    });
  } catch (err) {
    console.error("Error fetching regions:", err);
    return res.status(500).json({
      message: "Unable to fetch regions",
      details: err.message,
    });
  }
}

export async function create(req, res, next) {
  const { user, name, organisation } = req.body;
  if (!organisation.acl.region.create) {
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

    const currentUTCTime = moment().utc().format();

    const regionCode = generateRegionCode(name);

    const response = await Regions.create({
      organisation_id: organisation.id,
      name: name,
      code: regionCode,
      created_at: currentUTCTime,
      updated_at: currentUTCTime,
    });

    return res.status(200).json({
      message: "Region created",
    });
  } catch (err) {
    console.log("error::", err);
    res.status(500).json({
      message: "Unable to create region. Please ty again later.",
      details: err,
    });
  }
}

export async function update(req, res, next) {
  const { user, name, organisation } = req.body;
  const id = req?.params?.id;
  if (!organisation.acl.region.edit) {
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

    const currentUTCTime = moment().utc().format();

    const regionCode = generateRegionCode(name);

    const response = await Regions.update(
      {
        name: name,
        code: regionCode,
      },
      {
        where: { id: id, organisation_id: organisation.id },
      }
    );

    return res.status(200).json({
      message: "Region updated",
    });
  } catch (err) {
    console.log("error::", err);
    res.status(500).json({
      message: "Unable to update region. Please ty again later.",
      details: err,
    });
  }
}

function generateRegionCode(name) {
  return name
    .toLowerCase() // convert to lowercase
    .trim() // remove leading/trailing spaces
    .replace(/\s+/g, "-"); // replace all spaces (1 or more) with hyphen
}
