import { fn, col, literal, Op } from "sequelize";
import models from "../models/index.js";
const {
  Users,
  Organisations,
  OrganisationRoles,
  UserOrganisationRoles,
  Employees,
  EmployeeInvitations,
  InvitationStatus,
  Regions,
  NokRelations,
  ManagementGroupEmployees,
  EmployeeWages,
  EmployeePayrolls,
  PayrollCalendars,
  PayCycles,
  EmployeeAddress,
} = models;
import { enqueueSendEmail } from "../queue-jobs/send-email.job.js";
import { enqueueSendNotification } from "../queue-jobs/send-notification.job.js";
import { SystemFunction } from "#systemfunction";
import moment from "moment";
import { resolveStateId } from "../utils/state.utils.js";
import { resolvePhoneFields } from "../utils/phone.js";
import { buildAddressRow } from "../utils/address.utils.js";
class AppError extends Error {
  constructor(message, statusCode = 400) {
    super(message);
    this.statusCode = statusCode;
    this.isOperational = true;
  }
}

async function createOrUpdateEmployeeDetails(
  user,
  organisation,
  action,
  details,
  id = null,
  transaction,
) {
  try {
    if (action?.create_user) {
      if (!details.first_name) {
        throw new AppError("First name is required!", 400);
      }
      if (!details.last_name) {
        throw new AppError("Last name is required!", 400);
      }
    }
    if (!details.email) {
      throw new AppError("Email is required!", 400);
    }
    if (!details.dob) {
      throw new AppError("Date of Birth is required!", 400);
    }

    if (!details?.address?.address_1 && !details?.address?.formatted_address) {
      throw new AppError(
        "Please select an address from Google Places suggestions.",
        400,
      );
    }
    let phoneFields;
    let nokPhoneFields;
    try {
      phoneFields = resolvePhoneFields({
        phone_number: details.phone_number,
        phone_country_code: details.phone_country_code,
        phone_country_iso: details.phone_country_iso,
        required: true,
      });
      nokPhoneFields = resolvePhoneFields({
        phone_number: details.nok_phone_number,
        phone_country_code: details.nok_phone_country_code,
        phone_country_iso: details.nok_phone_country_iso,
        required: false,
        label: "Next of kin phone",
      });
    } catch (err) {
      throw new AppError(err.message, err.status || 400);
    }
    if (!details.role) {
      throw new AppError("Role is required!", 400);
    }
    if (!details.region) {
      throw new AppError("Region is required!", 400);
    }

    const currentUTCTime = moment().utc().format();

    const userRepsonse = await Users.findOne({
      where: {
        email: details.email,
      },
      raw: true,
    });

    let userId = userRepsonse?.id || null;

    if (id) {
      const employee = await Employees.update(
        {
          nok: details?.nok || null,
          nok_relation_id: details?.nok_relationship?.id || null,
          nok_phone_number: nokPhoneFields.phone_number,
          nok_phone_country_code: nokPhoneFields.phone_country_code,
          nok_phone_country_iso: nokPhoneFields.phone_country_iso,
          award_id: null,
          region_id: details.region.id,
          preferred_name: details.preferred_name,
          phone_number: phoneFields.phone_number,
          phone_country_code: phoneFields.phone_country_code,
          phone_country_iso: phoneFields.phone_country_iso,
          updated_at: currentUTCTime,
          updated_by: user.id,
        },
        {
          where: { id: id, organisation_id: organisation.id },
          transaction,
        },
      );

      // Destroy old address
      await EmployeeAddress.destroy({
        where: {
          organisation_id: organisation.id,
          employee_id: id,
        },
        transaction,
      });

      // Create address
      if (details?.address) {
        const stateId = await resolveStateId(
          details.address.state ||
            (details.address.administrative_area
              ? { name: details.address.administrative_area }
              : null),
          transaction,
        );
        const row = buildAddressRow(details.address, {
          organisationId: organisation.id,
          extra: { employee_id: id, state_id: stateId },
        });
        await EmployeeAddress.create(row, { transaction });
      }

      if (userId) {
        await UserOrganisationRoles.update(
          {
            role_id: details.role.id,
          },
          {
            where: { user_id: userId, organisation_id: organisation.id },
            transaction,
          },
        );
      }
      return employee;
    } else {
      if (action.create_user) {
        const createdUser = await Users.create(
          {
            first_name: details.first_name,
            middle_name: details?.middle_name,
            last_name: details.last_name,
            email: details.email,
            dob: details.dob,
          },
          { transaction },
        );
        userId = createdUser.id;
      }
      const employee = await Employees.create(
        {
          user_id: userId,
          organisation_id: organisation.id,
          nok: details?.nok || null,
          nok_relation_id: details?.nok_relationship?.id || null,
          nok_phone_number: nokPhoneFields.phone_number,
          nok_phone_country_code: nokPhoneFields.phone_country_code,
          nok_phone_country_iso: nokPhoneFields.phone_country_iso,
          award_id: null,
          region_id: details?.region?.id,
          preferred_name: details?.preferred_name,
          phone_number: phoneFields.phone_number,
          phone_country_code: phoneFields.phone_country_code,
          phone_country_iso: phoneFields.phone_country_iso,
          created_at: currentUTCTime,
          created_by: user.id,
          updated_at: currentUTCTime,
          updated_by: user.id,
        },
        { transaction },
      );

      // Create Address
      if (details?.address) {
        const stateId = await resolveStateId(
          details.address.state ||
            (details.address.administrative_area
              ? { name: details.address.administrative_area }
              : null),
          transaction,
        );
        const row = buildAddressRow(details.address, {
          organisationId: organisation.id,
          extra: { employee_id: employee.id, state_id: stateId },
        });
        await EmployeeAddress.create(row, { transaction });
      }

      // if (userId) {
      //   await UserOrganisationRoles.create({
      //     organisation_id: organisation.id,
      //     user_id: userId,
      //     role_id: details.role.id,
      //   });
      // }
      return employee;
    }
  } catch (err) {
    console.log("createOrUpdateEmployeeDetailsError::", err);
    if (err instanceof AppError) {
      throw err;
    }
    throw new AppError("Unable to create or update employee details!", 500);
  }
}

