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

async function ensureReportPdf(request, payload, { force = false } = {}) {
  if (
    !force &&
    request.artifact_path &&
    fs.existsSync(request.artifact_path)
  ) {
    return request.artifact_path;
  }
  const outputPath = reportPdfStoragePath(
    request.organisation_id,
    request.id,
  );
  await writeReportPdf({
    report: payload,
    outputPath,
    title: request.name || "Timesheet Pay Report",
  });
  await request.update({
    artifact_path: outputPath,
    artifact_mime: "application/pdf",
    updated_at: moment().utc().format(),
  });
  return outputPath;
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
  const summaryHtml = buildReportEmailSummary(result);

  await enqueueSendEmail({
    user,
    organisation,
    userEmails: [to],
    message: {
      subject: `Report: ${title}`,
      template: "timesheet.html",
      variables: {
        title: "Timesheet report",
        message: `${summaryHtml}<br/><br/>A PDF copy of this report is attached.`,
        button_url: `/org/${organisation.code}/reports?request=${id}`,
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

function moneyLabel(amount, currency) {
  const num = Number(amount);
  if (Number.isNaN(num)) return "—";
  const code = String(currency || "AUD").toUpperCase();
  const prefix =
    code === "INR"
      ? "₹INR"
      : code === "GBP"
        ? "£GBP"
        : code === "EUR"
          ? "€EUR"
          : `$${code}`;
  return `${prefix} ${num.toFixed(2)}`;
}

function hoursLabel(hours) {
  const num = Number(hours);
  if (Number.isNaN(num)) return "—";
  const text = Number.isInteger(num)
    ? String(num)
    : String(Number(num.toFixed(2)));
  return `${text}h`;
}

function buildReportEmailSummary(result) {
  if (!result) {
    return "Your timesheet pay report is ready. See the attached PDF for full details.";
  }
  const currency = result.currency || result.pay_cycle?.currency || "AUD";
  const emp = result.employee?.name || "Employee";
  const period = result.timesheet
    ? `${result.timesheet.period_start_date || "?"} → ${result.timesheet.period_end_date || "?"}`
    : "—";
  const days = Array.isArray(result.days) ? result.days : [];
  const rows = days
    .map(
      (d) =>
        `<tr><td style="padding:4px 8px;">${String(d.date || "").slice(0, 10)}</td><td style="padding:4px 8px;">${hoursLabel(d.working_hours)}</td><td style="padding:4px 8px;">${moneyLabel(d.amount, currency)}</td></tr>`,
    )
    .join("");

  return `
    <p><strong>${emp}</strong></p>
    <p>Pay period: ${period}</p>
    <p>Working: ${hoursLabel(result.totals?.working_hours)} · Break: ${hoursLabel(result.totals?.break_hours)} · Travel: ${hoursLabel(result.totals?.travel_hours)}</p>
    <p>Pay cycle total: <strong>${moneyLabel(result.pay_cycle?.total_amount ?? result.totals?.amount, currency)}</strong> · ${result.pay_cycle?.paid_label || "Not paid"}</p>
    ${
      rows
        ? `<table style="border-collapse:collapse;margin-top:8px;"><thead><tr><th align="left" style="padding:4px 8px;">Day</th><th align="left" style="padding:4px 8px;">Work</th><th align="left" style="padding:4px 8px;">Amount</th></tr></thead><tbody>${rows}</tbody></table>`
        : ""
    }
  `;
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
