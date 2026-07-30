import { fn, col, literal, Op } from "sequelize";
import models from "../models/index.js";
const {
  Users,
  Organisations,
  OrganisationRoles,
  UserOrganisationRoles,
  EmployeeInvitations,
  InvitationStatus,
  Employees,
  OrganisationSettings,
  TimesheetSubmissionFrequencies,
  OrganisationAddress,
  PayrollCalendars,
  PayCycles,
} = models;
import Auth from "#auth";
import moment from "moment";
import crypto from "crypto";
import redisUtils from "../utils/redis.utils.js";
import organisationService from "../service/organisation.service.js";
import { enqueueSendEmail } from "../queue-jobs/send-email.job.js";
import { enqueueSendNotification } from "../queue-jobs/send-notification.job.js";
import { db } from "../database.js";
import { SystemFunction } from "#systemfunction";
import { resolveStateId } from "../utils/state.utils.js";
import { resolvePhoneFields } from "../utils/phone.js";
import {
  assertAddressSelected,
  buildAddressRow,
} from "../utils/address.utils.js";

export async function list(req, res, next) {
  const { user } = req.body;
  let { rows_per_page, page_number, sort_by, sort_direction, search } =
    req.query;

  try {
    const rowsPerPage = parseInt(rows_per_page) || 10;
    const pageNumber = parseInt(page_number) || 1;
    const offset = (pageNumber - 1) * rowsPerPage;
    const sortBy = sort_by || "id";
    const sortDirection = sort_direction || "asc";

    const { count, rows: organisations } = await Organisations.scope({
      method: ["withUser", user.id],
    }).findAndCountAll({
      offset,
      limit: rowsPerPage,
      order: [[sortBy, sortDirection]],
      raw: false,
      nest: true,
    });

    const total_pages = Math.ceil(organisations.length / rowsPerPage);

    return res.status(200).json({
      data: organisations,
      pagination: {
        total_rows: organisations.length,
        rows_per_page: rowsPerPage,
        page_number: pageNumber,
        total_pages,
        sort_by: sortBy,
        sort_direction: sortDirection,
      },
    });
  } catch (err) {
    console.error("Error fetching organisations:", err);
    return res.status(500).json({
      message: "Unable to fetch organisations",
      details: err.message,
    });
  }
}

export async function get(req, res, next) {
  const { user, orgId } = req.body;
  const orgCode = req?.params?.orgCode;
  try {
    const cacheKey = `organisation:${orgCode}:${user.id}`;
    const cached = await redisUtils.getCache(cacheKey);
    if (cached) {
      return res.status(200).json({
        data: cached,
      });
    }

    const response = await organisationService.getOrganisation(
      user.id,
      orgCode,
    );

    if (response.success) {
      await redisUtils.setCache(cacheKey, response.data);

      return res.status(200).json({
        data: response.data,
      });
    } else {
      return res.status(500).json(response);
    }
  } catch (err) {
    console.error("Error fetching organisations:", err);
    return res.status(500).json({
      message: "Unable to fetch organisations",
      details: err.message,
    });
  }
}

