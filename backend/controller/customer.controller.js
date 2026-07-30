import { fn, col, literal, Op } from "sequelize";
import models from "../models/index.js";
const { Customers } = models;
import moment from "moment";
import { resolvePhoneFields } from "../utils/phone.js";

export async function list(req, res, next) {
  const { user, organisation } = req.body;
  let { rows_per_page, page_number, sort_by, sort_direction, search } =
    req.query;
  if (!organisation.acl.customer.list) {
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
          { abn: { [Op.like]: `%${search}%` } },
          { name: { [Op.like]: `%${search}%` } },
          { contact_email: { [Op.like]: `%${search}%` } },
          { contact_phone_number: { [Op.like]: `%${search}%` } },
          { address: { [Op.like]: `%${search}%` } },
        ],
      };
    }

    const { count, rows: customers } = await Customers.findAndCountAll({
      where: whereCondition,
      offset,
      limit: rowsPerPage,
      order: [[sortBy, sortDirection]],
      raw: false,
      nest: true,
    });

    const total_pages = Math.ceil(customers.length / rowsPerPage);

    return res.status(200).json({
      data: customers,
      pagination: {
        total_rows: customers.length,
        rows_per_page: rowsPerPage,
        page_number: pageNumber,
        total_pages,
        sort_by: sortBy,
        sort_direction: sortDirection,
      },
    });
  } catch (err) {
    console.error("Error fetching customers:", err);
    return res.status(500).json({
      message: "Unable to fetch customers",
      details: err.message,
    });
  }
}

export async function create(req, res, next) {
  const {
    user,
    abn,
    address,
    contact_email,
    contact_name,
    contact_phone_number,
    contact_phone_country_code,
    contact_phone_country_iso,
    hourly_rate,
    is_active,
    name,
    organisation,
  } = req.body;
  if (!organisation.acl.customer.create) {
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

    let contactPhone;
    try {
      contactPhone = resolvePhoneFields({
        phone_number: contact_phone_number,
        phone_country_code: contact_phone_country_code,
        phone_country_iso: contact_phone_country_iso,
        required: false,
        label: "Contact phone",
      });
    } catch (phoneErr) {
      return res.status(phoneErr.status || 400).json({
        message: phoneErr.message,
      });
    }

    const currentUTCTime = moment().utc().format();

    const response = await Customers.create({
      organisation_id: organisation.id,
      abn: abn,
      address: address,
      contact_email: contact_email,
      contact_name: contact_name,
      contact_phone_number: contactPhone.phone_number,
      contact_phone_country_code: contactPhone.phone_country_code,
      contact_phone_country_iso: contactPhone.phone_country_iso,
      hourly_rate: hourly_rate,
      is_active: is_active,
      name: name,
      created_at: currentUTCTime,
      created_by: user.id,
      updated_at: currentUTCTime,
      updated_by: user.id,
    });

    return res.status(200).json({
      message: "Customer created",
    });
  } catch (err) {
    console.log("error::", err);
    res.status(500).json({
      message: "Unable to create customer. Please ty again later.",
      details: err,
    });
  }
}

export async function update(req, res, next) {
  const {
    user,
    abn,
    address,
    contact_email,
    contact_name,
    contact_phone_number,
    contact_phone_country_code,
    contact_phone_country_iso,
    hourly_rate,
    is_active,
    name,
    organisation,
  } = req.body;
  const id = req?.params?.id;
  if (!organisation.acl.customer.edit) {
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

    let contactPhone;
    try {
      contactPhone = resolvePhoneFields({
        phone_number: contact_phone_number,
        phone_country_code: contact_phone_country_code,
        phone_country_iso: contact_phone_country_iso,
        required: false,
        label: "Contact phone",
      });
    } catch (phoneErr) {
      return res.status(phoneErr.status || 400).json({
        message: phoneErr.message,
      });
    }

    const currentUTCTime = moment().utc().format();

    const response = await Customers.update(
      {
        abn: abn,
        address: address,
        contact_email: contact_email,
        contact_name: contact_name,
        contact_phone_number: contactPhone.phone_number,
        contact_phone_country_code: contactPhone.phone_country_code,
        contact_phone_country_iso: contactPhone.phone_country_iso,
        hourly_rate: hourly_rate,
        is_active: is_active,
        name: name,
        updated_at: currentUTCTime,
        updated_by: user.id,
      },
      {
        where: { id: id, organisation_id: organisation.id },
      },
    );

    return res.status(200).json({
      message: "Customer updated",
    });
  } catch (err) {
    console.log("error::", err);
    res.status(500).json({
      message: "Unable to update customer. Please ty again later.",
      details: err,
    });
  }
}
