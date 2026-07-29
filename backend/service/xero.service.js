import { getXero } from "../functions/xero-registry.js";
import models from "../models/index.js";
const { XeroConnections, PayCycles } = models;
import moment from "moment";
import { v4 as uuidv4 } from "uuid";
import externalApiLogService from "./external-api-log.service.js";

class AppError extends Error {
  constructor(message, statusCode = 400) {
    super(message);
    this.statusCode = statusCode;
    this.isOperational = true;
  }
}

const refreshLocks = new Map();
const getValidXeroClient = async (userId, organisationId) => {
  const xero = getXero();

  const xeroConnection = await XeroConnections.findOne({
    where: { organisation_id: organisationId },
  });

  if (!xeroConnection?.refresh_token) {
    throw new Error("Xero not connected");
  }

  const expiryMoment = moment(xeroConnection.expires_at).utc();
  const now = moment().utc();

  const isExpired = now.clone().add(60, "seconds").isAfter(expiryMoment);

  // ✅ Token still valid → just use it
  if (!isExpired) {
    xero.setTokenSet({
      access_token: xeroConnection.access_token,
      refresh_token: xeroConnection.refresh_token,
      token_type: "Bearer",
    });
    return xero;
  }

  // ✅ If refresh already in progress → wait for it
  if (refreshLocks.has(organisationId)) {
    console.log("Waiting for existing Xero token refresh...");
    await refreshLocks.get(organisationId);

    // Reload updated token
    const updatedConnection = await XeroConnections.findOne({
      where: { organisation_id: organisationId },
    });

    xero.setTokenSet({
      access_token: updatedConnection.access_token,
      refresh_token: updatedConnection.refresh_token,
      token_type: "Bearer",
    });

    return xero;
  }

  // ✅ No refresh in progress → create one
  const refreshPromise = (async () => {
    try {
      console.log("Refreshing Xero token...");

      const newTokenSet = await xero.refreshWithRefreshToken(
        process.env.XERO_CLIENT_ID,
        process.env.XERO_CLIENT_SECRET || "",
        xeroConnection.refresh_token,
      );

      const expiresAt = newTokenSet.expires_at
        ? moment.unix(newTokenSet.expires_at)
        : moment().add(newTokenSet.expires_in, "seconds");

      await XeroConnections.update(
        {
          access_token: newTokenSet.access_token,
          refresh_token: newTokenSet.refresh_token,
          expires_at: expiresAt,
        },
        {
          where: { organisation_id: organisationId },
        },
      );
    } catch (err) {
      if (err.response?.body?.error === "invalid_grant") {
        throw new Error("Xero session fully expired. Please re-authenticate.");
      }
      throw err;
    } finally {
      // ✅ Always release the lock
      refreshLocks.delete(organisationId);
    }
  })();

  refreshLocks.set(organisationId, refreshPromise);
  await refreshPromise;

  // Reload updated token
  const updatedConnection = await XeroConnections.findOne({
    where: { organisation_id: organisationId },
  });

  xero.setTokenSet({
    access_token: updatedConnection.access_token,
    refresh_token: updatedConnection.refresh_token,
    token_type: "Bearer",
  });

  return xero;
};

const fetchEmployees = async (user, organisation) => {
  try {
    const xero = await getValidXeroClient(user.id, organisation.id);

    const response = await xero.payrollAUApi.getEmployees(
      organisation.xero_connection.tenant_id,
    );

    return response.body?.employees || null;
  } catch (err) {
    const errorResponse = JSON.parse(err)?.response;
    const status = errorResponse?.statusCode;
    const body = errorResponse?.body || "";
    if (
      status === 404 &&
      typeof body === "string" &&
      body.includes("Payroll has not been provisioned")
    ) {
      throw new AppError(
        "Payroll is not set up for this Xero organisation. Please enable Payroll in Xero before continuing.",
        400,
      );
    } else {
      const messages = extractAllMessages(errorResponse?.body);
      const message = messagesToHtmlList(messages);
      throw new AppError(message || errorResponse?.body.Message, 400);
    }
    throw err;
  }
};

