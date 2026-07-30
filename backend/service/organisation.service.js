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
) {
  try {
    const currentUTCTime = moment().utc().format();

    const employee = await Employees.create(
      {
        user_id: user.id,
        organisation_id: organisationId,
        created_at: currentUTCTime,
        created_by: user.id,
        updated_at: currentUTCTime,
        updated_by: user.id,
      },
      { transaction },
    );

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
