import fs from "fs";
import path from "path";
import moment from "moment";
import models from "../models/index.js";
import {
  assertEmployeesInScope,
  AppError,
} from "./report-access.service.js";
import {
  buildApprovedTimesheetReport,
  loadApprovedTimesheetForReport,
} from "./report-query.service.js";
import {
  writeReportPdf,
  reportPdfStoragePath,
  REPORT_PDF_VERSION,
} from "./report-pdf.service.js";
import { enqueueGenerateReport } from "../queue-jobs/generate-report.job.js";
import { enqueueSendNotification } from "../queue-jobs/send-notification.job.js";
import { enqueueSendEmail } from "../queue-jobs/send-email.job.js";
import {
  emitReportGenerated,
  emitReportUpdated,
} from "./realtime.service.js";

const { ReportRequests, Organisations, Users, EmployeeWages } = models;

function parseResult(row) {
  if (!row) return null;
  const plain = row.toJSON ? row.toJSON() : { ...row };
  if (plain.result_json && typeof plain.result_json === "string") {
    try {
      plain.result = JSON.parse(plain.result_json);
    } catch {
      plain.result = null;
    }
  } else if (plain.result_json && typeof plain.result_json === "object") {
    plain.result = plain.result_json;
  }
  delete plain.result_json;
  return plain;
}

async function resolveEmployeeCurrency(organisationId, employeeId) {
  if (!organisationId || !employeeId) return null;
  const wage = await EmployeeWages.findOne({
    where: {
      organisation_id: organisationId,
      employee_id: employeeId,
    },
    attributes: ["currency"],
  });
  const code = wage?.currency ? String(wage.currency).toUpperCase() : null;
  return code || null;
}

/** Older report payloads defaulted currency to AUD — correct from employee wage. */
async function withCorrectedCurrency(parsed, organisationId) {
  if (!parsed?.result) return parsed;
  const filters = parseFilters(parsed.filters);
  const employeeId = Number(
    filters.employee_id ||
      filters.employee_ids?.[0] ||
      parsed.result?.employee?.employee_id,
  );
  const wageCurrency = await resolveEmployeeCurrency(
    organisationId,
    employeeId,
  );
  if (!wageCurrency) return parsed;

  const current = String(
    parsed.result.currency || parsed.result.pay_cycle?.currency || "",
  ).toUpperCase();
  if (current === wageCurrency) return parsed;

  parsed.result = {
    ...parsed.result,
    currency: wageCurrency,
    pay_cycle: {
      ...(parsed.result.pay_cycle || {}),
      currency: wageCurrency,
    },
  };
  return parsed;
}

function parseFilters(raw) {
  if (!raw) return {};
  if (typeof raw === "string") {
    try {
      return JSON.parse(raw);
    } catch {
      return {};
    }
  }
  return { ...raw };
}