export async function create(req, res, next) {
  const {
    user,
    name,
    address,
    website,
    phone_number,
    phone_country_code,
    phone_country_iso,
    default_country,
    email,
  } = req.body;
  let transaction;
  try {
    const ownOrganisations = await Auth.getOwnOrganisations(user.id);
    if (ownOrganisations.length === 3) {
      return res.status(501).json({
        message: "Can't create more than 3 organisations",
      });
    }

    if (!name) {
      return res.status(501).json({
        message: "Name is required!",
      });
    }

    if (!address?.address_1 && !address?.formatted_address && !address?.street_address) {
      return res.status(400).json({
        message: "Please select an address from Google Places suggestions.",
      });
    }

    let phoneFields;
    try {
      phoneFields = resolvePhoneFields({
        phone_number,
        phone_country_code,
        phone_country_iso,
        required: true,
      });
    } catch (phoneErr) {
      return res.status(phoneErr.status || 400).json({
        message: phoneErr.message,
      });
    }
    if (!email) {
      return res.status(501).json({
        message: "Email is required!",
      });
    }

    transaction = await db.transaction();

    const currentUTCTime = moment().utc().format();

    const orgCode = generateOrgCode();

    const orgDefaultCountry =
      (typeof default_country === "string" && default_country.length === 2
        ? default_country.toUpperCase()
        : null) || phoneFields.phone_country_iso;

    const response = await Organisations.create(
      {
        name: name,
        website: website || null,
        phone_number: phoneFields.phone_number,
        phone_country_code: phoneFields.phone_country_code,
        phone_country_iso: phoneFields.phone_country_iso,
        default_country: orgDefaultCountry,
        email: email,
        code: orgCode,
        created_at: currentUTCTime,
        updated_at: currentUTCTime,
      },
      { transaction },
    );

    // Create Address
    if (address) {
      const stateId = await resolveStateId(
        address.state ||
          (address.administrative_area
            ? { name: address.administrative_area }
            : null),
        transaction,
      );
      const row = buildAddressRow(address, {
        organisationId: response.id,
        extra: { state_id: stateId },
      });
      await OrganisationAddress.create(row, { transaction });
    }

    const role = await OrganisationRoles.findOne({
      attributes: ["id", "code"],
      where: { code: "owner" },
      raw: true,
      transaction,
    });

    await UserOrganisationRoles.create(
      {
        organisation_id: response.id,
        user_id: user.id,
        role_id: role.id,
      },
      { transaction },
    );

    const timesheetSubmissionFrequency =
      await TimesheetSubmissionFrequencies.findOne({
        where: {
          code: "by-pay-cycle",
        },
        raw: true,
        transaction,
      });

    await OrganisationSettings.create(
      {
        organisation_id: response.id,
        value: timesheetSubmissionFrequency.id,
        key: "timesheet_submission_frequency",
      },
      { transaction },
    );

    // create org admin as first employee
    await organisationService.createOrgAdminEmployee(
      response.id,
      user,
      transaction,
    );

    await transaction.commit();

    await redisUtils.delCache(`user:${user.id}`);

    const userResponse = await Auth.getUser(user.id);
    return res.status(200).json({
      data: { user: userResponse.user },
      message: "Organisation created",
    });
  } catch (err) {
    if (transaction) {
      await transaction.rollback();
    }
    console.log("error::", err);
    return res.status(err.statusCode || 500).json({
      message:
        err.message || "Unable to create organisation. Please ty again later.",
    });
  }
}

export async function update(req, res, next) {
  const {
    user,
    name,
    address,
    website,
    phone_number,
    phone_country_code,
    phone_country_iso,
    default_country,
    email,
    organisation,
    orgCode,
  } = req.body;

  try {
    if (!name) {
      return res.status(501).json({
        message: "Name is required!",
      });
    }

    if (!address?.address_1 && !address?.formatted_address && !address?.street_address) {
      return res.status(400).json({
        message: "Please select an address from Google Places suggestions.",
      });
    }

    let phoneFields;
    try {
      phoneFields = resolvePhoneFields({
        phone_number,
        phone_country_code,
        phone_country_iso,
        required: true,
      });
    } catch (phoneErr) {
      return res.status(phoneErr.status || 400).json({
        message: phoneErr.message,
      });
    }
    if (!email) {
      return res.status(501).json({
        message: "Email is required!",
      });
    }

    const currentUTCTime = moment().utc().format();

    const orgDefaultCountry =
      typeof default_country === "string" && default_country.length === 2
        ? default_country.toUpperCase()
        : phoneFields.phone_country_iso;

    const response = await Organisations.update(
      {
        name: name,
        website: website || null,
        phone_number: phoneFields.phone_number,
        phone_country_code: phoneFields.phone_country_code,
        phone_country_iso: phoneFields.phone_country_iso,
        default_country: orgDefaultCountry,
        email: email,
        updated_at: currentUTCTime,
      },
      {
        where: { id: organisation.id },
      },
    );

    // Destroy old address
    await OrganisationAddress.destroy({
      where: {
        organisation_id: organisation.id,
      },
    });

    // Create Address
    if (address) {
      const stateId = await resolveStateId(
        address.state ||
          (address.administrative_area
            ? { name: address.administrative_area }
            : null),
      );
      const row = buildAddressRow(address, {
        organisationId: organisation.id,
        extra: { state_id: stateId },
      });
      await OrganisationAddress.create(row);
    }

    await redisUtils.deleteMultiKeyCache(`organisation:${organisation.id}:*`);
    await redisUtils.deleteMultiKeyCache(`organisation:${orgCode}:*`);
    await redisUtils.delCache(`user:*`);

    const orgRespone = await organisationService.getOrganisation(
      user.id,
      orgCode,
    );

    return res.status(200).json({
      message: "Organisation details updated",
      data: orgRespone.data,
    });
  } catch (err) {
    console.log("error::", err);
    res.status(500).json({
      message: "Unable to update organisation details. Please ty again later.",
      details: err,
    });
  }
}

