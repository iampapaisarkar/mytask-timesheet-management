import { fn, col, literal, Op } from "sequelize";
import timesheetRateService from "../service/timesheet-rate.service.js";

export async function rateByTimesheetPeriod(req, res) {
  try {
    const { organisation } = req.body;
    const { timesheet_id, timesheet_day_id, employee_id, from, to } = req.query;

    if (!timesheet_id || !employee_id) {
      return res
        .status(400)
        .json({ message: "timesheet_id and employee_id are required" });
    }

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
    return res
      .status(500)
      .json({ message: "Error computing rates", details: err.message });
  }
}