export async function createReportRequest({
  organisation,
  user,
  filters = {},
  type = "approved_timesheet",
  name,
}) {
  if (!organisation?.acl?.report?.create) {
    throw new AppError("Access denied: cannot create reports.", 403);
  }

  const employeeId = Number(filters.employee_id || filters.employee_ids?.[0]);
  const timesheetId = Number(
    filters.timesheet_id || filters.timesheet_ids?.[0],
  );

  if (!Number.isFinite(employeeId) || employeeId <= 0) {
    throw new AppError("Employee is required.", 400);
  }
  if (!Number.isFinite(timesheetId) || timesheetId <= 0) {
    throw new AppError("Timesheet is required.", 400);
  }

  await assertEmployeesInScope(organisation, [employeeId]);

  const { default: subscriptionService } = await import(
    "./subscription/subscription.service.js"
  );
  const ownerUserId =
    (await subscriptionService.resolveOrgOwnerUserId(organisation.id)) ||
    user.id;
  await subscriptionService.checkGenerateReport(ownerUserId, organisation.id);

  const approved = await loadApprovedTimesheetForReport({
    organisationId: organisation.id,
    employeeId,
    timesheetId,
  });
  if (!approved) {
    throw new AppError(
      "No approved timesheet found for the selected employee. Only approved timesheets can generate a report.",
      400,
    );
  }

  const plain = approved.toJSON ? approved.toJSON() : approved;
  const periodLabel =
    plain.period_range ||
    `${plain.period_start_date || "?"} → ${plain.period_end_date || "?"}`;
  const now = moment().utc().format();
  const reportName = name || `Timesheet report (${periodLabel})`;

  const normalizedFilters = {
    employee_id: employeeId,
    employee_ids: [employeeId],
    timesheet_id: timesheetId,
    timesheet_ids: [timesheetId],
  };

  const request = await ReportRequests.create({
    organisation_id: organisation.id,
    requested_by: user.id,
    type: type || "approved_timesheet",
    status: "pending",
    name: reportName,
    filters: normalizedFilters,
    progress: 0,
    created_at: now,
    updated_at: now,
  });

  await enqueueGenerateReport({
    reportRequestId: request.id,
    organisationId: organisation.id,
    organisationCode: organisation.code,
    requestedBy: user.id,
  });

  try {
    await subscriptionService.recordReportGenerated(
      ownerUserId,
      organisation.id,
    );
  } catch (usageErr) {
    console.error("report usage counter failed:", usageErr?.message || usageErr);
  }

  emitReportUpdated(
    organisation.id,
    {
      id: request.id,
      organisation_id: organisation.id,
      status: "pending",
      name: reportName,
      requested_by: user.id,
    },
    user.id,
  );

  return parseResult(request);
}

export async function listReportRequests({
  organisation,
  user,
  limit = 5,
  page = 1,
}) {
  if (!organisation?.acl?.report?.view && !organisation?.acl?.report?.list) {
    throw new AppError("Access denied.", 403);
  }
  const rowsPerPage = Math.min(Math.max(Number(limit) || 5, 1), 50);
  const pageNumber = Math.max(Number(page) || 1, 1);
  const offset = (pageNumber - 1) * rowsPerPage;

  const where = {
    organisation_id: organisation.id,
    requested_by: user.id,
  };

  const { count, rows } = await ReportRequests.findAndCountAll({
    where,
    order: [["created_at", "DESC"]],
    limit: rowsPerPage,
    offset,
    attributes: {
      exclude: ["result_json"],
    },
  });

  const totalRows = Number(count) || 0;
  const totalPages = Math.max(1, Math.ceil(totalRows / rowsPerPage) || 1);

  return {
    data: rows.map((r) => parseResult(r)),
    pagination: {
      total_rows: totalRows,
      rows_per_page: rowsPerPage,
      page_number: pageNumber,
      total_pages: totalPages,
      has_more: pageNumber * rowsPerPage < totalRows,
    },
  };
}

export async function getReportRequest({ organisation, user, id }) {
  if (!organisation?.acl?.report?.view) {
    throw new AppError("Access denied.", 403);
  }
  const row = await ReportRequests.findOne({
    where: {
      id,
      organisation_id: organisation.id,
      requested_by: user.id,
    },
    attributes: { exclude: ["result_json"] },
  });
  if (!row) throw new AppError("Report request not found.", 404);
  return parseResult(row);
}

export async function getReportResult({ organisation, user, id }) {
  if (!organisation?.acl?.report?.view) {
    throw new AppError("Access denied.", 403);
  }
  const row = await ReportRequests.findOne({
    where: {
      id,
      organisation_id: organisation.id,
      requested_by: user.id,
    },
  });
  if (!row) throw new AppError("Report request not found.", 404);
  if (row.status !== "completed") {
    throw new AppError(
      `Report is not ready (status: ${row.status}).`,
      409,
    );
  }
  return withCorrectedCurrency(parseResult(row), organisation.id);
}