const fetchEmployeeByEmail = async (user, organisation, email) => {
  try {
    const xero = await getValidXeroClient(user.id, organisation.id);

    const response = await xero.payrollAUApi.getEmployees(
      organisation.xero_connection.tenant_id,
    );

    const existing = response.body?.employees.find((e) => e.email === email);

    if (existing) {
      const employeeResponse = await xero.payrollAUApi.getEmployee(
        organisation.xero_connection.tenant_id,
        existing?.employeeID,
      );
      const employee = employeeResponse.body?.employees[0] || null;

      return employee || null;
    }
    return null;
  } catch (err) {
    const errorResponse = JSON.parse(err)?.response;
    const status = errorResponse?.statusCode;
    const body = errorResponse?.body || "";
    if (
      status === 404 &&
      typeof body === "string" &&
      body.includes("Payroll has not been provisioned")
    ) {
      throw new AppError(
        "Payroll is not set up for this Xero organisation. Please enable Payroll in Xero before continuing.",
        400,
      );
    } else {
      const messages = extractAllMessages(errorResponse?.body);
      const message = messagesToHtmlList(messages);
      throw new AppError(
        message || errorResponse?.body?.Message || errorResponse?.body,
        400,
      );
    }
    throw err;
  }
};

const fetchTimesheets = async (user, organisation) => {
  try {
    const xero = await getValidXeroClient(user.id, organisation.id);

    const response = await xero.payrollAUApi.getTimesheets(
      organisation.xero_connection.tenant_id,
    );

    return response.body?.timesheets || null;
  } catch (err) {
    const errorResponse = JSON.parse(err)?.response;
    const status = errorResponse?.statusCode;
    const body = errorResponse?.body || "";
    if (
      status === 404 &&
      typeof body === "string" &&
      body.includes("Payroll has not been provisioned")
    ) {
      throw new AppError(
        "Payroll is not set up for this Xero organisation. Please enable Payroll in Xero before continuing.",
        400,
      );
    } else {
      const messages = extractAllMessages(errorResponse?.body);
      const message = messagesToHtmlList(messages);
      throw new AppError(message || errorResponse?.body.Message, 400);
    }
  }
};

const fetchPayItems = async (user, organisation) => {
  try {
    const xero = await getValidXeroClient(user.id, organisation.id);

    const where = 'Status=="ACTIVE"';
    const response = await xero.payrollAUApi.getPayItems(
      organisation.xero_connection.tenant_id,
      null,
      where,
    );

    return response.body?.payItems || null;
  } catch (err) {
    const errorResponse = JSON.parse(err)?.response;
    const status = errorResponse?.statusCode;
    const body = errorResponse?.body || "";
    if (
      status === 404 &&
      typeof body === "string" &&
      body.includes("Payroll has not been provisioned")
    ) {
      throw new AppError(
        "Payroll is not set up for this Xero organisation. Please enable Payroll in Xero before continuing.",
        400,
      );
    } else {
      const messages = extractAllMessages(errorResponse?.body);
      const message = messagesToHtmlList(messages);
      throw new AppError(message || errorResponse?.body.Message, 400);
    }
    throw err;
  }
};

const fetchEarningRates = async (user, organisation) => {
  try {
    const xero = await getValidXeroClient(user.id, organisation.id);

    const where = 'Status=="ACTIVE"';
    const response = await xero.payrollAUApi.getPayItems(
      organisation.xero_connection.tenant_id,
      null,
      where,
    );

    return response.body?.payItems?.earningsRates || null;
  } catch (err) {
    const errorResponse = JSON.parse(err)?.response;
    const status = errorResponse?.statusCode;
    const body = errorResponse?.body || "";
    if (
      status === 404 &&
      typeof body === "string" &&
      body.includes("Payroll has not been provisioned")
    ) {
      throw new AppError(
        "Payroll is not set up for this Xero organisation. Please enable Payroll in Xero before continuing.",
        400,
      );
    } else {
      const messages = extractAllMessages(errorResponse?.body);
      const message = messagesToHtmlList(messages);
      throw new AppError(message || errorResponse?.body.Message, 400);
    }
    throw err;
  }
};

