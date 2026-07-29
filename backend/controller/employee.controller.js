import { fn, col, literal, Op } from "sequelize";
import models from "../models/index.js";
const {
  Users,
  OrganisationRoles,
  UserOrganisationRoles,
  Employees,
  EmployeeInvitations,
  InvitationStatus,
  States,
  EmploymentStatus,
  EmploymentTypes,
  PayrollCalendars,
} = models;
import { db } from "../database.js";
import employeeService from "../service/employee.service.js";
import { enqueueSingleEmployeeToXero } from "../queue-jobs/push-single-employee.job.js";
import xeroService from "../service/xero.service.js";
import moment from "moment";

export async function list(req, res, next) {
  const { user, orgCode, organisation } = req.body;
  let { rows_per_page, page_number, sort_by, sort_direction, search } =
    req.query;

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

    if (search && search.trim() !== "") {
      whereCondition = {
        ...whereCondition,
        [Op.or]: [
          { preferred_name: { [Op.like]: `%${search}%` } },
          { phone_number: { [Op.like]: `%${search}%` } },
          { nok: { [Op.like]: `%${search}%` } },
          { nok_phone_number: { [Op.like]: `%${search}%` } },

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
      offset,
      limit: rowsPerPage,
      order,
    });

    const total_pages = Math.ceil(employees.length / rowsPerPage);

    return res.status(200).json({
      data: employees,
      pagination: {
        total_rows: employees.length,
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
    management_group,
    wage,
    payroll,
    orgCode,
    organisation,
    orgName,
    push_to_xero,
  } = req.body;
  if (!organisation.acl.employee.create) {
    return res.status(403).json({
      message: "Access denied: You are not authorized to access this action.",
    });
  }
  const transaction = await db.transaction();
  try {
    if (organisation?.xero_connection && push_to_xero) {
      if (!organisation?.settings?.default_ordinary_hours_earning_rate_type) {
        return res.status(501).json({
          message:
            "To push the employee to Xero, you must set up a default ordinary hours earning rate in the Organisation settings",
        });
      }
      if (!organisation?.settings?.default_superannuation_expense_account) {
        return res.status(501).json({
          message:
            "To push the employee to Xero, you must set up a default superannuation expense account in the Organisation settings",
        });
      }
      if (!organisation?.settings?.default_superannuation_liability_account) {
        return res.status(501).json({
          message:
            "To push the employee to Xero, you must set up a default superannuation liability account in the Organisation settings",
        });
      }
    }

    const employee = await employeeService.createOrUpdateEmployeeDetails(
      user,
      organisation,
      action,
      details,
      null,
      transaction,
    );
    await employeeService.createOrUpdateEmployeeManagementGroup(
      user,
      organisation,
      action,
      management_group,
      employee,
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

    if (organisation?.xero_connection && push_to_xero) {
      details.id = employee.id;
      await enqueueSingleEmployeeToXero({
        user,
        organisation,
        employee: { details, wage, payroll },
      });
    }

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
    management_group,
    wage,
    payroll,
    orgCode,
    organisation,
    orgName,
    push_to_xero,
  } = req.body;
  const id = req?.params?.id;
  if (!organisation.acl.employee.edit) {
    return res.status(403).json({
      message: "Access denied: You are not authorized to access this action.",
    });
  }
  const transaction = await db.transaction();
  try {
    if (organisation?.xero_connection && push_to_xero) {
      if (organisation?.xero_connection && push_to_xero) {
        if (!organisation?.settings?.default_ordinary_hours_earning_rate_type) {
          return res.status(501).json({
            message:
              "To push the employee to Xero, you must set up a default ordinary hours earning rate in the Organisation settings",
          });
        }
        if (!organisation?.settings?.default_superannuation_expense_account) {
          return res.status(501).json({
            message:
              "To push the employee to Xero, you must set up a default superannuation expense account in the Organisation settings",
          });
        }
        if (!organisation?.settings?.default_superannuation_liability_account) {
          return res.status(501).json({
            message:
              "To push the employee to Xero, you must set up a default superannuation liability account in the Organisation settings",
          });
        }
      }
    }
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
    await employeeService.createOrUpdateEmployeeManagementGroup(
      user,
      organisation,
      action,
      management_group,
      employee,
      details,
      id,
      transaction,
    );
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

    if (organisation?.xero_connection && push_to_xero) {
      await enqueueSingleEmployeeToXero({
        user,
        organisation,
        employee: { details, wage, payroll },
      });
    }

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
              attributes: ["id", "user_id", "role_id"],
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
    console.log(
      "organisation_xero_connection::",
      organisation?.xero_connection,
    );
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

    // Fetch from Xero first
    let xeroEmployee;
    if (organisation?.xero_connection) {
      const xeroEmployee = await xeroService.fetchEmployeeByEmail(
        user,
        organisation,
        email,
      );
    }

    let formattedEmployee;
    if (xeroEmployee) {
      const state = await States.findOne({
        where: { code: xeroEmployee?.homeAddress?.region },
        raw: true,
      });
      const employmentStatus = await EmploymentStatus.findOne({
        where: { code: xeroEmployee?.status },
        raw: true,
      });
      const employmentTypes = await EmploymentTypes.findOne({
        where: { code: xeroEmployee?.taxDeclaration?.employmentBasis },
        raw: true,
      });

      const payrollCalendar = await PayrollCalendars.findOne({
        where: { xero_payroll_calendar_id: xeroEmployee?.payrollCalendarID },
        raw: true,
      });

      const xeroPayrollCalendar = await xeroService.fetchPayrollCalendarById(
        user,
        organisation,
        xeroEmployee?.payrollCalendarID,
      );

      formattedEmployee = {
        details: {
          id: null,
          first_name: xeroEmployee?.firstName,
          middle_name: xeroEmployee?.middleNames,
          last_name: xeroEmployee?.lastName,
          email: xeroEmployee?.email,
          preferred_name: xeroEmployee?.title,
          address: xeroEmployee?.homeAddress?.addressLine1,
          address_2: xeroEmployee?.homeAddress?.addressLine2,
          city: xeroEmployee?.homeAddress?.city,
          state: state,
          postcode: xeroEmployee?.homeAddress?.postalCode,
          dob: moment(xeroEmployee?.dateOfBirth).format("YYYY-MM-DD"),
          phone_number: xeroEmployee?.mobile || xeroEmployee?.phone,
          role: null,
          region: null,
          nok: null,
          nok_relationship: null,
          nok_phone_number: null,
          xero_employee_id: xeroEmployee?.employeeID,
        },
        management_group: {
          manager_of_groups: null,
          staff_of_group: null,
        },
        wage: {
          start_date: moment(xeroEmployee?.startDate).format("YYYY-MM-DD"),
          employment_status: employmentStatus,
          payroll_calendar: payrollCalendar || null,
          xero_payroll_calendar: xeroPayrollCalendar || null,
          use_xero_payroll_calendar: false,
          employment_type: employmentTypes,
          hourly_rate_exc_super:
            `${xeroEmployee?.payTemplate?.earningsLines[0]?.ratePerUnit}.00` ||
            null,
          timesheet_submission_frequency: null,
          award_rate: null,
        },
        payroll: {
          tax_file_number: null,
          superannuation_fund: null,
          superannuation_member_number: null,
          bank_bsb: xeroEmployee?.bankAccounts[0]?.bSB || null,
          bank_account_number:
            xeroEmployee?.bankAccounts[0]?.accountNumber || null,
          bank_account_name: xeroEmployee?.bankAccounts[0]?.accountName || null,
          bank_statement_text:
            xeroEmployee?.bankAccounts[0]?.statementText || null,
        },
        push_to_xero: true,
        action: {
          edit: true,
          create: false,
          message:
            "An employee with this email already exists in your Xero organisation. You can send an invitation to this employee.",
          found_in_xero: true,
          create_user: true,
        },
      };
    } else {
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
            region: null,
            nok: null,
            nok_relationship: null,
            nok_phone_number: null,
            xero_employee_id: null,
          },
          management_group: {
            manager_of_groups: null,
            staff_of_group: null,
          },
          wage: {
            start_date: null,
            employment_status: null,
            payroll_calendar: null,
            employment_type: null,
            hourly_rate_exc_super: null,
            timesheet_submission_frequency: null,
            award_rate: null,
          },
          payroll: {
            tax_file_number: null,
            superannuation_fund: null,
            superannuation_member_number: null,
            bank_bsb: null,
            bank_account_number: null,
            bank_account_name: null,
            bank_statement_text: null,
          },
          push_to_xero: true,
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
            region: null,
            nok: null,
            nok_relationship: null,
            nok_phone_number: null,
            xero_employee_id: null,
          },
          management_group: {
            manager_of_groups: null,
            staff_of_group: null,
          },
          wage: {
            start_date: null,
            employment_status: null,
            payroll_calendar: null,
            employment_type: null,
            hourly_rate_exc_super: null,
            timesheet_submission_frequency: null,
            award_rate: null,
          },
          payroll: {
            tax_file_number: null,
            superannuation_fund: null,
            superannuation_member_number: null,
            bank_bsb: null,
            bank_account_number: null,
            bank_account_name: null,
            bank_statement_text: null,
          },
          push_to_xero: true,
          action: {
            edit: false,
            create: true,
            message:
              "No existing user was found in Xero or any other organisation. You can create a new user and employee account for this email, then send an invitation.",
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