async function ensureReportPdf(request, payload, { force = false, meta = {} } = {}) {
  if (
    !force &&
    request.artifact_path &&
    fs.existsSync(request.artifact_path) &&
    String(request.artifact_path).includes(`-${REPORT_PDF_VERSION}.pdf`)
  ) {
    return request.artifact_path;
  }
  const outputPath = reportPdfStoragePath(
    request.organisation_id,
    request.id,
  );
  const pdfMeta = Object.keys(meta).length
    ? meta
    : await resolveReportPdfMeta(request);
  await writeReportPdf({
    report: payload,
    outputPath,
    title: request.name || "Timesheet Pay Report",
    meta: pdfMeta,
  });
  await request.update({
    artifact_path: outputPath,
    artifact_mime: "application/pdf",
    updated_at: moment().utc().format(),
  });
  return outputPath;
}

async function resolveReportPdfMeta(request) {
  const [organisation, requester] = await Promise.all([
    Organisations.findByPk(request.organisation_id, {
      attributes: ["id", "name", "code"],
    }),
    Users.findByPk(request.requested_by, {
      attributes: ["id", "first_name", "last_name", "middle_name", "email"],
    }),
  ]);
  const userPlain = requester?.toJSON ? requester.toJSON() : requester;
  const generatedBy =
    userPlain?.full_name ||
    [userPlain?.first_name, userPlain?.last_name].filter(Boolean).join(" ") ||
    userPlain?.email ||
    "System";
  return {
    organisationName: organisation?.name || null,
    organisationCode: organisation?.code || null,
    generatedBy,
    generatedByEmail: userPlain?.email || null,
    generatedAt: moment().toISOString(),
  };
}

/**
 * Called by the worker (or sync fallback).
 */
export async function processReportRequest(reportRequestId) {
  const request = await ReportRequests.findByPk(reportRequestId);
  if (!request) return;

  const now = moment().utc().format();
  await request.update({
    status: "processing",
    started_at: request.started_at || now,
    progress: 5,
    updated_at: now,
  });

  try {
    const filters = parseFilters(request.filters);
    const employeeId = Number(filters.employee_id || filters.employee_ids?.[0]);
    const timesheetId = Number(
      filters.timesheet_id || filters.timesheet_ids?.[0],
    );
    if (!employeeId || !timesheetId) {
      throw new Error("Report request requires employee_id and timesheet_id.");
    }

    const payload = await buildApprovedTimesheetReport({
      organisationId: request.organisation_id,
      employeeId,
      timesheetId,
      onProgress: async (progress) => {
        await request.update({
          progress: Math.min(90, progress),
          updated_at: moment().utc().format(),
        });
      },
    });

    const pdfPath = await ensureReportPdf(request, payload);

    await request.update({
      status: "completed",
      progress: 100,
      result_json: JSON.stringify(payload),
      artifact_path: pdfPath,
      artifact_mime: "application/pdf",
      completed_at: moment().utc().format(),
      updated_at: moment().utc().format(),
      error_message: null,
    });

    await notifyReportReady(request);

    emitReportGenerated(
      request.organisation_id,
      {
        id: request.id,
        organisation_id: request.organisation_id,
        status: "completed",
        name: request.name,
        requested_by: request.requested_by,
      },
      request.requested_by,
    );
  } catch (err) {
    console.error("processReportRequest failed", err);
    await request.update({
      status: "failed",
      error_message: err.message || "Report generation failed",
      completed_at: moment().utc().format(),
      updated_at: moment().utc().format(),
    });
    emitReportUpdated(
      request.organisation_id,
      {
        id: request.id,
        organisation_id: request.organisation_id,
        status: "failed",
        name: request.name,
        requested_by: request.requested_by,
      },
      request.requested_by,
    );
    throw err;
  }
}

