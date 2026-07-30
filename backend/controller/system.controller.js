import { Op } from "sequelize";
import models from "../models/index.js";
const {
  Users,
  OrganisationRoles,
  Customers,
  LeaveCategories,
  TimesheetSubmissionFrequencies,
  PayCycles,
  RoundingIntervals,
  Employees,
  UserOrganisationRoles,
  EmploymentStatus,
  EmploymentTypes,
  PayrollCalendars,
  Jobs,
  Timesheets,
  States,
} = models;
import { getOrganisationSetupStatus } from "../utils/org-setup.utils.js";

export async function organisationRoles(req, res, next) {
  const { user, organisation } = req.body;
  let { rows_per_page, page_number, sort_by, sort_direction, search } =
    req.query;
  try {
    const rowsPerPage = parseInt(rows_per_page) || 10;
    const pageNumber = parseInt(page_number) || 1;
    const offset = (pageNumber - 1) * rowsPerPage;
    const sortBy = sort_by || "id";
    const sortDirection = sort_direction || "asc";

    let whereCondition = {
      code: { [Op.notIn]: ["owner"] },
    };

    if (organisation?.role?.code === "moderator") {
      whereCondition.code[Op.notIn].push("moderator");
    }
    if (search && search.trim() !== "") {
      // Add search condition only if "search" exists and not empty
      whereCondition = {
        ...whereCondition,
        [Op.or]: [
          { code: { [Op.like]: `%${search}%` } },
          { name: { [Op.like]: `%${search}%` } },
        ],
      };
    }

    const { count, rows: roles } = await OrganisationRoles.findAndCountAll({
      where: whereCondition,
      offset,
      limit: rowsPerPage,
      order: [[sortBy, sortDirection]],
      raw: true,
    });

    const total_pages = Math.ceil(roles.length / rowsPerPage);

    return res.status(200).json({
      data: roles,
      pagination: {
        total_rows: roles.length,
        rows_per_page: rowsPerPage,
        page_number: pageNumber,
        total_pages,
        sort_by: sortBy,
        sort_direction: sortDirection,
      },
    });
  } catch (err) {
    console.error("Error featching organisation roles:", err);
    return res.status(500).json({
      message: "Unable to fetch organisation roles",
      details: err.message,
    });
  }
}