const fetchAccounts = async (user, organisation, type = "bank") => {
  try {
    const xero = await getValidXeroClient(user.id, organisation.id);

    const where = `Status=="ACTIVE" AND Type=="${type.toUpperCase()}"`;
    const response = await xero.accountingApi.getAccounts(
      organisation.xero_connection.tenant_id,
      null,
      where,
    );

    return response.body?.accounts || null;
  } catch (err) {
    const errorResponse = JSON.parse(err)?.response;
    const messages = extractAllMessages(errorResponse?.body);
    const message = messagesToHtmlList(messages);
    throw new AppError(message || errorResponse?.body.Message, 400);
  }
};

const fetchPayrollCalendars = async (user, organisation) => {
  try {
    const xero = await getValidXeroClient(user.id, organisation.id);

    const response = await xero.payrollAUApi.getPayrollCalendars(
      organisation.xero_connection.tenant_id,
    );

    return response.body?.payrollCalendars || null;
  } catch (err) {
    const errorResponse = JSON.parse(err)?.response;
    const status = errorResponse?.statusCode;
    const body = errorResponse?.body || "";
    if (
      status === 404 &&
      typeof body === "string" &&
      body.includes("Payroll has not been provisioned")
    ) {
      throw new AppError(
        "Payroll is not set up for this Xero organisation. Please enable Payroll in Xero before continuing.",
        400,
      );
    } else {
      const messages = extractAllMessages(errorResponse?.body);
      const message = messagesToHtmlList(messages);
      throw new AppError(message || errorResponse?.body.Message, 400);
    }
    throw err;
  }
};

const fetchPayrollCalendarById = async (user, organisation, id) => {
  try {
    const xero = await getValidXeroClient(user.id, organisation.id);

    const response = await xero.payrollAUApi.getPayrollCalendars(
      organisation.xero_connection.tenant_id,
    );

    const existing = response.body?.payrollCalendars.find(
      (e) => e.payrollCalendarID === id,
    );

    return existing || null;
  } catch (err) {
    const errorResponse = JSON.parse(err)?.response;
    const status = errorResponse?.statusCode;
    const body = errorResponse?.body || "";
    if (
      status === 404 &&
      typeof body === "string" &&
      body.includes("Payroll has not been provisioned")
    ) {
      throw new AppError(
        "Payroll is not set up for this Xero organisation. Please enable Payroll in Xero before continuing.",
        400,
      );
    } else {
      const messages = extractAllMessages(errorResponse?.body);
      const message = messagesToHtmlList(messages);
      throw new AppError(message || errorResponse?.body.Message, 400);
    }
    throw err;
  }
};

const pushSystemEarningRateToXero = async (
  user,
  organisation,
  systemEarningRate,
) => {
  try {
    const xero = await getValidXeroClient(user.id, organisation.id);

    const where = 'Status=="ACTIVE"';
    const response = await xero.payrollAUApi.getPayItems(
      organisation.xero_connection.tenant_id,
      null,
      where,
    );

    const earningsRates = response.body?.payItems?.earningsRates || [];

    let xeroEarningRate = null;

    if (systemEarningRate?.xero_earning_rate_id) {
      xeroEarningRate = earningsRates.find(
        (item) =>
          item.earningsRateID === systemEarningRate.xero_earning_rate_id,
      );
    }

    // 🔹 Build earning rate payload
    const newEarningRate = {
      earningsRateID: xeroEarningRate?.earningsRateID, // keep ID if updating
      name: systemEarningRate.name,
      multiplier: Number(systemEarningRate.rate) / 100,
      earningsType: "OVERTIMEEARNINGS",
      rateType: "MULTIPLE",
      isExemptFromTax: true,
      isExemptFromSuper: true,
      accountCode:
        organisation?.settings?.default_earning_rate_expense_account?.code ||
        "477",
    };

    const updatedEarningsRates = xeroEarningRate
      ? earningsRates.map((rate) =>
          rate.earningsRateID === xeroEarningRate.earningsRateID
            ? newEarningRate
            : rate,
        )
      : [...earningsRates, newEarningRate];

    const payItem = {
      earningsRates: updatedEarningsRates,
    };

    const idempotencyKey = uuidv4();

    const payItemsResponse = await xero.payrollAUApi.createPayItem(
      organisation.xero_connection.tenant_id,
      payItem,
      idempotencyKey,
    );

    const savedEarningRate =
      payItemsResponse.body?.payItems?.earningsRates.find(
        (rate) =>
          rate.name.toLowerCase() === systemEarningRate.name.toLowerCase() &&
          Number(rate.multiplier) === Number(systemEarningRate.rate) / 100,
      );

    await externalApiLogService.storeExternalApiCallLog(
      user,
      organisation,
      "Xero",
      "https://api.xero.com/payroll.xro/2.0/earningsRates",
      "POST",
      payItem,
      "application/json",
      savedEarningRate,
    );

    return savedEarningRate || null;
  } catch (err) {
    const errorResponse = JSON.parse(err)?.response;
    const messages = extractAllMessages(errorResponse?.body);
    const message = messagesToHtmlList(messages);
    throw new AppError(message || errorResponse?.body.Message, 400);
  }
};

