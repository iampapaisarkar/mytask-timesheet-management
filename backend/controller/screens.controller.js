import screensService from "../service/screens.service.js";
import dashboardService from "../service/dashboard.service.js";

function assertDashboardAccess(organisation, res) {
  const canManage = organisation?.acl?.timesheetManagement?.list;
  const canSelf = organisation?.acl?.timesheet?.list;
  if (!canManage && !canSelf) {
    res.status(403).json({
      message: "Access denied: You are not authorized to access this action.",
    });
    return false;
  }
  return true;
}

async function runDashboardSlice(req, res, loader, errorLabel) {
  const { user, organisation } = req.body;
  if (!assertDashboardAccess(organisation, res)) return;
  try {
    const result = await loader(user, organisation);
    if (!result.success) {
      return res.status(result.code || 400).json({ message: result.message });
    }
    return res.status(200).json({ data: result.data, message: "Success" });
  } catch (err) {
    console.error(`${errorLabel}:`, err);
    return res.status(500).json({
      message: `Unable to load ${errorLabel}`,
      details: err.message,
    });
  }
}

export async function orgBootstrap(req, res) {
  const { user } = req.body;
  const orgCode =
    req.query.org_code || req.body.orgCode || req.headers["ms-organisation-code"];

  try {
    const result = await screensService.getOrgBootstrap(user, orgCode);
    if (!result.success) {
      return res.status(result.code || 400).json({ message: result.message });
    }
    return res.status(200).json({ data: result.data });
  } catch (err) {
    console.error("orgBootstrap:", err);
    return res.status(500).json({
      message: "Unable to load organisation bootstrap",
      details: err.message,
    });
  }
}

export async function homeBootstrap(req, res) {
  const { user } = req.body;
  try {
    const result = await screensService.getHomeBootstrap(user);
    if (!result.success) {
      return res.status(result.code || 400).json({ message: result.message });
    }
    return res.status(200).json({ data: result.data });
  } catch (err) {
    console.error("homeBootstrap:", err);
    return res.status(500).json({
      message: "Unable to load home bootstrap",
      details: err.message,
    });
  }
}

export async function employeeForm(req, res) {
  const { organisation } = req.body;
  if (!organisation?.acl?.employee?.create && !organisation?.acl?.employee?.edit) {
    return res.status(403).json({
      message: "Access denied: You are not authorized to access this action.",
    });
  }
  try {
    const result = await screensService.getEmployeeFormLookups(organisation);
    if (!result.success) {
      return res.status(result.code || 400).json({ message: result.message });
    }
    return res.status(200).json({ data: result.data });
  } catch (err) {
    console.error("employeeForm:", err);
    return res.status(500).json({
      message: "Unable to load employee form lookups",
      details: err.message,
    });
  }
}

export async function timesheetDayEditor(req, res) {
  const { user, organisation } = req.body;
  const {
    mode = "self",
    timesheet_day_id,
    employee_id,
  } = req.query;

  if (!timesheet_day_id) {
    return res.status(400).json({ message: "timesheet_day_id is required" });
  }

  try {
    const result = await screensService.getTimesheetDayEditor(
      user,
      organisation,
      {
        mode,
        timesheet_day_id,
        employee_id,
      },
    );
    if (!result.success) {
      return res.status(result.code || 400).json({ message: result.message });
    }
    return res.status(200).json({ data: result.data });
  } catch (err) {
    console.error("timesheetDayEditor:", err);
    return res.status(500).json({
      message: "Unable to load timesheet day editor",
      details: err.message,
    });
  }
}

/** Aggregate dashboard — backward compatible. Prefer split slice routes. */
export async function dashboard(req, res) {
  return runDashboardSlice(
    req,
    res,
    dashboardService.getDashboardOverview,
    "dashboard",
  );
}

export async function dashboardSummary(req, res) {
  return runDashboardSlice(
    req,
    res,
    dashboardService.getDashboardSummary,
    "dashboard summary",
  );
}

export async function dashboardGraphs(req, res) {
  return runDashboardSlice(
    req,
    res,
    dashboardService.getDashboardGraphs,
    "dashboard graphs",
  );
}

export async function dashboardRecent(req, res) {
  return runDashboardSlice(
    req,
    res,
    dashboardService.getDashboardRecent,
    "dashboard recent",
  );
}

export async function dashboardPending(req, res) {
  return runDashboardSlice(
    req,
    res,
    dashboardService.getDashboardPending,
    "dashboard pending",
  );
}
