import { fn, col, literal, Op } from "sequelize";
import models from "../models/index.js";
const { XeroConnections, Organisations, Users } = models;
import moment from "moment";
import { getXero } from "../functions/xero-registry.js";
import axios from "axios";
import redisUtils from "../utils/redis.utils.js";
import organisationService from "../service/organisation.service.js";
import xeroService from "../service/xero.service.js";
import { enqueueAllEarningRateToXero } from "../queue-jobs/push-all-earning-rate.job.js";
import { enqueueAllPayrollCalendarToXero } from "../queue-jobs/push-all-payroll-calendar.job.js";
import { enqueueAllEmployeeToXero } from "../queue-jobs/push-all-employee.job.js";
import { enqueueAllTimesheetToXero } from "../queue-jobs/push-all-timesheet.job.js";

export async function connect(req, res, next) {
  const { user, organisation, challenge } = req.body;
  if (!organisation.acl.xero.create) {
    return res.status(403).json({
      message: "Access denied: You are not authorized to access this action.",
    });
  }
  try {
    const stateData = {
      userId: user.id,
      organisationId: organisation.id,
      organisationCode: organisation.code,
    };
    const state = Buffer.from(JSON.stringify(stateData)).toString("base64");

    const consentUrl =
      `https://login.xero.com/identity/connect/authorize?` +
      `response_type=code&` +
      `client_id=${process.env.XERO_CLIENT_ID}&` +
      `redirect_uri=${process.env.XERO_CALLBACK_URL}&` +
      `scope=${encodeURIComponent(process.env.XERO_SCOPES)}&` +
      `state=${state}&` +
      `code_challenge=${challenge}&` +
      `code_challenge_method=S256`;

    return res.status(200).json({
      data: `${consentUrl}&state=${state}`,
    });
  } catch (err) {
    console.error("Error connecting xero:", err);
    return res.status(500).json({
      message: "Unable to connect xero",
      details: err.message,
    });
  }
}

export async function finalize(req, res, next) {
  const { code, verifier, state } = req.body;
  try {
    const userResponse = await Users.unscoped().findOne({
      where: {
        id: state.userId,
      },
    });

    if (!userResponse) {
      return res.status(500).json({
        message: "User not valid",
      });
    }

    const organisationResponse = await Organisations.unscoped().findOne({
      where: {
        id: state.organisationId,
      },
    });

    if (!organisationResponse) {
      return res.status(500).json({
        message: "Organisation not valid",
      });
    }

    // Using axios for the exchange to show the PKCE structure clearly
    const xeroResponse = await axios.post(
      "https://identity.xero.com/connect/token",
      new URLSearchParams({
        grant_type: "authorization_code",
        client_id: process.env.XERO_CLIENT_ID, // Still needed
        code: code,
        redirect_uri: process.env.XERO_CALLBACK_URL,
        code_verifier: verifier, // This matches the challenge sent in step 1
      }),
      { headers: { "Content-Type": "application/x-www-form-urlencoded" } },
    );

    const tokenSet = xeroResponse.data;

    const xero = getXero();
    await xero.setTokenSet(tokenSet);

    // After this, you can call getTenants
    await xero.updateTenants();
    const activeTenantId = xero.tenants[0].tenantId;
    const connectionId = xero.tenants[0].id;

    const expiresAt = tokenSet.expires_at
      ? moment.unix(tokenSet.expires_at)
      : moment().add(tokenSet.expires_in, "seconds");

    const currentUTCTime = moment().utc().format();

    await XeroConnections.create({
      organisation_id: state.organisationId,
      connection_id: connectionId,
      user_id: state.userId,
      tenant_id: activeTenantId,
      access_token: tokenSet.access_token,
      refresh_token: tokenSet.refresh_token,
      expires_at: expiresAt.toDate(),
      created_at: currentUTCTime,
      created_by: state.userId,
    });

    await redisUtils.deleteMultiKeyCache(
      `organisation:${state.organisationId}:*`,
    );
    await redisUtils.deleteMultiKeyCache(
      `organisation:${state.organisationCode}:*`,
    );

    const response = await organisationService.getOrganisation(
      state.userId,
      state.organisationCode,
    );

    return res.status(200).json({
      message: "Xero connected successfully",
      data: response?.data,
    });
  } catch (err) {
    console.error("Error connecting xero:", err);
    return res.status(500).json({
      message: "Unable to connect xero",
      details: err.message,
    });
  }
}

