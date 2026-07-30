import reportAccessService from "../service/report-access.service.js";
import reportQueryService from "../service/report-query.service.js";
import reportRequestService from "../service/report-request.service.js";
import timesheetRateService from "../service/timesheet-rate.service.js";

function deny(res, message = "Access denied.") {
  return res.status(403).json({ message });
}

/** Live day/period rate breakdown (not a saved report). */
export async function rateByTimesheetPeriod(req, res) {
  try {
    const { organisation } = req.body;
    if (!organisation?.acl?.report?.view && !organisation?.acl?.report?.list) {
      return deny(res);
    }

    const { timesheet_id, timesheet_day_id, employee_id, from, to } = req.query;

    if (!timesheet_id || !employee_id) {
      return res
        .status(400)
        .json({ message: "timesheet_id and employee_id are required" });
    }

    await reportAccessService.assertEmployeesInScope(organisation, [
      employee_id,
    ]);

    const result = await timesheetRateService.calculate({
      organisation,
      timesheet_id,
      timesheet_day_id,
      employee_id,
      from,
      to,
    });

    return res.json({ data: result });
  } catch (err) {
    console.error("rateByTimesheetPeriod error", err);
    const status = err.statusCode || 500;
    return res.status(status).json({
      message: err.message || "Error computing rates",
      details: err.message,
    });
  }
}

export async function listReportEmployees(req, res) {
  try {
    const { organisation } = req.body;
    if (!organisation?.acl?.report?.list && !organisation?.acl?.report?.view) {
      return deny(res);
    }
    const employees = await reportAccessService.listVisibleEmployees(
      organisation,
    );
    return res.status(200).json({
      data: employees.map((e) => ({
        id: e.id,
        full_name: e.full_name,
        email: e.email,
        role: e.role,
        preferred_name: e.preferred_name,
        is_you: Boolean(e.is_you),
      })),
    });
  } catch (err) {
    console.error("listReportEmployees error", err);
    return res.status(err.statusCode || 500).json({
      message: err.message || "Unable to list report employees",
    });
  }
}

export async function listReportTimesheets(req, res) {
  try {
    const { organisation } = req.body;
    if (!organisation?.acl?.report?.list && !organisation?.acl?.report?.view) {
      return deny(res);
    }
    const { employee_id, rows_per_page } = req.query;
    if (!employee_id) {
      return res.status(200).json({ data: [] });
    }
    const visibleIds = await reportAccessService.getVisibleEmployeeIds(
      organisation,
    );
    const data = await reportQueryService.listScopedTimesheets({
      organisationId: organisation.id,
      employeeIds: visibleIds,
      employeeId: employee_id,
      limit: rows_per_page,
    });
    return res.status(200).json({ data });
  } catch (err) {
    console.error("listReportTimesheets error", err);
    return res.status(err.statusCode || 500).json({
      message: err.message || "Unable to list report timesheets",
    });
  }
}

export async function createReportRequest(req, res) {
  try {
    const { organisation, user } = req.body;
    const { employee_id, timesheet_id, name, type } = req.body;

    const request = await reportRequestService.createReportRequest({
      organisation,
      user,
      type: type || "approved_timesheet",
      name,
      filters: {
        employee_id,
        timesheet_id,
      },
    });

    return res.status(202).json({
      data: request,
      message: "Report request accepted",
    });
  } catch (err) {
    console.error("createReportRequest error", err);
    return res.status(err.statusCode || 500).json({
      message: err.message || "Unable to create report request",
    });
  }
}

export async function listReportRequests(req, res) {
  try {
    const { organisation, user } = req.body;
    const result = await reportRequestService.listReportRequests({
      organisation,
      user,
      limit: req.query.rows_per_page,
      page: req.query.page_number,
    });
    return res.status(200).json(result);
  } catch (err) {
    console.error("listReportRequests error", err);
    return res.status(err.statusCode || 500).json({
      message: err.message || "Unable to list report requests",
    });
  }
}

export async function getReportRequest(req, res) {
  try {
    const { organisation, user } = req.body;
    const data = await reportRequestService.getReportRequest({
      organisation,
      user,
      id: req.params.id,
    });
    return res.status(200).json({ data });
  } catch (err) {
    console.error("getReportRequest error", err);
    return res.status(err.statusCode || 500).json({
      message: err.message || "Unable to fetch report request",
    });
  }
}

export async function getReportResult(req, res) {
  try {
    const { organisation, user } = req.body;
    const data = await reportRequestService.getReportResult({
      organisation,
      user,
      id: req.params.id,
    });
    return res.status(200).json({ data });
  } catch (err) {
    console.error("getReportResult error", err);
    return res.status(err.statusCode || 500).json({
      message: err.message || "Unable to fetch report result",
    });
  }
}

export async function downloadReportPdf(req, res) {
  try {
    const { organisation, user } = req.body;
    const pdf = await reportRequestService.getReportPdfPath({
      organisation,
      user,
      id: req.params.id,
    });
    res.setHeader("Content-Type", pdf.mime || "application/pdf");
    res.setHeader(
      "Content-Disposition",
      `attachment; filename="${pdf.filename}"`,
    );
    return res.download(pdf.path, pdf.filename);
  } catch (err) {
    console.error("downloadReportPdf error", err);
    return res.status(err.statusCode || 500).json({
      message: err.message || "Unable to download report PDF",
    });
  }
}

export async function emailReportPdf(req, res) {
  try {
    const { organisation, user } = req.body;
    const { email } = req.body;
    const data = await reportRequestService.emailReportPdf({
      organisation,
      user,
      id: req.params.id,
      email,
    });
    return res.status(200).json({
      data,
      message: `Report PDF sent to ${data.emailed_to}`,
    });
  } catch (err) {
    console.error("emailReportPdf error", err);
    return res.status(err.statusCode || 500).json({
      message: err.message || "Unable to email report PDF",
    });
  }
}
