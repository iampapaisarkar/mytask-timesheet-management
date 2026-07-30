import systemLogsService from "../service/audit/system-logs.service.js";

function deny(res) {
  return res.status(403).json({
    message: "Access denied: You are not authorized to access this action.",
  });
}

function assertList(organisation, res) {
  if (!organisation?.acl?.systemLog?.list) {
    deny(res);
    return false;
  }
  return true;
}

function assertView(organisation, res) {
  if (!organisation?.acl?.systemLog?.view && !organisation?.acl?.systemLog?.list) {
    deny(res);
    return false;
  }
  return true;
}

export async function listInternal(req, res) {
  const { user, organisation } = req.body;
  if (!assertList(organisation, res)) return;
  try {
    const result = await systemLogsService.listInternalLogs(
      user,
      organisation,
      req.query,
    );
    return res.status(200).json({
      data: result.data,
      pagination: result.pagination,
      message: "Success",
    });
  } catch (err) {
    console.error("systemLogs.listInternal:", err);
    return res.status(500).json({
      message: "Unable to load internal API logs",
      details: err.message,
    });
  }
}

export async function listExternal(req, res) {
  const { user, organisation } = req.body;
  if (!assertList(organisation, res)) return;
  try {
    const result = await systemLogsService.listExternalLogs(
      user,
      organisation,
      req.query,
    );
    return res.status(200).json({
      data: result.data,
      pagination: result.pagination,
      message: "Success",
    });
  } catch (err) {
    console.error("systemLogs.listExternal:", err);
    return res.status(500).json({
      message: "Unable to load external API logs",
      details: err.message,
    });
  }
}

export async function listEmail(req, res) {
  const { user, organisation } = req.body;
  if (!assertList(organisation, res)) return;
  try {
    const result = await systemLogsService.listEmailLogs(
      user,
      organisation,
      req.query,
    );
    return res.status(200).json({
      data: result.data,
      pagination: result.pagination,
      message: "Success",
    });
  } catch (err) {
    console.error("systemLogs.listEmail:", err);
    return res.status(500).json({
      message: "Unable to load email logs",
      details: err.message,
    });
  }
}

export async function summary(req, res) {
  const { user, organisation } = req.body;
  if (!assertList(organisation, res)) return;
  try {
    const result = await systemLogsService.getAuditSummary(
      user,
      organisation,
      req.query,
    );
    return res.status(200).json({ data: result.data, message: "Success" });
  } catch (err) {
    console.error("systemLogs.summary:", err);
    return res.status(500).json({
      message: "Unable to load system logs summary",
      details: err.message,
    });
  }
}

export async function getDetail(req, res) {
  const { user, organisation } = req.body;
  if (!assertView(organisation, res)) return;
  const type = String(req.params.type || "internal");
  const id = req.params.id;
  if (!["internal", "external", "email"].includes(type)) {
    return res.status(400).json({ message: "Invalid log type" });
  }
  try {
    const row = await systemLogsService.getLogDetail(
      type,
      id,
      organisation,
      user,
    );
    if (!row) {
      return res.status(404).json({ message: "Log not found" });
    }
    return res.status(200).json({ data: row, message: "Success" });
  } catch (err) {
    console.error("systemLogs.getDetail:", err);
    return res.status(500).json({
      message: "Unable to load log detail",
      details: err.message,
    });
  }
}

export async function exportCsv(req, res) {
  const { user, organisation } = req.body;
  if (!assertList(organisation, res)) return;
  const type = String(req.query.type || "internal");
  try {
    let result;
    if (type === "external") {
      result = await systemLogsService.listExternalLogs(user, organisation, {
        ...req.query,
        rows_per_page: 1000,
        page_number: 1,
      });
    } else if (type === "email") {
      result = await systemLogsService.listEmailLogs(user, organisation, {
        ...req.query,
        rows_per_page: 1000,
        page_number: 1,
      });
    } else {
      result = await systemLogsService.listInternalLogs(user, organisation, {
        ...req.query,
        rows_per_page: 1000,
        page_number: 1,
      });
    }

    const rows = result.data || [];
    if (!rows.length) {
      res.setHeader("Content-Type", "text/csv");
      return res.status(200).send("id\n");
    }
    const headers = Object.keys(rows[0]);
    const escape = (v) => {
      if (v == null) return "";
      const s = typeof v === "object" ? JSON.stringify(v) : String(v);
      return `"${s.replace(/"/g, '""')}"`;
    };
    const lines = [
      headers.join(","),
      ...rows.map((row) => headers.map((h) => escape(row[h])).join(",")),
    ];
    res.setHeader("Content-Type", "text/csv; charset=utf-8");
    res.setHeader(
      "Content-Disposition",
      `attachment; filename="system-logs-${type}.csv"`,
    );
    return res.status(200).send(lines.join("\n"));
  } catch (err) {
    console.error("systemLogs.exportCsv:", err);
    return res.status(500).json({
      message: "Unable to export system logs",
      details: err.message,
    });
  }
}