export async function allCustomers(req, res, next) {
  const { user, organisation } = req.body;
  let { rows_per_page, page_number, sort_by, sort_direction, search } =
    req.query;

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

export async function leaveCategories(req, res, next) {
  const { user, organisation } = req.body;
  let { rows_per_page, page_number, sort_by, sort_direction, search } =
    req.query;

  try {
    const rowsPerPage = parseInt(rows_per_page) || 10;
    const pageNumber = parseInt(page_number) || 1;
    const offset = (pageNumber - 1) * rowsPerPage;
    const sortBy = sort_by || "id";
    const sortDirection = sort_direction || "asc";

    let whereCondition = {};

    if (search && search.trim() !== "") {
      whereCondition = {
        ...whereCondition,
        [Op.or]: [
          { name: { [Op.like]: `%${search}%` } },
          { code: { [Op.like]: `%${search}%` } },
        ],
      };
    }

    const { count, rows: categories } = await LeaveCategories.findAndCountAll({
      where: whereCondition,
      offset,
      limit: rowsPerPage,
      order: [[sortBy, sortDirection]],
      raw: false,
      nest: true,
    });

    const total_pages = Math.ceil(categories.length / rowsPerPage);

    return res.status(200).json({
      data: categories,
      pagination: {
        total_rows: categories.length,
        rows_per_page: rowsPerPage,
        page_number: pageNumber,
        total_pages,
        sort_by: sortBy,
        sort_direction: sortDirection,
      },
    });
  } catch (err) {
    console.error("Error fetching leave categories:", err);
    return res.status(500).json({
      message: "Unable to fetch leave categories",
      details: err.message,
    });
  }
}

export async function timesheetSubmissionFrequencies(req, res, next) {
  const { user } = req.body;
  let { rows_per_page, page_number, sort_by, sort_direction, search } =
    req.query;

  try {
    const rowsPerPage = parseInt(rows_per_page) || 10;
    const pageNumber = parseInt(page_number) || 1;
    const offset = (pageNumber - 1) * rowsPerPage;
    const sortBy = sort_by || "id";
    const sortDirection = sort_direction || "asc";

    let whereCondition = {};

    if (search && search.trim() !== "") {
      whereCondition = {
        ...whereCondition,
        [Op.or]: [
          { name: { [Op.like]: `%${search}%` } },
          { code: { [Op.like]: `%${search}%` } },
        ],
      };
    }

    const { count, rows: frequencies } =
      await TimesheetSubmissionFrequencies.findAndCountAll({
        where: whereCondition,
        offset,
        limit: rowsPerPage,
        order: [[sortBy, sortDirection]],
        raw: false,
        nest: true,
      });

    const total_pages = Math.ceil(frequencies.length / rowsPerPage);

    return res.status(200).json({
      data: frequencies,
      pagination: {
        total_rows: frequencies.length,
        rows_per_page: rowsPerPage,
        page_number: pageNumber,
        total_pages,
        sort_by: sortBy,
        sort_direction: sortDirection,
      },
    });
  } catch (err) {
    console.error("Error fetching timesheet submission frequencies:", err);
    return res.status(500).json({
      message: "Unable to fetch timesheet submission frequencies",
      details: err.message,
    });
  }
}

export async function payCycles(req, res, next) {
  const { user } = req.body;
  let { rows_per_page, page_number, sort_by, sort_direction, search } =
    req.query;

  try {
    const rowsPerPage = parseInt(rows_per_page) || 10;
    const pageNumber = parseInt(page_number) || 1;
    const offset = (pageNumber - 1) * rowsPerPage;
    const sortBy = sort_by || "id";
    const sortDirection = sort_direction || "asc";

    let whereCondition = {};

    if (search && search.trim() !== "") {
      whereCondition = {
        ...whereCondition,
        [Op.or]: [
          { name: { [Op.like]: `%${search}%` } },
          { code: { [Op.like]: `%${search}%` } },
        ],
      };
    }

    const { count, rows: payCycles } = await PayCycles.findAndCountAll({
      where: whereCondition,
      offset,
      limit: rowsPerPage,
      order: [[sortBy, sortDirection]],
      raw: false,
      nest: true,
    });

    const total_pages = Math.ceil(payCycles.length / rowsPerPage);

    return res.status(200).json({
      data: payCycles,
      pagination: {
        total_rows: payCycles.length,
        rows_per_page: rowsPerPage,
        page_number: pageNumber,
        total_pages,
        sort_by: sortBy,
        sort_direction: sortDirection,
      },
    });
  } catch (err) {
    console.error("Error fetching pay cycles:", err);
    return res.status(500).json({
      message: "Unable to fetch pay cycles",
      details: err.message,
    });
  }
}

export async function roundingIntervals(req, res, next) {
  const { user } = req.body;
  try {
    const intervals = await RoundingIntervals.findAll({
      raw: false,
      nest: true,
    });
    return res.status(200).json({
      data: intervals,
    });
  } catch (err) {
    console.error("Error fetching rounding interval:", err);
    return res.status(500).json({
      message: "Unable to fetch rounding interval",
      details: err.message,
    });
  }
}

export async function managerEmployees(req, res, next) {
  const { user, organisation } = req.body;
  let {
    rows_per_page,
    page_number,
    sort_by,
    sort_direction,
    search,
    exclude_ids,
  } = req.query;

  try {
    const rowsPerPage = parseInt(rows_per_page) || 10;
    const pageNumber = parseInt(page_number) || 1;
    const offset = (pageNumber - 1) * rowsPerPage;
    const sortBy = sort_by || "id";
    const sortDirection = sort_direction || "asc";
    let excludeIds = [];
    if (exclude_ids) {
      excludeIds = JSON.parse(exclude_ids);
    }

    let whereCondition = {
      organisation_id: organisation.id,
    };

    if (organisation.role.code !== "owner") {
      whereCondition = {
        ...whereCondition,
        user_id: {
          [Op.notIn]: [organisation.owner.id],
        },
      };
    }

    if (search && search.trim() !== "") {
      whereCondition = {
        ...whereCondition,
        [Op.or]: [
          { "$user.first_name$": { [Op.like]: `%${search}%` } },
          { "$user.middle_name$": { [Op.like]: `%${search}%` } },
          { "$user.last_name$": { [Op.like]: `%${search}%` } },
        ],
      };
    }

    // Exclude specific employee IDs
    if (excludeIds && excludeIds.length > 0) {
      whereCondition = {
        ...whereCondition,
        id: { [Op.notIn]: excludeIds },
      };
    }

    const { count, rows: employees } =
      await Employees.unscoped().findAndCountAll({
        where: whereCondition,
        include: [
          {
            model: Users,
            as: "user",
            required: true,
            include: [
              {
                model: UserOrganisationRoles,
                as: "user_organisations_role", // optional alias if you defined one
                attributes: ["id", "user_id", "organisation_id", "role_id"],
                required: true,
                where: {
                  organisation_id: organisation.id,
                },
                include: [
                  {
                    model: OrganisationRoles,
                    as: "role",
                    attributes: ["id", "name", "code"],
                    required: true,
                    where: {
                      code: { [Op.in]: ["moderator", "manager", "owner"] },
                    },
                  },
                ],
              },
            ],
          },
        ],
        group: ["Employees.id"],
        distinct: true,
        raw: false,
        nest: true,
        offset,
        limit: rowsPerPage,
        order: [[sortBy, sortDirection]],
      });

    const selfEmployeeId = organisation?.employee?.id ?? null;
    const finalData = employees.map((e) => {
      const plain = e.get({ plain: true });
      const isYou =
        selfEmployeeId != null && Number(plain.id) === Number(selfEmployeeId);
      const baseName = plain.user?.full_name || plain.preferred_name || "";
      return {
        ...plain,
        is_you: isYou,
        full_name: isYou ? `${baseName} (You)`.trim() : baseName,
      };
    });
    const total_pages = Math.ceil(finalData.length / rowsPerPage);

    return res.status(200).json({
      data: finalData,
      pagination: {
        total_rows: finalData.length,
        rows_per_page: rowsPerPage,
        page_number: pageNumber,
        total_pages,
        sort_by: sortBy,
        sort_direction: sortDirection,
      },
    });
  } catch (err) {
    console.error("Error fetching manager employees:", err);
    return res.status(500).json({
      message: "Unable to fetch manager employees",
      details: err.message,
    });
  }
}

export async function managerStaffEmployees(req, res, next) {
  const { user, organisation } = req.body;
  let {
    rows_per_page,
    page_number,
    sort_by,
    sort_direction,
    search,
    exclude_ids,
  } = req.query;

  try {
    const rowsPerPage = parseInt(rows_per_page) || 10;
    const pageNumber = parseInt(page_number) || 1;
    const offset = (pageNumber - 1) * rowsPerPage;
    const sortBy = sort_by || "id";
    const sortDirection = sort_direction || "asc";
    let excludeIds = [];
    if (exclude_ids) {
      excludeIds = JSON.parse(exclude_ids);
    }

    let whereCondition = {
      organisation_id: organisation.id,
      // user_id: { [Op.ne]: user.id },
    };

    if (search && search.trim() !== "") {
      whereCondition = {
        ...whereCondition,
        [Op.or]: [
          { "$user.first_name$": { [Op.like]: `%${search}%` } },
          { "$user.middle_name$": { [Op.like]: `%${search}%` } },
          { "$user.last_name$": { [Op.like]: `%${search}%` } },
        ],
      };
    }

    // Exclude specific employee IDs
    if (excludeIds && excludeIds.length > 0) {
      whereCondition = {
        ...whereCondition,
        id: { [Op.notIn]: excludeIds },
      };
    }

    const { count, rows: employees } =
      await Employees.unscoped().findAndCountAll({
        where: whereCondition,
        include: [
          {
            model: Users,
            as: "user",
            required: true,
            include: [
              {
                model: UserOrganisationRoles,
                as: "user_organisations_role", // optional alias if you defined one
                attributes: ["id", "user_id", "organisation_id", "role_id"],
                required: true,
                where: {
                  organisation_id: organisation.id,
                },
                include: [
                  {
                    model: OrganisationRoles,
                    as: "role",
                    attributes: ["id", "name", "code"],
                    required: true,
                    where: {
                      code: { [Op.in]: ["moderator", "manager", "staff"] },
                    },
                  },
                ],
              },
            ],
          },
        ],
        group: ["Employees.id"],
        distinct: true,
        raw: false,
        nest: true,
        offset,
        limit: rowsPerPage,
        order: [[sortBy, sortDirection]],
      });

    const selfEmployeeId = organisation?.employee?.id ?? null;
    const finalData = employees.map((e) => {
      const plain = e.get({ plain: true });
      const isYou =
        selfEmployeeId != null && Number(plain.id) === Number(selfEmployeeId);
      const baseName = plain.user?.full_name || plain.preferred_name || "";
      return {
        ...plain,
        is_you: isYou,
        full_name: isYou ? `${baseName} (You)`.trim() : baseName,
      };
    });

    const total_pages = Math.ceil(finalData.length / rowsPerPage);

    return res.status(200).json({
      data: finalData,
      pagination: {
        total_rows: finalData.length,
        rows_per_page: rowsPerPage,
        page_number: pageNumber,
        total_pages,
        sort_by: sortBy,
        sort_direction: sortDirection,
      },
    });
  } catch (err) {
    console.error("Error fetching manager & staff employees:", err);
    return res.status(500).json({
      message: "Unable to fetch manager & staff employees",
      details: err.message,
    });
  }
}

export async function employmentStatus(req, res, next) {
  const { user } = req.body;
  try {
    const status = await EmploymentStatus.findAll({
      raw: false,
      nest: true,
    });
    return res.status(200).json({
      data: status,
    });
  } catch (err) {
    console.error("Error fetching employment status:", err);
    return res.status(500).json({
      message: "Unable to fetch employment status",
      details: err.message,
    });
  }
}

export async function employmentTypes(req, res, next) {
  const { user } = req.body;
  try {
    const types = await EmploymentTypes.findAll({
      where: {
        code: { [Op.notIn]: ["CONTRACT", "contract"] },
      },
      raw: false,
      nest: true,
    });
    return res.status(200).json({
      data: types,
    });
  } catch (err) {
    console.error("Error fetching employment types:", err);
    return res.status(500).json({
      message: "Unable to fetch employment types",
      details: err.message,
    });
  }
}

export async function payrollCalendars(req, res, next) {
  const { user, organisation } = req.body;
  let { rows_per_page, page_number, sort_by, sort_direction, search } =
    req.query;

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
        },
      ],
      raw: false,
      nest: true,
      offset,
      limit: rowsPerPage,
      order: [[sortBy, sortDirection]],
    });

    const total_pages = Math.ceil(calendars.length / rowsPerPage);

    return res.status(200).json({
      data: calendars,
      pagination: {
        total_rows: calendars.length,
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

export async function employees(req, res, next) {
  const { user, organisation } = req.body;
  let { rows_per_page, page_number, sort_by, sort_direction, search } =
    req.query;

  try {
    const rowsPerPage = parseInt(rows_per_page) || 10;
    const pageNumber = parseInt(page_number) || 1;
    const offset = (pageNumber - 1) * rowsPerPage;
    const sortBy = sort_by || "id";
    const sortDirection = sort_direction || "asc";

    let whereCondition = {
      organisation_id: organisation.id,
    };

    if (organisation.role.code !== "owner") {
      whereCondition = {
        ...whereCondition,
        user_id: {
          [Op.notIn]: [user.id, organisation.owner.id],
        },
      };
    }

    if (search && search.trim() !== "") {
      whereCondition = {
        ...whereCondition,
        [Op.or]: [
          { "$user.first_name$": { [Op.like]: `%${search}%` } },
          { "$user.middle_name$": { [Op.like]: `%${search}%` } },
          { "$user.last_name$": { [Op.like]: `%${search}%` } },
        ],
      };
    }

    let employeeCondition = {};

    const { count, rows: employees } =
      await Employees.unscoped().findAndCountAll({
        where: {
          ...whereCondition,
          ...employeeCondition,
        },
        include: [
          {
            model: Users,
            as: "user",
            required: true,
            include: [
              {
                model: UserOrganisationRoles,
                as: "user_organisations_role",
                attributes: ["id", "user_id", "role_id", "organisation_id"],
                required: true,
                where: {
                  organisation_id: organisation.id,
                },
                include: [
                  {
                    model: OrganisationRoles,
                    as: "role",
                    attributes: ["id", "name", "code"],
                    required: true,
                    where: {
                      code: {
                        [Op.in]: ["moderator", "manager", "staff", "owner"],
                      },
                    },
                  },
                ],
              },
            ],
          },
        ],
        distinct: true,
        // col: "Employees.id",
        offset,
        limit: rowsPerPage,
        order: [[sortBy, sortDirection]],
      });

    const selfEmployeeId = organisation?.employee?.id ?? null;
    const finalData = employees.map((e) => {
      const plain = e.get({ plain: true });
      const isYou =
        selfEmployeeId != null && Number(plain.id) === Number(selfEmployeeId);
      const baseName = plain.user?.full_name || plain.preferred_name || "";
      return {
        ...plain,
        is_you: isYou,
        full_name: isYou ? `${baseName} (You)`.trim() : baseName,
      };
    });
    const total_pages = Math.ceil(finalData.length / rowsPerPage);

    return res.status(200).json({
      data: finalData,
      pagination: {
        total_rows: finalData.length,
        rows_per_page: rowsPerPage,
        page_number: pageNumber,
        total_pages,
        sort_by: sortBy,
        sort_direction: sortDirection,
      },
    });
  } catch (err) {
    console.error("Error fetching employees:", err);
    return res.status(500).json({
      message: "Unable to fetch employees",
      details: err.message,
    });
  }
}

export async function jobs(req, res, next) {
  const { user, organisation } = req.body;
  let { rows_per_page, page_number, sort_by, sort_direction, search } =
    req.query;

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
          { name: { [Op.like]: `%${search}%` } },
          { site_contact_name: { [Op.like]: `%${search}%` } },
          { site_contact_email: { [Op.like]: `%${search}%` } },
          { site_contact_phone_number: { [Op.like]: `%${search}%` } },
          { address: { [Op.like]: `%${search}%` } },
        ],
      };
    }

    let employeeCondition = {};
    if (
      organisation?.role?.code === "manager" ||
      organisation?.role?.code === "staff"
    ) {
      employeeCondition = {
        employee_id: organisation?.employee?.id,
      };
    }

    const { count, rows: jobs } = await Jobs.scope({
      method: ["withEmployee", employeeCondition],
    }).findAndCountAll({
      where: whereCondition,
      offset,
      limit: rowsPerPage,
      order: [[sortBy, sortDirection]],
      raw: false,
      nest: true,
    });

    const total_pages = Math.ceil(jobs.length / rowsPerPage);

    return res.status(200).json({
      data: jobs,
      pagination: {
        total_rows: jobs.length,
        rows_per_page: rowsPerPage,
        page_number: pageNumber,
        total_pages,
        sort_by: sortBy,
        sort_direction: sortDirection,
      },
    });
  } catch (err) {
    console.error("Error fetching jobs:", err);
    return res.status(500).json({
      message: "Unable to fetch jobs",
      details: err.message,
    });
  }
}