export async function getReportPdfPath({ organisation, user, id }) {
  if (!organisation?.acl?.report?.view) {
    throw new AppError("Access denied.", 403);
  }
  const row = await ReportRequests.findOne({
    where: {
      id,
      organisation_id: organisation.id,
      requested_by: user.id,
    },
  });
  if (!row) throw new AppError("Report request not found.", 404);
  if (row.status !== "completed") {
    throw new AppError("Report PDF is not ready yet.", 409);
  }

  let payload = null;
  if (row.result_json) {
    try {
      payload =
        typeof row.result_json === "string"
          ? JSON.parse(row.result_json)
          : row.result_json;
    } catch {
      payload = null;
    }
  }
  if (!payload) throw new AppError("Report result missing.", 404);

  const pdfPath = await ensureReportPdf(row, payload);
  if (!fs.existsSync(pdfPath)) {
    throw new AppError("PDF file not found.", 404);
  }
  const request = await withCorrectedCurrency(
    parseResult(row),
    organisation.id,
  );
  // Rebuild PDF if currency was corrected so downloads match the wage currency.
  if (
    request?.result?.currency &&
    payload?.currency !== request.result.currency
  ) {
    const correctedPath = await ensureReportPdf(row, request.result, {
      force: true,
    });
    return {
      path: correctedPath,
      filename: path.basename(correctedPath),
      mime: row.artifact_mime || "application/pdf",
      request,
    };
  }
  return {
    path: pdfPath,
    filename: path.basename(pdfPath),
    mime: row.artifact_mime || "application/pdf",
    request,
  };
}

export async function emailReportPdf({
  organisation,
  user,
  id,
  email,
}) {
  if (!organisation?.acl?.report?.view) {
    throw new AppError("Access denied.", 403);
  }

  const pdf = await getReportPdfPath({ organisation, user, id });
  const to = (email || user.email || "").trim();
  if (!to) {
    throw new AppError("No email address available to send the report.", 400);
  }

  const title = pdf.request?.name || "Timesheet Pay Report";
  const result = pdf.request?.result || null;
  const generatedBy =
    [user.first_name, user.last_name].filter(Boolean).join(" ") ||
    user.full_name ||
    user.email ||
    "User";
  const emailBody = buildReportEmailBody({
    result,
    title,
    generatedBy,
    generatedAt: result?.generated_at || new Date().toISOString(),
  });
  const periodLabel = formatReportPeriod(result);
  const subject = periodLabel
    ? `Timesheet Report - ${periodLabel}`
    : `Timesheet Report - ${title}`;
  const clientBase = String(process.env.CLIENT_URL || "").replace(/\/$/, "");
  const buttonUrl = clientBase
    ? `${clientBase}/org/${organisation.code}/reports?request=${id}`
    : `/org/${organisation.code}/reports?request=${id}`;

  await enqueueSendEmail({
    user,
    organisation,
    userEmails: [to],
    message: {
      subject,
      template: "report.html",
      feature: "Reports",
      variables: {
        title: "Timesheet report ready",
        message: emailBody,
        button_url: buttonUrl,
        button_label: "Open in myTask",
      },
      attachments: [
        {
          filename: pdf.filename,
          path: pdf.path,
          contentType: "application/pdf",
        },
      ],
    },
    immediate: true,
  });

  return { emailed_to: to };
}

function escapeHtml(value) {
  return String(value ?? "")
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;");
}

function formatReportPeriod(result) {
  if (!result?.timesheet) return "";
  const start = result.timesheet.period_start_date;
  const end = result.timesheet.period_end_date;
  if (!start || !end) return "";
  const startM = moment(start);
  const endM = moment(end);
  if (!startM.isValid() || !endM.isValid()) return `${start} - ${end}`;
  if (startM.isSame(endM, "month")) {
    return startM.format("MMMM YYYY");
  }
  return `${startM.format("DD MMM YYYY")} - ${endM.format("DD MMM YYYY")}`;
}

function formatReportPeriodRange(result) {
  if (!result?.timesheet) return "—";
  const start = result.timesheet.period_start_date;
  const end = result.timesheet.period_end_date;
  if (!start || !end) return "—";
  const startM = moment(start);
  const endM = moment(end);
  if (!startM.isValid() || !endM.isValid()) return `${start} - ${end}`;
  return `${startM.format("DD MMM YYYY")} - ${endM.format("DD MMM YYYY")}`;
}