const pushSystemPayrollCalendarToXero = async (
  user,
  organisation,
  systemPayrollCalendar,
  payCycle,
) => {
  try {
    const xero = await getValidXeroClient(user.id, organisation.id);

    const response = await xero.payrollAUApi.getPayrollCalendars(
      organisation.xero_connection.tenant_id,
    );

    const payrollCalendars = response.body?.payrollCalendars || [];

    let xeroPayrollCalendar = null;

    if (systemPayrollCalendar?.xero_payroll_calendar_id) {
      xeroPayrollCalendar = payrollCalendars.find(
        (item) =>
          item.payrollCalendarID ===
          systemPayrollCalendar.xero_payroll_calendar_id,
      );
    }

    // 🔹 Build payroll calendar payload
    let newPayrollCalendar = {
      payrollCalendarID: xeroPayrollCalendar?.payrollCalendarID, // keep ID if updating
      name: systemPayrollCalendar.name,
      startDate: systemPayrollCalendar.start_date,
      paymentDate: systemPayrollCalendar.first_payment_date,
    };

    if (!xeroPayrollCalendar) {
      newPayrollCalendar.calendarType = payCycle?.code;
    }

    const idempotencyKey = uuidv4();

    const payItemsResponse = await xero.payrollAUApi.createPayrollCalendar(
      organisation.xero_connection.tenant_id,
      [newPayrollCalendar],
      idempotencyKey,
    );

    const savedPayrollCalendar = payItemsResponse.body?.payrollCalendars.at(-1);

    await externalApiLogService.storeExternalApiCallLog(
      user,
      organisation,
      "Xero",
      "https://api.xero.com/payroll.xro/1.0/PayrollCalendars",
      "POST",
      newPayrollCalendar,
      "application/json",
      savedPayrollCalendar,
    );

    return savedPayrollCalendar || null;
  } catch (err) {
    const errorResponse = JSON.parse(err)?.response;
    const messages = extractAllMessages(errorResponse?.body);
    const message = messagesToHtmlList(messages);
    throw new AppError(message || errorResponse?.body.Message, 400);
  }
};

