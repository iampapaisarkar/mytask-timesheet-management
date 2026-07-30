import express from "express";
const router = express.Router();
import {
  rateByTimesheetPeriod,
  listReportEmployees,
  listReportTimesheets,
  createReportRequest,
  listReportRequests,
  getReportRequest,
  getReportResult,
  downloadReportPdf,
  emailReportPdf,
} from "../../controller/report.controller.js";

router.get("/rate-by-per-timesheet-day", rateByTimesheetPeriod);
router.get("/employees", listReportEmployees);
router.get("/timesheets", listReportTimesheets);
router.post("/requests", createReportRequest);
router.get("/requests", listReportRequests);
router.get("/requests/:id", getReportRequest);
router.get("/requests/:id/result", getReportResult);
router.get("/requests/:id/pdf", downloadReportPdf);
router.post("/requests/:id/email", emailReportPdf);

export default router;
