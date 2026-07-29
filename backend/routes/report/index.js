import express from "express";
const router = express.Router();
import { rateByTimesheetPeriod } from "../../controller/report.controller.js";
import TokenValidate from "../../middleware/tokenvalidate.js";

router.get("/rate-by-per-timesheet-day", rateByTimesheetPeriod);

export default router;
