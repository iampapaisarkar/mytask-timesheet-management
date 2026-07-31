/**
 * Require non-empty trimmed remarks for timesheet status transitions.
 * @returns {string|null} trimmed remarks, or null after sending a 400 response
 */
export function requireTimesheetRemarks(remarks, res) {
  const trimmed = String(remarks ?? "").trim();
  if (!trimmed) {
    res.status(400).json({
      message: "Remarks are required.",
    });
    return null;
  }
  return trimmed;
}
