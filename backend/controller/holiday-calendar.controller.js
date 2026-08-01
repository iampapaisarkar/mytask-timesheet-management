import { fn, col, literal, Op } from "sequelize";
import models from "../models/index.js";
const { HolidayCalendars } = models;
import moment from "moment";

export async function list(req, res, next) {
  const { user, organisation } = req.body;
  let { rows_per_page, page_number, sort_by, sort_direction, search } =
    req.query;
  if (!organisation.acl.holidayCalendar.list) {
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

    const { count, rows: calendars } = await HolidayCalendars.findAndCountAll({
      where: whereCondition,
      offset,
      limit: rowsPerPage,
      order: [[sortBy, sortDirection]],
      raw: false,
      nest: true,
    });

    const totalRows = Array.isArray(count) ? count.length : count;
    const total_pages = Math.ceil(totalRows / rowsPerPage) || 0;

    return res.status(200).json({
      data: calendars,
      pagination: {
        total_rows: totalRows,
        rows_per_page: rowsPerPage,
        page_number: pageNumber,
        total_pages,
        sort_by: sortBy,
        sort_direction: sortDirection,
      },
    });
  } catch (err) {
    console.error("Error fetching holiday calendars:", err);
    return res.status(500).json({
      message: "Unable to fetch holiday calendars",
      details: err.message,
    });
  }
}

export async function create(req, res, next) {
  const { user, name, date, organisation } = req.body;
  if (!organisation.acl.holidayCalendar.create) {
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

    if (!date) {
      return res.status(501).json({
        message: "Date is required!",
      });
    }

    const currentUTCTime = moment().utc().format();

    const response = await HolidayCalendars.create({
      organisation_id: organisation.id,
      name: name,
      date: date,
      created_at: currentUTCTime,
      created_by: user.id,
      updated_at: currentUTCTime,
      updated_by: user.id,
    });

    return res.status(200).json({
      message: "Holiday calendar created",
    });
  } catch (err) {
    console.log("error::", err);
    res.status(500).json({
      message: "Unable to create holiday calendar. Please ty again later.",
      details: err,
    });
  }
}

export async function update(req, res, next) {
  const { user, name, date, organisation } = req.body;
  const id = req?.params?.id;
  if (!organisation.acl.holidayCalendar.edit) {
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

    if (!date) {
      return res.status(501).json({
        message: "Date is required!",
      });
    }

    const currentUTCTime = moment().utc().format();

    const response = await HolidayCalendars.update(
      {
        name: name,
        date: date,
        updated_at: currentUTCTime,
        updated_by: user.id,
      },
      {
        where: { id: id, organisation_id: organisation.id },
      }
    );

    return res.status(200).json({
      message: "Holiday calendar updated",
    });
  } catch (err) {
    console.log("error::", err);
    res.status(500).json({
      message: "Unable to update holiday calendar. Please ty again later.",
      details: err,
    });
  }
}
