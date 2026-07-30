import { fn, col, literal, Op } from "sequelize";
import models from "../models/index.js";
const {
  Users,
  UserOrganisationRoles,
  Employees,
  EmployeeInvitations,
  InvitationStatus,
  EmployeeWages,
  EmployeePayrolls,
  EmployeeAddress,
} = models;
import { enqueueSendEmail } from "../queue-jobs/send-email.job.js";
import { enqueueSendNotification } from "../queue-jobs/send-notification.job.js";
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
    try {
      phoneFields = resolvePhoneFields({
        phone_number: details.phone_number,
        phone_country_code: details.phone_country_code,
        phone_country_iso: details.phone_country_iso,
        required: true,
      });
    } catch (err) {
      throw new AppError(err.message, err.status || 400);
    }
    if (!details.role) {
      throw new AppError("Role is required!", 400);
    }
    if (details.role?.code === "owner") {
      throw new AppError(
        "Organisation Owner cannot be assigned during employee creation.",
        400,
      );
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
    if (!wage.payroll_calendar) {
      throw new AppError("Payroll calendar is required!", 400);
    }
    if (!wage.employment_type) {
      throw new AppError("Employment type is required!", 400);
    }
    if (
      wage.employment_type?.code &&
      String(wage.employment_type.code).toUpperCase() === "CONTRACT"
    ) {
      throw new AppError("Contract employment type is not allowed.", 400);
    }

    const payType = String(wage.pay_type || "").toUpperCase();
    if (payType !== "HOURLY" && payType !== "FIXED") {
      throw new AppError("Pay type must be HOURLY or FIXED.", 400);
    }

    const hourly =
      wage.hourly_rate_exc_super === null ||
      wage.hourly_rate_exc_super === undefined ||
      wage.hourly_rate_exc_super === ""
        ? null
        : Number(wage.hourly_rate_exc_super);
    const fixed =
      wage.fixed_rate_exc_super === null ||
      wage.fixed_rate_exc_super === undefined ||
      wage.fixed_rate_exc_super === ""
        ? null
        : Number(wage.fixed_rate_exc_super);

    if (payType === "HOURLY") {
      if (hourly === null || Number.isNaN(hourly) || hourly <= 0) {
        throw new AppError("Hourly rate is required for HOURLY pay type.", 400);
      }
      if (fixed !== null) {
        throw new AppError(
          "Fixed rate must be empty when pay type is HOURLY.",
          400,
        );
      }
    } else {
      if (fixed === null || Number.isNaN(fixed) || fixed <= 0) {
        throw new AppError(
          "Fixed price rate is required for FIXED pay type.",
          400,
        );
      }
      if (hourly !== null) {
        throw new AppError(
          "Hourly rate must be empty when pay type is FIXED.",
          400,
        );
      }
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

    await EmployeeWages.create(
      {
        organisation_id: organisation.id,
        employee_id: employee.id,
        start_date: moment(wage.start_date, "YYYY-MM-DD"),
        payroll_calendar_id: wage.payroll_calendar?.id,
        employment_type_id: wage.employment_type?.id,
        pay_type: payType,
        hourly_rate_exc_super: payType === "HOURLY" ? hourly : null,
        fixed_rate_exc_super: payType === "FIXED" ? fixed : null,
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
    const method = String(payroll.payment_method || "").toUpperCase();
    const allowed = ["CASH", "DIRECT_DEBIT", "BANK_TRANSFER"];
    if (!allowed.includes(method)) {
      throw new AppError(
        "Payment method must be Cash, Direct Debit, or Bank Transfer.",
        400,
      );
    }

    let accountHolderName = null;
    let bankName = null;
    let bankAccountNumber = null;
    let ifscCode = null;
    let swiftCode = null;

    if (method === "BANK_TRANSFER") {
      accountHolderName = String(payroll.account_holder_name || "").trim();
      bankName = String(payroll.bank_name || "").trim();
      bankAccountNumber = String(payroll.bank_account_number || "").trim();
      ifscCode = String(payroll.ifsc_code || "").trim();
      swiftCode = String(payroll.swift_code || "").trim();

      if (!accountHolderName) {
        throw new AppError("Account holder name is required.", 400);
      }
      if (!bankName) {
        throw new AppError("Bank name is required.", 400);
      }
      if (!bankAccountNumber) {
        throw new AppError("Account number is required.", 400);
      }
      if (!ifscCode) {
        throw new AppError("IFSC code is required.", 400);
      }
      if (!swiftCode) {
        throw new AppError("SWIFT code is required.", 400);
      }
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
        payment_method: method,
        account_holder_name: accountHolderName,
        bank_name: bankName,
        bank_account_number: bankAccountNumber,
        ifsc_code: ifscCode,
        swift_code: swiftCode,
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
  createOrUpdateEmployeeWage,
  createOrUpdateEmployeePayroll,
  inviteEmployee,
  generateInvitationToken,
};