export async function updateSettings(req, res, next) {
  const { user, organisation, timesheet_submission_frequency, leaves, xero } =
    req.body;
  try {
    // return res.status(500).json({
    //   data: xero,
    // });

    const currentUTCTime = moment().utc().format();

    // if (!timesheet_submission_frequency) {
    //   return res.status(501).json({
    //     message: "Timesheet submission frequency is required!",
    //   });
    // }

    // if (!default_ordinary_hours_earning_rate_type) {
    //   return res.status(501).json({
    //     message: "Default ordinary hours earning rate type is required!",
    //   });
    // }

    // timesheet submission frequency
    if (timesheet_submission_frequency) {
      let timesheetSubmissionFrequencySetting =
        await OrganisationSettings.findOne({
          where: {
            key: "timesheet_submission_frequency",
            organisation_id: organisation.id,
          },
        });

      if (timesheetSubmissionFrequencySetting) {
        timesheetSubmissionFrequencySetting.value =
          timesheet_submission_frequency;
        await timesheetSubmissionFrequencySetting.save();
      } else {
        await OrganisationSettings.create({
          organisation_id: organisation.id,
          value: timesheet_submission_frequency,
          key: "timesheet_submission_frequency",
        });
      }
    }

    // xero setup
    if (xero) {
      if (xero.default_ordinary_hours_earning_rate_type) {
        let defaultOrdinaryHoursEarningRateType =
          await OrganisationSettings.findOne({
            where: {
              key: "default_ordinary_hours_earning_rate_type",
              organisation_id: organisation.id,
            },
          });

        if (defaultOrdinaryHoursEarningRateType) {
          defaultOrdinaryHoursEarningRateType.value =
            xero.default_ordinary_hours_earning_rate_type;
          await defaultOrdinaryHoursEarningRateType.save();
        } else {
          await OrganisationSettings.create({
            organisation_id: organisation.id,
            value: xero.default_ordinary_hours_earning_rate_type,
            key: "default_ordinary_hours_earning_rate_type",
          });
        }
      }
      if (xero.default_earning_rate_expense_account) {
        let defaultEarningrateExpenseAccount =
          await OrganisationSettings.findOne({
            where: {
              key: "default_earning_rate_expense_account",
              organisation_id: organisation.id,
            },
          });

        if (defaultEarningrateExpenseAccount) {
          defaultEarningrateExpenseAccount.value =
            xero.default_earning_rate_expense_account;
          await defaultEarningrateExpenseAccount.save();
        } else {
          await OrganisationSettings.create({
            organisation_id: organisation.id,
            value: xero.default_earning_rate_expense_account,
            key: "default_earning_rate_expense_account",
          });
        }
      }
      if (xero.default_superannuation_expense_account) {
        let defaultSuperannuationExpenseAccount =
          await OrganisationSettings.findOne({
            where: {
              key: "default_superannuation_expense_account",
              organisation_id: organisation.id,
            },
          });

        if (defaultSuperannuationExpenseAccount) {
          defaultSuperannuationExpenseAccount.value =
            xero.default_superannuation_expense_account;
          await defaultSuperannuationExpenseAccount.save();
        } else {
          await OrganisationSettings.create({
            organisation_id: organisation.id,
            value: xero.default_superannuation_expense_account,
            key: "default_superannuation_expense_account",
          });
        }
      }
      if (xero.default_superannuation_liability_account) {
        let defaultSuperannuationLiabilityAccount =
          await OrganisationSettings.findOne({
            where: {
              key: "default_superannuation_liability_account",
              organisation_id: organisation.id,
            },
          });

        if (defaultSuperannuationLiabilityAccount) {
          defaultSuperannuationLiabilityAccount.value =
            xero.default_superannuation_liability_account;
          await defaultSuperannuationLiabilityAccount.save();
        } else {
          await OrganisationSettings.create({
            organisation_id: organisation.id,
            value: xero.default_superannuation_liability_account,
            key: "default_superannuation_liability_account",
          });
        }
      }

      if (xero.payroll_calendars) {
        for (const payrollCalendar of xero.payroll_calendars) {
          const exitingAppPayroll = await PayrollCalendars.findOne({
            where: {
              xero_payroll_calendar_id: payrollCalendar.payrollCalendarID,
            },
          });

          if (!exitingAppPayroll) {
            const payCycle = await PayCycles.findOne({
              where: {
                code: payrollCalendar.calendarType,
              },
            });
            const end_date =
              await SystemFunction.getPayrollEndDateByPayCycleType(
                payCycle.code,
                payrollCalendar.startDate,
              );
            await PayrollCalendars.create({
              organisation_id: organisation.id,
              name: payrollCalendar.name,
              pay_cycle_id: payCycle.id,
              start_date: payrollCalendar.startDate,
              end_date: end_date,
              first_payment_date: payrollCalendar.paymentDate,
              default: false,
              xero_payroll_calendar_id: payrollCalendar.payrollCalendarID,
              created_at: currentUTCTime,
              created_by: user.id,
              updated_at: currentUTCTime,
              updated_by: user.id,
            });
          }
        }
      }
    }

    // // leaves
    // const leavesSetting = await OrganisationSettings.findOne({
    //   where: {
    //     key: "leaves",
    //   },
    //   raw: true,
    // });

    // if (leavesSetting) {
    //   await OrganisationSettings.update(
    //     {
    //       value: leaves,
    //     },
    //     {
    //       where: {
    //         organisation_id: organisation.id,
    //         key: "leaves",
    //       },
    //     }
    //   );
    // } else {
    //   await OrganisationSettings.create({
    //     organisation_id: organisation.id,
    //     value: leaves,
    //     key: "leaves",
    //   });
    // }

    await redisUtils.deleteMultiKeyCache(`organisation:${organisation.id}:*`);
    await redisUtils.deleteMultiKeyCache(`organisation:${organisation.code}:*`);
    await redisUtils.delCache(`user:*`);

    const response = await organisationService.getOrganisation(
      user.id,
      organisation.code,
    );

    return res.status(200).json({
      message: "Organisation settings updated",
      data: response.data,
    });
  } catch (err) {
    console.log("error::", err);
    res.status(500).json({
      message: "Unable to update organisation settings. Please ty again later.",
      details: err,
    });
  }
}

