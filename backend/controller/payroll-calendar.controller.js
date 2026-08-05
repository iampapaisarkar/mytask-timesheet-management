import { fn, col, literal, Op } from "sequelize";
import models from "../models/index.js";
const { PayrollCalendars, PayCycles } = models;
import { SystemFunction } from "#systemfunction";
import moment from "moment";

export async function list(req, res, next) {
  const { user, organisation } = req.body;
  let { rows_per_page, page_number, sort_by, sort_direction, search } =
    req.query;
  if (!organisation.acl.payrollCalendar.list) {
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

    const { count, rows: calendars } = await PayrollCalendars.findAndCountAll({
      where: whereCondition,
      include: [
        {
          model: PayCycles,
          as: "pay_cycle",
          attributes: ["id", "name", "code"],
        },
      ],
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
    console.error("Error fetching payroll calendars:", err);
    return res.status(500).json({
      message: "Unable to fetch payroll calendars",
      details: err.message,
    });
  }
}

export async function create(req, res, next) {
  const {
    user,
    organisation,
    pay_cycle,
    name,
    start_date,
    first_payment_date,
    default: isDefault,
  } = req.body;
  if (!organisation.acl.payrollCalendar.create) {
    return res.status(403).json({
      message: "Access denied: You are not authorized to access this action.",
    });
  }
  try {
    if (!pay_cycle) {
      return res.status(501).json({
        message: "Pay cycle is required!",
      });
    }
    if (!name) {
      return res.status(501).json({
        message: "Name is required!",
      });
    }
    if (!start_date) {
      return res.status(501).json({
        message: "Start date is required!",
      });
    }
    if (!first_payment_date) {
      return res.status(501).json({
        message: "FIrst payment date is required!",
      });
    }

    let existingPayrollCalendarName = await PayrollCalendars.findOne({
      where: { name: name, organisation_id: organisation.id },
    });

    if (existingPayrollCalendarName) {
      return res.status(501).json({
        message:
          "The given rate name already exists in the system. Please use a different name.",
      });
    }

    const currentUTCTime = moment().utc().format();

    const end_date = await SystemFunction.getPayrollEndDateByPayCycleType(
      pay_cycle.code,
      start_date,
    );

    if (isDefault) {
      await PayrollCalendars.update(
        {
          default: false,
        },
        {
          where: {
            organisation_id: organisation.id,
          },
        },
      );
    }

    let formattedFirstPaymentDate = first_payment_date;

    if (
      typeof first_payment_date === "string" &&
      first_payment_date.includes("/")
    ) {
      formattedFirstPaymentDate = moment(
        first_payment_date.trim(),
        "YYYY/MM/DD",
        true,
      ).format("YYYY-MM-DD");
    }

    let payrollCalendar = PayrollCalendars.build({
      organisation_id: organisation.id,
      name: name,
      pay_cycle_id: pay_cycle.id,
      start_date: start_date,
      end_date: end_date,
      first_payment_date: formattedFirstPaymentDate,
      default: isDefault,
      created_at: currentUTCTime,
      created_by: user.id,
      updated_at: currentUTCTime,
      updated_by: user.id,
    });

    const insertedPayrollCalendar = await payrollCalendar.save();

    return res.status(200).json({
      message: "Payroll calendar created",
    });
  } catch (err) {
    console.log("error::", err);
    return res.status(err.statusCode || 500).json({
      message:
        err.message ||
        "Unable to create payroll calendar. Please ty again later.",
    });
  }
}

export async function update(req, res) {
  return res.status(403).json({
    message: "Payroll calendars cannot be edited once created.",
  });
}

