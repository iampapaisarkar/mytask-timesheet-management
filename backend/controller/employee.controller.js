import { fn, col, literal, Op } from "sequelize";
import models from "../models/index.js";
const {
  Users,
  OrganisationRoles,
  UserOrganisationRoles,
  Employees,
  EmployeeInvitations,
  InvitationStatus,
} = models;
import { db } from "../database.js";
import employeeService from "../service/employee.service.js";
import moment from "moment";
import {
  emitEmployeeCreated,
  emitEmployeeUpdated,
  emitDashboardUpdated,
  emitPayrollUpdated,
} from "../service/realtime.service.js";

export async function list(req, res, next) {
  const { user, orgCode, organisation } = req.body;
  let {
    rows_per_page,
    page_number,
    sort_by,
    sort_direction,
    search,
    phone_country_iso,
    phone_country_code,
    role_id,
  } = req.query;

  if (!organisation.acl.employee.list) {
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

    if (organisation.role.code !== "owner") {
      whereCondition = {
        ...whereCondition,
        user_id: {
          [Op.notIn]: [user.id, organisation.owner.id],
        },
      };
    }

    if (phone_country_iso && String(phone_country_iso).trim()) {
      whereCondition.phone_country_iso = String(phone_country_iso)
        .trim()
        .toUpperCase();
    }
    if (phone_country_code && String(phone_country_code).trim()) {
      const code = String(phone_country_code).trim();
      whereCondition.phone_country_code = code.startsWith("+")
        ? code
        : `+${code}`;
    }
    if (search && search.trim() !== "") {
      whereCondition = {
        ...whereCondition,
        [Op.or]: [
          { preferred_name: { [Op.like]: `%${search}%` } },
          { phone_number: { [Op.like]: `%${search}%` } },
          { phone_country_iso: { [Op.like]: `%${search}%` } },
          { phone_country_code: { [Op.like]: `%${search}%` } },

          { "$user.name$": { [Op.like]: `%${search}%` } },
          { "$user.email$": { [Op.like]: `%${search}%` } },

          { "$invitation.email$": { [Op.like]: `%${search}%` } },
        ],
      };
    }

    let order = [];

    switch (sortBy) {
      case "name":
        order = [[{ model: Users, as: "user" }, "name", sortDirection]];
        break;

      case "preferred_name":
        order = [["preferred_name", sortDirection]];
        break;

      case "email":
        order = [
          [{ model: Users, as: "user" }, "email", sortDirection],
          [
            { model: EmployeeInvitations, as: "invitation" },
            "email",
            sortDirection,
          ],
        ];
        break;

      case "organisation_role":
        order = [
          [
            { model: Users, as: "user" },
            { model: UserOrganisationRoles, as: "user_organisations_role" },
            { model: OrganisationRoles, as: "role" },
            "name",
            sortDirection,
          ],
          [
            { model: EmployeeInvitations, as: "invitation" },
            { model: OrganisationRoles, as: "role" },
            "name",
            sortDirection,
          ],
        ];
        break;

      case "status":
        order = [
          [
            { model: EmployeeInvitations, as: "invitation" },
            { model: InvitationStatus, as: "status" },
            "name",
            sortDirection,
          ],
        ];
        break;

      default:
        order = [[sortBy, sortDirection]];
    }

    const { count, rows: employees } = await Employees.scope(
      "defaultScope",
    ).findAndCountAll({
      where: whereCondition,
      distinct: true,
      col: "Employees.id",
      subQuery: false,
      offset,
      limit: rowsPerPage,
      order,
    });

    const totalRows = Array.isArray(count) ? count.length : count;
    const total_pages = Math.ceil(totalRows / rowsPerPage) || 0;
    const selfEmployeeId = organisation?.employee?.id ?? null;

    const data = employees.map((employee) => {
      const json = employee.toJSON();
      const id = json?.details?.id ?? employee.id;
      const isYou =
        selfEmployeeId != null && Number(id) === Number(selfEmployeeId);
      if (isYou && json?.details) {
        const base = json.details.full_name || json.details.email || "";
        json.details = {
          ...json.details,
          is_you: true,
          full_name: base ? `${base} (You)` : "(You)",
        };
      }
      return json;
    });

    return res.status(200).json({
      data,
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
    console.error("Error fetching employees:", err);
    return res.status(500).json({
      message: "Unable to fetch employees",
      details: err.message,
    });
  }
}

export async function create(req, res, next) {
  let {
    user,
    action,
    details,
    wage,
    payroll,
    orgCode,
    organisation,
    orgName,
  } = req.body;
  if (!organisation.acl.employee.create) {
    return res.status(403).json({
      message: "Access denied: You are not authorized to access this action.",
    });
  }
  const transaction = await db.transaction();
  try {
    const { assertOrganisationSetupComplete } = await import(
      "../utils/org-setup.utils.js"
    );
    await assertOrganisationSetupComplete(organisation.id);

    const employee = await employeeService.createOrUpdateEmployeeDetails(
      user,
      organisation,
      action,
      details,
      null,
      transaction,
    );
    await employeeService.createOrUpdateEmployeeWage(
      user,
      organisation,
      action,
      wage,
      employee,
      null,
      transaction,
    );
    await employeeService.createOrUpdateEmployeePayroll(
      user,
      organisation,
      action,
      payroll,
      employee,
      null,
      transaction,
    );

    await employeeService.inviteEmployee(
      user,
      orgName,
      organisation,
      details.first_name,
      details.middle_name,
      details.last_name,
      details.email,
      details.dob,
      details.role,
      employee.user_id,
      employee.id,
      transaction,
    );

    await transaction.commit();

    emitEmployeeCreated(
      organisation.id,
      {
        id: employee.id,
        user_id: employee.user_id,
        organisation_id: organisation.id,
      },
      user?.id,
    );
    if (payroll) {
      emitPayrollUpdated(
        organisation.id,
        { id: employee.id, employee_id: employee.id, organisation_id: organisation.id },
        user?.id,
      );
    }
    emitDashboardUpdated(organisation.id);

    return res.status(200).json({
      message: "Employee created & invitation sent",
    });
  } catch (err) {
    console.log("error::", err);
    await transaction.rollback();
    return res.status(err.statusCode || 500).json({
      message:
        err.message || "Unable to create employee. Please ty again later.",
    });
  }
}

export async function update(req, res, next) {
  const {
    user,
    action,
    details,
    wage,
    payroll,
    orgCode,
    organisation,
    orgName,
  } = req.body;
  const id = req?.params?.id;
  if (!organisation.acl.employee.edit) {
    return res.status(403).json({
      message: "Access denied: You are not authorized to access this action.",
    });
  }
  const transaction = await db.transaction();
  try {
    const response = await employeeService.createOrUpdateEmployeeDetails(
      user,
      organisation,
      action,
      details,
      id,
      transaction,
    );
    const employee = await Employees.unscoped().findOne({
      where: {
        id: id,
      },
      raw: true,
    });
    await employeeService.createOrUpdateEmployeeWage(
      user,
      organisation,
      action,
      wage,
      employee,
      id,
    );
    await employeeService.createOrUpdateEmployeePayroll(
      user,
      organisation,
      action,
      payroll,
      employee,
      id,
      transaction,
    );

    await EmployeeInvitations.update(
      {
        organisation_role_id: details.role.id,
      },
      {
        where: { employee_id: id, organisation_id: organisation.id },
        transaction: transaction,
      },
    );

    await transaction.commit();

    emitEmployeeUpdated(
      organisation.id,
      {
        id: Number(id),
        user_id: employee?.user_id,
        organisation_id: organisation.id,
      },
      user?.id,
    );
    if (payroll) {
      emitPayrollUpdated(
        organisation.id,
        {
          id: Number(id),
          employee_id: Number(id),
          organisation_id: organisation.id,
        },
        user?.id,
      );
    }
    emitDashboardUpdated(organisation.id);

    return res.status(200).json({
      message: "Employee updated",
    });
  } catch (err) {
    console.log("error::", err);
    await transaction.rollback();
    return res.status(err.statusCode || 500).json({
      message:
        err.message || "Unable to update employee. Please ty again later.",
    });
  }
}

export async function invite(req, res, next) {
  const { user, orgName, organisation } = req.body;
  const id = req?.params?.id;
  if (!organisation.acl.employee.create && !organisation.acl.employee.edit) {
    return res.status(403).json({
      message: "Access denied: You are not authorized to access this action.",
    });
  }
  const transaction = await db.transaction();
  try {
    const employeeResponse = await Employees.scope("defaultScope").findOne({
      where: {
        id: id,
        organisation_id: organisation.id,
      },
      include: [
        {
          model: Users,
          as: "user",
          required: false,
          include: [
            {
              model: UserOrganisationRoles,
              as: "user_organisations_role",
              attributes: ["id", "user_id", "organisation_id", "role_id"],
              required: false,
              where: {
                organisation_id: organisation.id,
              },
              include: [
                {
                  model: OrganisationRoles,
                  as: "role",
                  attributes: ["id", "name", "code"],
                },
              ],
            },
          ],
        },
      ],
      raw: false,
      nest: true,
    });

    if (!employeeResponse) {
      return res.status(404).json({
        message: "Employee not found!",
      });
    }

    const employee = employeeResponse.toJSON();
    const selfEmployeeId = organisation?.employee?.id ?? null;
    const employeeIdNum = Number(employee?.details?.id ?? id);
    const roleCode =
      employee?.details?.role?.code ||
      employee?.details?.user?.user_organisations_role?.[0]?.role?.code ||
      null;

    if (
      (selfEmployeeId != null && employeeIdNum === Number(selfEmployeeId)) ||
      roleCode === "owner" ||
      Number(employee?.details?.user?.id) === Number(user.id)
    ) {
      return res.status(400).json({
        message:
          "You cannot invite the organisation owner or your own employee profile.",
      });
    }

    await employeeService.inviteEmployee(
      user,
      orgName,
      organisation,
      employee?.details.first_name,
      employee?.details.middle_name,
      employee?.details.last_name,
      employee?.details.email,
      employee?.details.dob,
      employee?.details.role,
      employee?.details.user.id,
      id,
      transaction,
    );
    await transaction.commit();
    return res.status(200).json({
      message: "Invitation sent",
    });
  } catch (err) {
    console.error("Error sending invitation:", err);
    await transaction.rollback();
    return res.status(500).json({
      message: "Unable to send invitation",
      details: err.message,
    });
  }
}

export async function searchUserByEmail(req, res, next) {
  const { user, email, organisation } = req.body;
  try {
    if (user.email === email) {
      return res.status(501).json({
        message: "Employee already exists",
      });
    }
    const employeeInvitation = await EmployeeInvitations.findOne({
      where: {
        email: email,
        organisation_id: organisation.id,
      },
      raw: true,
    });

    if (employeeInvitation) {
      return res.status(501).json({
        message:
          "An employee with this email address already exists. Please enter a different one.",
      });
    }

    let formattedEmployee;
    {
      // Fetch from mysheet system
      let systemEmployee = await Users.findOne({
        where: {
          email: email,
        },
        raw: true,
      });

      if (systemEmployee) {
        formattedEmployee = {
          details: {
            id: systemEmployee?.id,
            first_name: systemEmployee?.first_name,
            middle_name: systemEmployee?.middle_name,
            last_name: systemEmployee?.last_name,
            email: systemEmployee?.email,
            preferred_name: null,
            address: null,
            address_2: null,
            city: null,
            state: null,
            postcode: null,
            dob: systemEmployee?.dob,
            phone_number: null,
            role: null,
          },
          wage: {
            start_date: null,
            payroll_calendar: null,
            employment_type: null,
            pay_type: "HOURLY",
            currency: "AUD",
            hourly_rate_exc_super: null,
            fixed_rate_exc_super: null,
          },
          payroll: {
            payment_method: "CASH",
            account_holder_name: null,
            bank_name: null,
            bank_account_number: null,
            ifsc_code: null,
            swift_code: null,
          },
          action: {
            edit: true,
            create: false,
            message:
              "This user already exists in another organisation. You can create an employee account for this user and send an invitation.",
            found_in_system: true,
            create_user: false,
          },
        };
      } else {
        formattedEmployee = {
          details: {
            id: null,
            first_name: null,
            middle_name: null,
            last_name: null,
            email: email,
            preferred_name: null,
            address: null,
            address_2: null,
            city: null,
            state: null,
            postcode: null,
            dob: null,
            phone_number: null,
            role: null,
          },
          wage: {
            start_date: null,
            payroll_calendar: null,
            employment_type: null,
            pay_type: "HOURLY",
            currency: "AUD",
            hourly_rate_exc_super: null,
            fixed_rate_exc_super: null,
          },
          payroll: {
            payment_method: "CASH",
            account_holder_name: null,
            bank_name: null,
            bank_account_number: null,
            ifsc_code: null,
            swift_code: null,
          },
          action: {
            edit: false,
            create: true,
            message:
              "No existing user was found in any other organisation. You can create a new user and employee account for this email, then send an invitation.",
            create_user: true,
          },
        };
      }
    }
    return res.status(200).json({
      data: formattedEmployee,
    });
  } catch (err) {
    console.error("Error searching user by email:", err);
    return res.status(err.statusCode || 500).json({
      message: err.message || "Unable to search user by email",
      details: err.message,
    });
  }
}