export async function orgniastionInvitations(req, res, next) {
  const { user } = req.body;
  try {
    const response = await EmployeeInvitations.findAll({
      // attributes: ["*"],
      where: {
        user_id: user.id,
        "$status.code$": "invited",
      },
      include: [
        {
          model: InvitationStatus,
          as: "status",
          attributes: ["id", "name", "code"],
        },
        {
          model: Organisations,
          as: "organisation",
          attributes: ["id", "name"],
        },
        {
          model: OrganisationRoles,
          as: "role",
          attributes: ["id", "name", "code"],
        },
        {
          model: Employees.unscoped(),
          as: "employee",
          attributes: ["id", "created_by"],
          include: [
            {
              model: Users,
              as: "creator",
              attributes: [
                "id",
                "first_name",
                "middle_name",
                "last_name",
                "full_name",
              ],
            },
          ],
        },
      ],
      raw: false,
      nest: true,
    });

    return res.status(200).json({
      data: response,
    });
  } catch (err) {
    console.log("error::", err);
    return res.status(500).json({
      message: "Unable to fetch employee invitations!",
      details: err,
    });
  }
}

export async function acceptInvitation(req, res, next) {
  const { user, id, organisation_id, invitation_token, employee_id } = req.body;
  try {
    const invitationReponse = await EmployeeInvitations.findOne({
      where: {
        id: id,
        organisation_id: organisation_id,
        invitation_token: invitation_token,
      },
      include: [
        {
          model: InvitationStatus,
          as: "status",
          attributes: ["id", "name", "code"],
        },
      ],
      raw: false,
      nest: true,
    });

    const invitation = invitationReponse?.toJSON() ?? null;

    if (!invitation) {
      return res.status(501).json({
        message: "Invalid organisation or invitation is expire!",
      });
    }

    if (
      invitation?.status.code === "accept" ||
      invitation?.status.code === "reject"
    ) {
      return res.status(501).json({
        message: "Invitation already accepted or rejected",
      });
    }

    const invitationStatus = await InvitationStatus.findOne({
      where: {
        code: "accept",
      },
      raw: true,
    });

    await EmployeeInvitations.update(
      {
        user_id: user.id,
        status_id: invitationStatus.id,
      },
      {
        where: {
          id: id,
          organisation_id: organisation_id,
          invitation_token: invitation_token,
        },
      },
    );

    const currentUTCTime = moment().utc().format();

    await Employees.update(
      {
        user_id: user.id,
        updated_at: currentUTCTime,
        updated_by: user.id,
      },
      {
        where: {
          id: employee_id,
          organisation_id: organisation_id,
        },
      },
    );

    const role = await OrganisationRoles.findOne({
      attributes: ["id", "code"],
      where: { id: invitation.organisation_role_id },
      raw: true,
    });

    await UserOrganisationRoles.create({
      organisation_id: organisation_id,
      user_id: user.id,
      role_id: role.id,
    });

    await sendEmailAndNotification(user, organisation_id, invitation, "Accept");

    await redisUtils.delCache(`organisation:*`);
    await redisUtils.delCache(`user:${user.id}`);

    return res.status(200).json({
      message: "Organisation accepted",
    });
  } catch (err) {
    console.log("error::", err);
    return res.status(500).json({
      message: "Unable to accept invitation!",
      details: err,
    });
  }
}