const pushSystemEmployeeToXero = async (user, organisation, systemEmployee) => {
  let { details, wage, payroll } = systemEmployee;
  try {
    const xero = await getValidXeroClient(user.id, organisation.id);

    let payRollCalendarId;
    if (!wage.payroll_calendar?.xero_payroll_calendar_id) {
      const payCycle = await PayCycles.findOne({
        where: { id: wage.payroll_calendar?.pay_cycle_id },
      });
      const xeroPayrollCalendar = await pushSystemPayrollCalendarToXero(
        user,
        organisation,
        wage.payroll_calendar,
        payCycle,
      );
      payRollCalendarId = xeroPayrollCalendar?.payrollCalendarID || null;
    } else {
      payRollCalendarId =
        wage.payroll_calendar?.xero_payroll_calendar_id || null;
    }

    const homeAddress = {
      addressLine1: details?.address?.address_1,
      addressLine2: details?.address?.address_2 || null,
      city: details?.address?.city,
      region: details?.address?.state?.code,
      postalCode: details?.address?.postcode,
    };

    let earingRateCalculationType = "ENTEREARNINGSRATE";

    const payTemplate = {
      earningsLines: [
        {
          earningsRateID:
            organisation?.settings?.default_ordinary_hours_earning_rate_type
              ?.earningsRateID,
          calculationType: earingRateCalculationType,
          ratePerUnit: wage?.hourly_rate_exc_super,
        },
      ],
      superLines: [
        {
          // superMembershipID: payroll?.superannuation_member_number,
          contributionType: "SGC",
          calculationType: "FIXEDAMOUNT",
          expenseAccountCode:
            organisation?.settings?.default_superannuation_expense_account
              ?.code,
          liabilityAccountCode:
            organisation?.settings?.default_superannuation_liability_account
              ?.code,
          amount: payroll?.superannuation_fund,
        },
      ],
    };

    const bankAccount = [
      {
        accountName: payroll?.bank_account_name,
        bSB: payroll?.bank_bsb,
        accountNumber: payroll?.bank_account_number,
        statementText: payroll?.bank_statement_text,
        remainder: true,
      },
    ];

    const taxDeclaration = {
      // employeeID: xeroEmployeeId || null,
      employmentBasis: wage?.employment_type?.code,
      // TaxFileNumber: null,
      // TFNExemptionType: null,
      // AustralianResidentForTaxPurposes: null,
      // ResidencyStatus: null,
    };

    const updatedEmployee = [
      {
        employeeID: details?.xero_employee_id ?? null,
        firstName: details?.first_name,
        middleNames: details?.middle_name,
        lastName: details?.last_name,
        title: details?.preferred_name,
        email: details?.email,
        dateOfBirth: details?.dob,
        homeAddress: homeAddress,
        mobile: details?.phone_number,
        phone: details?.phone_number,
        status: wage?.employment_status?.code,
        startDate: wage?.start_date,
        ordinaryEarningsRateID:
          organisation?.settings?.default_ordinary_hours_earning_rate_type
            ?.earningsRateID,
        payrollCalendarID: payRollCalendarId,
        payTemplate: payTemplate,
        bankAccounts: bankAccount,
        taxDeclaration: taxDeclaration,
        employmentType: "EMPLOYEE",
        incomeType: "SALARYANDWAGES",
      },
    ];

    const idempotencyKey = uuidv4();

    let xeroEmployee;
    if (details?.xero_employee_id) {
      const employeeResponse = await xero.payrollAUApi.updateEmployee(
        organisation.xero_connection.tenant_id,
        details?.xero_employee_id,
        updatedEmployee,
        idempotencyKey,
      );
      xeroEmployee = employeeResponse.body?.employees?.[0] || null;
    } else {
      const employeeResponse = await xero.payrollAUApi.createEmployee(
        organisation.xero_connection.tenant_id,
        updatedEmployee,
        idempotencyKey,
      );

      xeroEmployee = employeeResponse.body?.employees?.[0] || null;
    }

    await externalApiLogService.storeExternalApiCallLog(
      user,
      organisation,
      "Xero",
      "https://api.xero.com/payroll.xro/1.0/Employees",
      "POST",
      updatedEmployee,
      "application/json",
      xeroEmployee,
    );

    return xeroEmployee;
  } catch (err) {
    const errorResponse = JSON.parse(err)?.response;
    const messages = extractAllMessages(errorResponse?.body);
    const message = messagesToHtmlList(messages);
    throw new AppError(message || errorResponse?.body.Message, 400);
  }
};