export async function employeeTimesheets(req, res, next) {
  const { user, organisation } = req.body;
  let {
    rows_per_page,
    page_number,
    sort_by,
    sort_direction,
    search,
    employee_id,
  } = req.query;

  try {
    const rowsPerPage = parseInt(rows_per_page) || 10;
    const pageNumber = parseInt(page_number) || 1;
    const offset = (pageNumber - 1) * rowsPerPage;
    const sortBy = sort_by || "id";
    const sortDirection = sort_direction || "asc";

    let whereCondition = {
      organisation_id: organisation.id,
    };

    if (employee_id) {
      whereCondition = {
        ...whereCondition,
        [Op.and]: [
          { employee_id: employee_id },
          // { employee_id: { [Op.ne]: organisation?.employee?.id } },
        ],
      };
    }

    if (search && search.trim() !== "") {
      whereCondition = {
        ...whereCondition,
        [Op.or]: [{ code: { [Op.like]: `%${search}%` } }],
      };
    }
    const { count, rows: timesheets } =
      await Timesheets.unscoped().findAndCountAll({
        where: whereCondition,
        offset,
        limit: rowsPerPage,
        order: [[sortBy, sortDirection]],
        raw: false,
        nest: true,
      });

    const total_pages = Math.ceil(timesheets.length / rowsPerPage);

    return res.status(200).json({
      data: timesheets,
      pagination: {
        total_rows: timesheets.length,
        rows_per_page: rowsPerPage,
        page_number: pageNumber,
        total_pages,
        sort_by: sortBy,
        sort_direction: sortDirection,
      },
    });
  } catch (err) {
    console.error("Error fetching employee timesheets:", err);
    return res.status(500).json({
      message: "Unable to fetch employee timesheets",
      details: err.message,
    });
  }
}

export async function states(req, res, next) {
  const { user } = req.body;
  let { search } = req.query;
  try {
    let whereCondition = {};

    if (search && search.trim() !== "") {
      whereCondition = {
        ...whereCondition,
        [Op.or]: [{ name: { [Op.like]: `%${search}%` } }],
      };
    }

    const states = await States.findAll({
      where: whereCondition,
    });
    return res.status(200).json({
      data: states,
    });
  } catch (err) {
    console.error("Error featching states:", err);
    return res.status(500).json({
      message: "Unable to fetch states",
      details: err.message,
    });
  }
}

export async function organisationSetupStatus(req, res) {
  const { organisation } = req.body;
  try {
    const data = await getOrganisationSetupStatus(organisation.id);
    return res.status(200).json({ data });
  } catch (err) {
    return res.status(500).json({ message: "Unable to fetch organisation setup status" });
  }
}