function moneyLabel(amount, currency) {
  const num = Number(amount);
  if (Number.isNaN(num)) return "—";
  const code = String(currency || "AUD").toUpperCase();
  const prefix =
    code === "INR"
      ? "₹"
      : code === "GBP"
        ? "£"
        : code === "EUR"
          ? "€"
          : code === "AUD"
            ? "A$"
            : `$${code} `;
  return `${prefix}${num.toFixed(2)}`;
}

function hoursLabel(hours) {
  const num = Number(hours);
  if (!Number.isFinite(num) || num < 0) return "—";
  const totalMins = Math.round(num * 60);
  const h = Math.floor(totalMins / 60);
  const m = totalMins % 60;
  return `${h}h ${String(m).padStart(2, "0")}m`;
}

function buildReportEmailBody({ result, title, generatedBy, generatedAt }) {
  const reportName = title || "Monthly Timesheet Report";
  const period = formatReportPeriodRange(result);
  const when = moment(generatedAt).isValid()
    ? moment(generatedAt).format("DD MMM YYYY, HH:mm")
    : String(generatedAt || "—");
  const emp = result?.employee?.name || "—";
  const currency = result?.currency || result?.pay_cycle?.currency || "AUD";
  const totals = result?.totals || {};
  const pay = result?.pay_cycle || {};
  const jobs = (result?.timesheet?.jobs || [])
    .map((j) => j.name)
    .filter(Boolean)
    .join(", ");

  return `
    <div style="margin:0 0 12px 0;">Hello,</div>
    <div style="margin:0 0 14px 0;">
      Please find the attached report generated from the Timesheet Management System.
    </div>
    <div style="margin:0 0 8px 0;font-weight:700;color:#0F172A;">Report Details:</div>
    <div style="margin:0 0 4px 0;">• Report Name: ${escapeHtml(reportName)}</div>
    <div style="margin:0 0 4px 0;">• Report Period: ${escapeHtml(period)}</div>
    <div style="margin:0 0 4px 0;">• Employee: ${escapeHtml(emp)}</div>
    ${jobs ? `<div style="margin:0 0 4px 0;">• Jobs: ${escapeHtml(jobs)}</div>` : ""}
    <div style="margin:0 0 4px 0;">• Working hours: ${escapeHtml(hoursLabel(totals.working_hours))}</div>
    <div style="margin:0 0 4px 0;">• Pay total: ${escapeHtml(moneyLabel(pay.total_amount ?? totals.amount, currency))} (${escapeHtml(pay.paid_label || "Not paid")})</div>
    <div style="margin:0 0 4px 0;">• Generated By: ${escapeHtml(generatedBy)}</div>
    <div style="margin:0 0 14px 0;">• Generated On: ${escapeHtml(when)}</div>
    <div style="margin:0 0 14px 0;">
      This report contains employee timesheets, work hours, approval status, customer and job information, along with summary statistics.
    </div>
    <div style="margin:0 0 14px 0;">Please review the attached PDF.</div>
    <div style="margin:0;">Regards,<br/>Timesheet Management System</div>
  `.trim();
}

async function notifyReportReady(request) {
  try {
    const user = await Users.findByPk(request.requested_by);
    const organisation = await Organisations.findByPk(request.organisation_id);
    if (!user || !organisation) return;

    const orgCode = organisation.code;
    const url = `/org/${orgCode}/reports?request=${request.id}`;
    const title = "Report ready";
    const body = `Your report "${request.name || "Timesheet report"}" has been generated successfully.`;

    try {
      await enqueueSendNotification({
        user: user.toJSON ? user.toJSON() : user,
        sentToUserIds: [user.id],
        message: { title, body },
        url,
      });
    } catch (err) {
      console.error("Report notification enqueue failed", err?.message || err);
    }
    // Intentionally no auto-email on generate — user sends via "Email Report".
  } catch (err) {
    console.error("notifyReportReady error", err);
  }
}

export default {
  createReportRequest,
  listReportRequests,
  getReportRequest,
  getReportResult,
  processReportRequest,
  getReportPdfPath,
  emailReportPdf,
  AppError,
};