export async function rejectInvitation(req, res, next) {
  const { user, id, organisation_id, invitation_token, employee_id } = req.body;
  try {
    const invitationReponse = await EmployeeInvitations.findOne({
      where: {
        id: id,
        organisation_id: organisation_id,
        invitation_token: invitation_token,
      },
      include: [
        {
          model: InvitationStatus,
          as: "status",
          attributes: ["id", "name", "code"],
        },
      ],
      raw: false,
      nest: true,
    });

    const invitation = invitationReponse?.toJSON() ?? null;

    if (!invitation) {
      return res.status(501).json({
        message: "Invalid organisation or invitation is expire!",
      });
    }

    if (
      invitation?.status.code === "accept" ||
      invitation?.status.code === "reject"
    ) {
      return res.status(501).json({
        message: "Invitation already accepted or rejected",
      });
    }

    const invitationStatus = await InvitationStatus.findOne({
      where: {
        code: "reject",
      },
      raw: true,
    });

    await EmployeeInvitations.update(
      {
        user_id: user.id,
        status_id: invitationStatus.id,
      },
      {
        where: {
          id: id,
          organisation_id: organisation_id,
          invitation_token: invitation_token,
        },
      },
    );

    await sendEmailAndNotification(user, organisation_id, invitation, "Reject");

    await redisUtils.delCache(`organisation:*`);
    await redisUtils.delCache(`user:${user.id}`);

    return res.status(200).json({
      message: "Organisation rejected",
    });
  } catch (err) {
    console.log("error::", err);
    return res.status(500).json({
      message: "Unable to accept invitation!",
      details: err,
    });
  }
}