async function createOrUpdateEmployeeManagementGroup(
  user,
  organisation,
  action,
  management_group,
  employee,
  details,
  id = null,
  transaction,
) {
  try {
    const currentUTCTime = moment().utc().format();

    if (id) {
      const groupIds = [
        ...management_group?.manager_of_groups.map((item) => item.id),
        management_group?.staff_of_group?.id,
      ];
      await ManagementGroupEmployees.destroy({
        where: {
          employee_id: id,
          organisation_id: organisation.id,
          group_id: { [Op.in]: groupIds },
        },
        transaction,
      });
    }
    if (
      management_group?.manager_of_groups?.length > 0 &&
      details.role.code !== "staff"
    ) {
      for (const group of management_group.manager_of_groups) {
        await ManagementGroupEmployees.create(
          {
            organisation_id: organisation.id,
            group_id: group.id,
            employee_id: employee.id,
            is_manager: true,
          },
          { transaction },
        );
      }
    }
    if (management_group.staff_of_group) {
      await ManagementGroupEmployees.create(
        {
          organisation_id: organisation.id,
          group_id: management_group.staff_of_group.id,
          employee_id: employee.id,
          is_manager: false,
        },
        { transaction },
      );
    }
  } catch (err) {
    console.log("createOrUpdateEmployeeManagementGroupError::", err);
  }
}