export async function disconnect(req, res, next) {
  const { user, organisation } = req.body;
  if (!organisation.acl.xero.edit) {
    return res.status(403).json({
      message: "Access denied: You are not authorized to access this action.",
    });
  }
  try {
    const xeroClient = await xeroService.getValidXeroClient(
      user.id,
      organisation.id,
    );

    // 🔥 Disconnect tenant at Xero
    await axios.delete(
      `https://api.xero.com/connections/${organisation.xero_connection.connection_id}`,
      {
        headers: {
          Authorization: `Bearer ${xeroClient._tokenSet.access_token}`,
        },
      },
    );

    await XeroConnections.destroy({
      where: {
        organisation_id: organisation?.id,
      },
    });

    await redisUtils.deleteMultiKeyCache(`organisation:${organisation.id}:*`);
    await redisUtils.deleteMultiKeyCache(`organisation:${organisation.code}:*`);

    const response = await organisationService.getOrganisation(
      user.id,
      organisation.code,
    );

    return res.status(200).json({
      message: "Xero disconnected successfully",
      data: response?.data,
    });
  } catch (err) {
    console.error("Error connecting xero:", err);
    return res.status(500).json({
      message: "Unable to connect xero",
      details: err.message,
    });
  }
}

export async function fetchEarningRates(req, res, next) {
  const { user, organisation } = req.body;
  let { earningType } = req.query;
  if (!organisation.acl.xero.view) {
    return res.status(403).json({
      message: "Access denied: You are not authorized to access this action.",
    });
  }
  try {
    const earningsRates = await xeroService.fetchEarningRates(
      user,
      organisation,
    );

    const filteredEarningsRates = earningsRates
      .filter((item) => item.earningsType === earningType)
      .map((item) => ({
        ...item,
        label: `${item.name} - ${item.rateType}`,
        value: item,
      }));

    return res.status(200).json({
      data: filteredEarningsRates,
    });
  } catch (err) {
    console.error("Error fetching earning rates:", err);
    return res.status(err.statusCode || 500).json({
      message: err.message || "Unable to fetch earning rates",
    });
  }
}

export async function fetchAccounts(req, res, next) {
  const { user, organisation } = req.body;
  let { type } = req.query;
  if (!organisation.acl.xero.view) {
    return res.status(403).json({
      message: "Access denied: You are not authorized to access this action.",
    });
  }
  try {
    const accounts = await xeroService.fetchAccounts(user, organisation, type);

    return res.status(200).json({
      data: accounts,
    });
  } catch (err) {
    console.error("Error fetching accounts:", err);
    return res.status(500).json({
      message: "Unable to fetch accounts",
      details: err.message,
    });
  }
}

export async function fetchPayrollCalendars(req, res, next) {
  const { user, organisation } = req.body;
  if (!organisation.acl.xero.view) {
    return res.status(403).json({
      message: "Access denied: You are not authorized to access this action.",
    });
  }
  if (!organisation?.xero_connection) {
    return res.status(200).json({});
  }
  try {
    const payrollCalendars = await xeroService.fetchPayrollCalendars(
      user,
      organisation,
    );

    return res.status(200).json({
      data: payrollCalendars,
    });
  } catch (err) {
    console.error("Error fetching payroll calendars:", err);
    return res.status(err.statusCode || 500).json({
      message: err.message || "Unable to fetch payroll calendars",
    });
  }
}

export async function pushData(req, res, next) {
  const { user, organisation } = req.body;
  if (!organisation.acl.xero.edit) {
    return res.status(403).json({
      message: "Access denied: You are not authorized to access this action.",
    });
  }
  if (!organisation?.xero_connection) {
    return res.status(501).json({
      message:
        "Your organisation is not currently connected to Xero. Please connect it to continue.",
    });
  }

  if (!organisation?.settings?.default_earning_rate_expense_account) {
    return res.status(501).json({
      message:
        "To push the earning rate to Xero, you must set up a default expense account in the Organisation settings.",
    });
  }
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

  try {
    // Add to queue
    await enqueueAllEarningRateToXero({
      user,
      organisation,
    });

    await enqueueAllPayrollCalendarToXero({
      user,
      organisation,
    });

    await enqueueAllEmployeeToXero({
      user,
      organisation,
    });

    await enqueueAllTimesheetToXero({
      user,
      organisation,
    });

    return res.status(200).json({
      message:
        "Data is being queued for syncing to Xero. You will be notified once the process is complete.",
    });
  } catch (err) {
    console.error("Error push data to xero:", err);
    return res.status(500).json({
      message: "Unable to push data to xero",
      details: err.message,
    });
  }
}