async function sendEmailAndNotification(
  user,
  organisationId,
  inviation,
  status,
) {
  try {
    /* ----------------------------------
     * Get invited employee user
     * ---------------------------------- */
    const invitedUser = await Users.findOne({
      attributes: [
        "id",
        "first_name",
        "middle_name",
        "last_name",
        "full_name",
        "email",
      ],
      where: {
        id: inviation?.user_id,
      },
    });

    if (!invitedUser) {
      throw new Error("Invited user not found!");
    }

    /* ----------------------------------
     * Get organisation
     * ---------------------------------- */
    const organisation = await Organisations.findOne({
      where: {
        id: organisationId,
      },
      raw: true,
    });

    if (!organisation) {
      throw new Error("Organisation not found!");
    }

    /* ----------------------------------
     * Get organisation owner
     * ---------------------------------- */
    const organisationAdmins = await UserOrganisationRoles.findAll({
      where: {
        organisation_id: organisation.id,
        user_id: {
          [Op.ne]: user.id, // ❌ exclude current user
        },
      },
      include: [
        {
          model: Users,
          as: "user",
        },
        {
          model: OrganisationRoles,
          as: "role",
          attributes: ["id", "name", "code"],
          where: {
            code: {
              [Op.in]: ["owner", "moderator"],
            },
          },
        },
      ],
      raw: true,
      nest: true,
    });

    /* ----------------------------------
     * NORMAL USERS (staff / managers)
     * ---------------------------------- */
    const subject = `Employee ${status} Invitation - ${organisation.name}`;
    const bodyMessage = `${
      invitedUser?.full_name || "Employee"
    } has been ${status.toLowerCase()} invitation.`;

    const uniqueAdminsMap = new Map();

    organisationAdmins?.forEach((orgAdmin) => {
      const orgUser = orgAdmin?.user;
      if (orgUser?.id && orgUser?.id != user.id) {
        // Map ensures no duplicate user.id
        uniqueAdminsMap.set(orgUser.id, {
          user_id: orgUser.id,
          email: orgUser.email,
        });
      }
    });

    const uniqueUsers = Array.from(uniqueAdminsMap.values());
    const sendToEmails = uniqueUsers.map((u) => u.email);
    const sendToNotificationUserIds = uniqueUsers.map((u) => u.user_id);

    /* ----------------------------------
     * SEND EMAILS
     * ---------------------------------- */
    if (sendToEmails.length) {
      const message = {
        subject,
        template: "invitation-state.html",
        variables: {
          title: subject,
          message: bodyMessage,
        },
      };

      await enqueueSendEmail({
        user,
        organisation,
        userEmails: [...new Set(sendToEmails)],
        message,
      });
    }

    /* ----------------------------------
     * SEND PUSH NOTIFICATIONS
     * ---------------------------------- */
    if (sendToNotificationUserIds.length) {
      await enqueueSendNotification({
        user: user,
        sentToUserIds: sendToNotificationUserIds,
        message: {
          title: subject,
          body: bodyMessage,
        },
      });
    }
  } catch (err) {
    throw err;
  }
}

function generateOrgCode(length = 8) {
  const chars = "ABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789";
  const bytes = crypto.randomBytes(length);
  let result = "";

  for (let i = 0; i < length; i++) {
    result += chars[bytes[i] % chars.length];
  }

  return result;
}