async function createOrUpdateEmployeeWage(
  user,
  organisation,
  action,
  wage,
  employee,
  id = null,
  transaction,
) {
  try {
    if (!wage.start_date) {
      throw new AppError("Start date is required!", 400);
    }
    if (!wage.employment_status) {
      throw new AppError("Employment status is required!", 400);
    }
    if (!wage?.use_xero_payroll_calendar && !wage.payroll_calendar) {
      throw new AppError("Payroll calendar is required!", 400);
    }
    if (!wage.employment_type) {
      throw new AppError("Employment type is required!", 400);
    }
    if (!wage.hourly_rate_exc_super) {
      throw new AppError("Hourly rate exc super is required!", 400);
    }
    if (!wage.timesheet_submission_frequency) {
      throw new AppError("Timesheet submission frequency is required!", 400);
    }

    if (id) {
      await EmployeeWages.destroy({
        where: {
          employee_id: id,
          organisation_id: organisation.id,
        },
        transaction,
      });
    }

    const currentUTCTime = moment().utc().format();

    let payrollCalendar = wage.payroll_calendar;

    // store xero payroll calendar to system if use_xero_payroll_calendar true
    if (wage?.use_xero_payroll_calendar) {
      const payCyle = await PayCycles.findOne(
        {
          where: { code: wage?.xero_payroll_calendar?.calendarType },
          raw: true,
        },
        { transaction },
      );

      const end_date = await SystemFunction.getPayrollEndDateByPayCycleType(
        payCyle.code,
        moment(wage?.xero_payroll_calendar?.startDate).format("YYYY-MM-DD"),
      );

      payrollCalendar = await PayrollCalendars.create(
        {
          organisation_id: organisation.id,
          name: wage?.xero_payroll_calendar?.name,
          pay_cycle_id: payCyle.id,
          start_date: moment(wage?.xero_payroll_calendar?.startDate).format(
            "YYYY-MM-DD",
          ),
          end_date: end_date,
          first_payment_date: moment(
            wage?.xero_payroll_calendar?.paymentDate,
          ).format("YYYY-MM-DD"),
          default: false,
          xero_payroll_calendar_id:
            wage?.xero_payroll_calendar?.payrollCalendarID,
          created_at: currentUTCTime,
          created_by: user.id,
          updated_at: currentUTCTime,
          updated_by: user.id,
        },
        { transaction },
      );
    }

    await EmployeeWages.create(
      {
        organisation_id: organisation.id,
        employee_id: employee.id,
        start_date: moment(wage.start_date, "YYYY-MM-DD"),
        employment_status_id: wage.employment_status?.id,
        payroll_calendar_id: payrollCalendar?.id,
        employment_type_id: wage.employment_type?.id,
        hourly_rate_exc_super: wage.hourly_rate_exc_super,
        timesheet_submission_frequency: wage.timesheet_submission_frequency,
        award_rate_id: wage.award_rate?.id,
        created_at: currentUTCTime,
        created_by: user.id,
        updated_at: currentUTCTime,
        updated_by: user.id,
      },
      { transaction },
    );
  } catch (err) {
    console.log("createOrUpdateEmployeeWageError::", err);
    if (err instanceof AppError) {
      throw err;
    }
    throw new AppError("Unable to create or update employee wage!", 500);
  }
}

async function createOrUpdateEmployeePayroll(
  user,
  organisation,
  action,
  payroll,
  employee,
  id = null,
  transaction,
) {
  try {
    if (!payroll.tax_file_number) {
      throw new AppError("Tax file number is required!", 400);
    }
    if (!payroll.superannuation_fund) {
      throw new AppError("Superannuation fund is required!", 400);
    }
    if (!payroll.superannuation_member_number) {
      throw new AppError("Superannuation member number is required!", 400);
    }
    if (!payroll.bank_bsb) {
      throw new AppError("Bank BSB is required!", 400);
    }
    if (!payroll.bank_account_number) {
      throw new AppError("Bank account number is required!", 400);
    }
    if (!payroll.bank_account_name) {
      throw new AppError("Bank account name is required!", 400);
    }
    if (!payroll.bank_statement_text) {
      throw new AppError("Bank statement text is required!", 400);
    }

    const currentUTCTime = moment().utc().format();

    if (id) {
      await EmployeePayrolls.destroy({
        where: {
          employee_id: id,
          organisation_id: organisation.id,
        },
        transaction,
      });
    }

    await EmployeePayrolls.create(
      {
        organisation_id: organisation.id,
        employee_id: employee.id,
        tax_file_number: payroll.tax_file_number,
        superannuation_fund: payroll.superannuation_fund,
        superannuation_member_number: payroll.superannuation_member_number,
        bank_bsb: payroll.bank_bsb,
        bank_account_number: payroll.bank_account_number,
        bank_account_name: payroll.bank_account_name,
        bank_statement_text: payroll.bank_statement_text,
        created_at: currentUTCTime,
        created_by: user.id,
        updated_at: currentUTCTime,
        updated_by: user.id,
      },
      { transaction },
    );
  } catch (err) {
    console.log("createOrUpdateEmployeePayrollError::", err);
    if (err instanceof AppError) {
      throw err;
    }
    throw new AppError("Unable to create or update employee payroll!", 500);
  }
}