const pushSystemTimesheetToXero = async (
  user,
  organisation,
  systemTimesheet,
  timesheetLines = [],
  employee,
  status = "DRAFT",
) => {
  try {
    const xero = await getValidXeroClient(user.id, organisation.id);

    if (!organisation?.settings?.default_ordinary_hours_earning_rate_type) {
      throw new AppError(
        "To push the employee to Xero, you must set up a default ordinary hours earning rate in the Organisation settings",
        400,
      );
    }

    // Check payroll calendar is pushed to xero or not
    if (!employee?.wage.payroll_calendar?.xero_payroll_calendar_id) {
      const payCycle = await PayCycles.findOne({
        where: { id: wage.payroll_calendar?.pay_cycle_id },
      });
      const xeroPayrollCalendar = await pushSystemPayrollCalendarToXero(
        user,
        organisation,
        wage.payroll_calendar,
        payCycle,
      );
      employee.wage.payroll_calendar.xero_payroll_calendar_id =
        xeroPayrollCalendar?.payrollCalendarID || null;
    }

    // Check employee is pushed to xero or not
    let xeroEmployeeId;
    if (!employee?.details?.xero_employee_id) {
      const xeroEmployee = await pushSystemEmployeeToXero(
        user,
        organisation,
        employee?.details,
        employee?.wage,
        employee?.payroll,
      );
      xeroEmployeeId = xeroEmployee?.employeeID || null;
    } else {
      xeroEmployeeId = employee?.details?.xero_employee_id || null;
    }

    const updatedTimesheets = [
      {
        employeeID: xeroEmployeeId,
        startDate: systemTimesheet.period_start_date,
        endDate: systemTimesheet.period_end_date,
        status: status,
        timesheetLines: timesheetLines,
      },
    ];

    const idempotencyKey = uuidv4();

    let xeroTimesheet;
    if (systemTimesheet.xero_timesheet_id) {
      const timesheetResponse = await xero.payrollAUApi.updateTimesheet(
        organisation.xero_connection.tenant_id,
        systemTimesheet.xero_timesheet_id,
        updatedTimesheets,
        idempotencyKey,
      );
      xeroTimesheet = timesheetResponse.body?.timesheets?.[0] || null;
    } else {
      const timesheetResponse = await xero.payrollAUApi.createTimesheet(
        organisation.xero_connection.tenant_id,
        updatedTimesheets,
        idempotencyKey,
      );

      xeroTimesheet = timesheetResponse.body?.timesheets?.[0] || null;
    }
    await externalApiLogService.storeExternalApiCallLog(
      user,
      organisation,
      "Xero",
      "https://api.xero.com/payroll.xro/1.0/Timesheets",
      "POST",
      updatedTimesheets,
      "application/json",
      xeroTimesheet,
    );
    return xeroTimesheet;
  } catch (err) {
    const errorResponse = JSON.parse(err)?.response;
    const messages = extractAllMessages(errorResponse?.body);
    const message = messagesToHtmlList(messages);
    throw new AppError(message || errorResponse?.body.Message, 400);
  }
};

function extractAllMessages(obj, isRoot = true, messages = []) {
  if (!obj || typeof obj !== "object") return messages;

  if (!isRoot && typeof obj.Message === "string") {
    messages.push(obj.Message);
  }

  Object.values(obj).forEach((value) => {
    if (Array.isArray(value)) {
      value.forEach((item) => extractAllMessages(item, false, messages));
    } else if (typeof value === "object") {
      extractAllMessages(value, false, messages);
    }
  });

  return messages;
}

function messagesToHtmlList(messages) {
  if (!Array.isArray(messages) || messages.length === 0) {
    return "";
  }

  return `
<ul>
  ${messages.map((msg) => `<li>${escapeHtml(msg)}</li>`).join("\n  ")}
</ul>
`.trim();
}

function escapeHtml(str) {
  return String(str)
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&#039;");
}

export default {
  getValidXeroClient,
  fetchEmployees,
  fetchEmployeeByEmail,
  fetchTimesheets,
  fetchPayItems,
  fetchEarningRates,
  fetchAccounts,
  fetchPayrollCalendars,
  fetchPayrollCalendarById,
  pushSystemEarningRateToXero,
  pushSystemPayrollCalendarToXero,
  pushSystemEmployeeToXero,
  pushSystemTimesheetToXero,
};
