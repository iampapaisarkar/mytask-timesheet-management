import { fn, col, literal, Op } from "sequelize";
import models from "../models/index.js";
const {
  Organisations,
  OrganisationSettings,
  Employees,
  Users,
  OrganisationRoles,
  UserOrganisationRoles,
} = models;
import Auth from "#auth";
import { Acl } from "#acl";
import moment from "moment";
import { currencyFromCountryIso } from "../utils/currency.utils.js";

class AppError extends Error {
  constructor(message, statusCode = 400) {
    super(message);
    this.statusCode = statusCode;
    this.isOperational = true;
  }
}

async function getOrganisation(userId, orgCode) {
  try {
    const organisationResponse = await Organisations.scope({
      method: ["withUser", userId],
    }).findOne({
      where: { code: orgCode },
      raw: false,
      nest: true,
    });

    const organisation = organisationResponse?.toJSON() ?? null;

    const acl = await Acl.organisationAcl(organisation?.role?.code);

    const settingsRow = await OrganisationSettings.findAll({
      where: { organisation_id: organisation.id },
      raw: true,
    });

    const settings = {};

    settingsRow.forEach((row) => {
      settings[row.key] = safeParse(row.value);
    });

    const dailyLogFrequency = parseFloat(
      process.env.ORG_DEFAULT_DAILY_LOG_FREQUENCY,
    );

    // fetch owner
    const orgOwner = await Users.findOne({
      include: [
        {
          model: UserOrganisationRoles,
          as: "user_organisations_role",
          where: {
            organisation_id: organisation.id,
          },
          include: [
            {
              model: OrganisationRoles,
              as: "role",
              where: {
                code: "owner",
              },
            },
          ],
        },
      ],
    });

    return {
      success: true,
      data: {
        ...organisation,
        owner: orgOwner,
        acl: acl,
        settings: settings,
        daily_log_frequency: dailyLogFrequency,
      },
    };
  } catch (err) {
    return {
      success: false,
      message: "Unable to fetch organisations",
      details: err.message,
    };
  }
}

function safeParse(value) {
  if (typeof value !== "string") return value;

  try {
    return JSON.parse(value);
  } catch (e) {
    return value; // return as-is if not valid JSON
  }
}

async function createOrgAdminEmployee(
  organisationId,
  user,
  transaction,
  options = {},
) {
  try {
    const currentUTCTime = moment().utc().format();
    const { payrollCalendarId = null } = options;

    const employee = await Employees.create(
      {
        user_id: user.id,
        organisation_id: organisationId,
        preferred_name: user.first_name || null,
        phone_number: user.phone_number || null,
        phone_country_code: user.phone_country_code || null,
        phone_country_iso: user.phone_country_iso || null,
        created_at: currentUTCTime,
        created_by: user.id,
        updated_at: currentUTCTime,
        updated_by: user.id,
      },
      { transaction },
    );

    // Owner needs a wage row linked to the org payroll calendar so timesheets
    // and pay-period lookups work immediately after signup.
    if (payrollCalendarId) {
      const { EmployeeWages, EmployeePayrolls, EmploymentTypes } = models;
      const fullTime = await EmploymentTypes.findOne({
        where: { code: "FULLTIME" },
        raw: true,
        transaction,
      });

      await EmployeeWages.create(
        {
          organisation_id: organisationId,
          employee_id: employee.id,
          start_date: moment().format("YYYY-MM-DD"),
          payroll_calendar_id: payrollCalendarId,
          employment_type_id: fullTime?.id || null,
          pay_type: "HOURLY",
          currency:
            options.currency ||
            currencyFromCountryIso(options.countryIso) ||
            "USD",
          hourly_rate_exc_super: 500,
          fixed_rate_exc_super: null,
          created_at: currentUTCTime,
          created_by: user.id,
          updated_at: currentUTCTime,
          updated_by: user.id,
        },
        { transaction },
      );

      await EmployeePayrolls.create(
        {
          organisation_id: organisationId,
          employee_id: employee.id,
          payment_method: "BANK_TRANSFER",
          account_holder_name: [user.first_name, user.last_name]
            .filter(Boolean)
            .join(" "),
          bank_name: "Demo Bank",
          bank_account_number: "0000000000",
          ifsc_code: "DEMO0000001",
          created_at: currentUTCTime,
          created_by: user.id,
          updated_at: currentUTCTime,
          updated_by: user.id,
        },
        { transaction },
      );
    }

    return employee;
  } catch (err) {
    console.log("createOrgAdminEmployeeError::", err);
    if (err instanceof AppError) {
      throw err;
    }
    throw new AppError(
      "Unable to create employee on organisation create!",
      500,
    );
  }
}

export default {
  getOrganisation,
  createOrgAdminEmployee,
};