export async function pushTimesheet(req, res, next) {
  const { user, organisation } = req.body;
  if (!organisation.acl.xero.edit) {
    return res.status(403).json({
      message: "Access denied: You are not authorized to access this action.",
    });
  }
  if (!organisation?.xero_connection) {
    return res.status(501).json({
      message:
        "Your organisation is not currently connected to Xero. Please connect it to continue.",
    });
  }

  if (!organisation?.settings?.default_earning_rate_expense_account) {
    return res.status(501).json({
      message:
        "To push the earning rate to Xero, you must set up a default expense account in the Organisation settings.",
    });
  }
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

  try {
    // const xeroTimesheet = await xeroService.pushSystemTimesheetToXero(
    //   user,
    //   organisation,
    //   timesheet,
    //   employeeData
    // );
    // await Timesheets.update(
    //   {
    //     xero_timesheet_id: xeroTimesheet.timesheetID,
    //   },
    //   {
    //     where: { id: timesheet.id, organisation_id: organisation.id },
    //   }
    // );
    return res.status(200).json({
      message: "Timesheet push to Xero successfully.",
    });
  } catch (err) {
    console.error("Error push timesheet to xero:", err);
    return res.status(500).json({
      message: "Unable to push timesheet to xero",
      details: err.message,
    });
  }
}

export async function fetchTestData(req, res, next) {
  const { user, organisation } = req.body;
  if (!organisation.acl.xero.view) {
    return res.status(403).json({
      message: "Access denied: You are not authorized to access this action.",
    });
  }
  try {
    const employees = await xeroService.fetchEmployees(user, organisation);
    const timesheets = await xeroService.fetchTimesheets(user, organisation);
    const payitems = await xeroService.fetchPayrollCalendars(
      user,
      organisation,
    );
    const payrollCalendars = await xeroService.fetchPayrollCalendars(
      user,
      organisation,
    );

    return res.status(200).json({
      data: { employees, timesheets, payitems, payrollCalendars },
    });
  } catch (err) {
    console.error("Error fetching xero test data:", err);
    return res.status(500).json({
      message: "Unable to fetch xero test data",
      details: err.message,
    });
  }
}

// export async function disconnectAll(req, res, next) {
//   const { user, organisation } = req.body;
//   if (!organisation.acl.xero.edit) {
//     return res.status(403).json({
//       message: "Access denied: You are not authorized to access this action.",
//     });
//   }
//   try {
//     // 🔥 Revoke token at Xero
//     await axios.post(
//       "https://identity.xero.com/connect/revocation",
//       new URLSearchParams({
//         token: organisation?.xero_connection?.refresh_token,
//       }).toString(),
//       {
//         headers: {
//           Authorization: `Basic ${Buffer.from(
//             `${process.env.XERO_CLIENT_ID}:${process.env.XERO_CLIENT_SECRET}`
//           ).toString("base64")}`,
//           "Content-Type": "application/x-www-form-urlencoded",
//         },
//       }
//     );

//     await XeroConnections.destroy({
//       where: {
//         organisation_id: organisation?.id,
//       },
//     });

//     await redisUtils.deleteMultiKeyCache(
//       `organisation:${organisation.id}:*`
//     );
//     await redisUtils.deleteMultiKeyCache(
//       `organisation:${organisation.code}:*`
//     );

//     const response = await organisationService.getOrganisation(
//       user.id,
//       organisation.code
//     );

//     return res.status(200).json({
//       message: "Xero disconnected successfully",
//       data: response?.data,
//     });
//   } catch (err) {
//     console.error("Error connecting xero:", err);
//     return res.status(500).json({
//       message: "Unable to connect xero",
//       details: err.message,
//     });
//   }
// }