async function inviteEmployee(
  user,
  orgName,
  organisation,
  firstName,
  middleName,
  lastName,
  email,
  dob,
  role,
  employeeUserId,
  employeeId,
  transaction,
) {
  try {
    /* ----------------------------------
     * 2. Generate invitation token
     * ---------------------------------- */
    const invitationToken = generateInvitationToken({
      organisation_name: orgName,
      invited_by: user.full_name,
      employee_first_name: firstName,
      employee_middle_name: middleName,
      employee_last_name: lastName,
      employee_email: email,
      employee_dob: dob,
    });

    /* ----------------------------------
     * 3. Fetch existing invitation
     * ---------------------------------- */
    const invitationResponse = await EmployeeInvitations.findOne(
      {
        where: {
          employee_id: employeeId,
          organisation_id: organisation.id,
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
      },
      { transaction },
    );

    /* ----------------------------------
     * 4. Update or Create Invitation
     * ---------------------------------- */
    if (invitationResponse) {
      const invitation = invitationResponse.toJSON();

      if (["accept", "reject"].includes(invitation?.status?.code)) {
        throw new AppError("Invitation has already been processed!", 409);
      }

      console.log("invitation::", invitation);
      console.log("invitationToken::", invitationToken);

      await EmployeeInvitations.update(
        { invitation_token: invitationToken },
        {
          where: {
            employee_id: employeeId,
            organisation_id: organisation.id,
          },
          transaction,
        },
      );
    } else {
      const invitationStatus = await InvitationStatus.findOne(
        {
          where: { code: "invited" },
          raw: true,
        },
        { transaction },
      );

      if (!invitationStatus) {
        throw new AppError("Invitation status not found!", 500);
      }

      await EmployeeInvitations.create(
        {
          user_id: employeeUserId ?? null,
          employee_id: employeeId,
          organisation_id: organisation.id,
          email: email,
          invitation_token: invitationToken,
          organisation_role_id: role.id ?? null,
          status_id: invitationStatus.id,
          invited_at: moment().utc().toDate(),
          expire_at: null,
        },
        transaction,
      );
    }

    /* ----------------------------------
     * 5. Send Email (if email exists)
     * ---------------------------------- */
    const subject = `${process.env.APP_NAME || "myTask"} · ${orgName} invited you`;

    const message = {
      subject,
      template: "organisation-invitation.html",
      variables: {
        title: subject,
        message: `${user.full_name} invited you to join ${orgName} as ${
          role?.name || "Employee"
        }. Click the button below to accept.`,
        button_url: `${
          process.env.CLIENT_URL
        }org-invitation?token=${encodeURIComponent(invitationToken)}`,
        button_label: "Accept invitation",
      },
    };

    if (email) {
      await enqueueSendEmail({
        user,
        organisation,
        userEmails: [email],
        message,
      });
    }

    /* ----------------------------------
     * 6. Push Notification (if user exists)
     * ---------------------------------- */
    if (employeeUserId) {
      await enqueueSendNotification({
        user: user,
        sentToUserIds: [employeeUserId],
        message: {
          title: subject,
          body: message.variables.message,
        },
      });
    }

    return true;
  } catch (err) {
    console.error("inviteEmployeeError::", err);

    if (err instanceof AppError) {
      throw err;
    }

    throw new AppError("Unable to invite employee!", 500);
  }
}

function generateInvitationToken(invitationData) {
  const token = Buffer.from(JSON.stringify(invitationData)).toString("base64");
  return token;
}

export default {
  createOrUpdateEmployeeDetails,
  createOrUpdateEmployeeManagementGroup,
  createOrUpdateEmployeeWage,
  createOrUpdateEmployeePayroll,
  inviteEmployee,
  generateInvitationToken,
};
